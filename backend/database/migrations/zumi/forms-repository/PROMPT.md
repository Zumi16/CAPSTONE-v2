# DB migration prompt — decouple postings from the forms repository,
# and add a description field to downloadable forms

Send this file together with its three siblings in this same folder:
- `005_decouple_forms_repository.sql`
- `006_relocate_legacy_attachments.js`
- `007_add_file_description.sql`

`backend/database/` is excluded by this repo's `.gitignore` (a bare `database`
rule), so these four files will **not** arrive via `git pull` — copy the
whole `backend/database/migrations/` folder over manually (zip, USB, cloud
drive, etc.) alongside pulling the updated code, then paste the prompt below
into Claude Code on the other device. See `../../RULES.md` for the full
convention this migrations folder follows.

---

## Prompt to paste into Claude Code

I've pulled updated backend code that decouples the OJT, NSTP, and Research & Extension posting features from the "forms repository" feature, which is being repurposed into a public "Downloadable Forms" page, and also adds a description field to each downloadable form. I've copied over three migration files that need to run against this device's `capstone_db` before the backend will work correctly. I placed them at:

- `backend/database/migrations/zumi/forms-repository/005_decouple_forms_repository.sql`
- `backend/database/migrations/zumi/forms-repository/006_relocate_legacy_attachments.js`
- `backend/database/migrations/zumi/forms-repository/007_add_file_description.sql`

**Background — what changed and why:**

Previously, when an admin created an OJT/NSTP/Research & Extension post with attachments, those files were saved into the shared `forms_repository_files` table (auto-creating folders named "OJT"/"NSTP"/"Research & Extension" in `forms_repository_folders`), and each post's junction table (`ojt_post_files` / `nstp_post_files` / `researchextension_post_files`) just held a `file_id` pointing at that shared row. Physical files landed in `backend/public/uploads/forms_repository/`.

The updated code removes this coupling entirely:
- Post attachments now store their own `file_name` / `file_path` / `file_type` / `file_size` directly on the junction table row — no more shared `file_id` link.
- New post attachments are written to `backend/public/uploads/posts/` instead of `forms_repository/`.
- The forms repository becomes a separate, admin-managed store for public downloadable forms only, with exactly three fixed category folders: **"OJT Forms"**, **"Proposal Forms"**, **"Other Student Forms"**.
- A new public endpoint `GET /api/forms/public` lists all downloadable forms + folders for the public-facing page.
- adminAve can now upload directly into those three category folders (a new "Upload Form" button in the Forms Repository page), and can rename a file / edit a free-text "description" (what the form is for) via a new "Rename / Edit Details" action. Both the upload and the description are stored via `POST /api/forms/files` and `PUT /api/forms/files/:id`, and the description shows up on the public Downloadable Forms page under the file name.

**Step 1 — schema migration + data preservation.** Run:
```
psql -U postgres -h localhost -d capstone_db -f backend/database/migrations/zumi/forms-repository/005_decouple_forms_repository.sql
```
(adjust `-U`/`-h`/`-d` if this device's Postgres connection differs from `postgres`/`localhost`/`capstone_db` — check the `Pool` config at the top of `backend/routes/ojtRoute.js` for the values this codebase expects).

This script is wrapped in a single transaction and:
1. Adds `file_name`/`file_path`/`file_type`/`file_size` columns to the three junction tables (`ojt_post_files`, `nstp_post_files`, `researchextension_post_files`) and drops `file_id`'s `NOT NULL`.
2. **Copies** each existing attachment's metadata from `forms_repository_files` onto its own junction row — this is what preserves existing posts' images. Do not skip or treat as safe to wipe.
3. Sets `file_id = NULL` on all junction rows to detach them from the shared table. This step matters: the old FK was `ON DELETE CASCADE`, so without detaching first, step 4's folder reset would cascade-delete these rows too.
4. Deletes the `adminave` rows in `forms_repository_folders` (cascades to delete only the leftover post-image rows still in the shared `forms_repository_files` table) and inserts the three new category folders.

Before running it, check this device's current state and report the numbers back to me:
- Row counts for `ojt_posts`, `nstp_posts`, `researchextension_posts` and their `*_post_files` tables.
- Current rows in `forms_repository_folders` for `adminid = 'adminave'`.

If those folders already read "OJT Forms" / "Proposal Forms" / "Other Student Forms" (not "OJT" / "NSTP" / "Research & Extension"), the migration has already been applied here — stop and tell me, don't re-run it.

**Step 2 — physically relocate legacy attachment files.** Run:
```
cd backend
node database/migrations/zumi/forms-repository/006_relocate_legacy_attachments.js
```
This is a generic, safe-to-re-run script (unlike a one-off manual move) that:
- Finds every row across the three junction tables whose `file_path` still starts with `/uploads/forms_repository/`.
- For each, if the physical file exists on disk, moves it to `backend/public/uploads/posts/` and updates that row's `file_path` to match.
- If the physical file is missing on disk (can happen with stale/orphaned rows from earlier testing), it logs a warning and leaves that row untouched rather than guessing — report any "MISSING on disk" lines back to me, since those posts will show broken images regardless of anything this migration does.

Run this only after Step 1 completes successfully — it operates on the columns Step 1 creates.

**Step 3 — add the form description column.** Run:
```
psql -U postgres -h localhost -d capstone_db -f backend/database/migrations/zumi/forms-repository/007_add_file_description.sql
```
This is a single `ALTER TABLE forms_repository_files ADD COLUMN IF NOT EXISTS description TEXT;` — safe to re-run, order relative to Steps 1–2 doesn't matter.

**Step 4 — verify.**
- Confirm `forms_repository_folders` shows exactly the 3 new category folders for `adminid = 'adminave'`.
- Spot-check a few rows in each `*_post_files` table: `file_id` should be `NULL`, `file_name`/`file_path` should be populated, and `file_path` should start with `/uploads/posts/` (except any rows the script logged as missing).
- Confirm `forms_repository_files` has a `description` column (`\d forms_repository_files`) and its row count reflects only genuine downloadable-forms uploads (should be at or near 0 if the admin hasn't uploaded real forms yet on this device).
- Report before/after counts so I can confirm nothing was lost.

**Step 5 — restart.** Restart this device's backend server (`node server.js` — there's no auto-reload configured) so it picks up the updated route files.

One more thing to check separately: the physical upload files under `backend/public/uploads/` (e.g. `forms_repository/`, `faculty/`, `fileRepository/`) are tracked in git normally and should have come across via the regular code pull — but `backend/database/` is gitignored on this repo, which is why these migration files had to be copied manually rather than pulled. Just confirm the `backend/public/uploads/` folder actually has the expected image files on disk after your pull (git-tracked binary files sometimes get missed if the pull was partial).
