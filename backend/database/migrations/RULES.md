# Migration Folder Rules

Both contributors (and their AI assistants) must follow this exactly when
making any database change. Read this before creating, moving, or renaming
anything in this folder.

If you're an AI assistant reading this on someone's behalf: the top-level
folders are named after each person (`kisses`, `zumi`), not usernames or
emails. If it's not obvious which one is the current user from context, ask
them — never guess, and never write into the other person's folder.

## Why this folder is organized this way

`backend/database/` is excluded by this repo's `.gitignore` (a bare `database`
rule) — intentional, since these scripts embed local Postgres credentials.
That means **nothing under here ever arrives via `git pull`**. Every file has
to be handed over manually (zip, USB, cloud drive, chat attachment) alongside
the regular code pull, and the person who wrote the migration has to tell the
other person's AI assistant what to run and why. This folder's structure and
naming exist to make that handoff mechanical instead of a guessing game.

## Structure

```
backend/database/migrations/
├── RULES.md              <- this file
├── kisses/                <- one person's migrations
│   ├── <feature>/          <- one subfolder per feature/module
│   │   ├── NNN_description.sql
│   │   └── README.md or PROMPT.md
│   └── ...
└── zumi/                  <- the other person's migrations
    ├── <feature>/
    │   ├── NNN_description.sql
    │   └── ...
    └── ...
```

- **One top-level folder per person**, named after them (`kisses`, `zumi`).
  Never put a migration in the other person's folder, even to "help" —
  authorship of the folder tells you whose local database state it assumes.
- **One subfolder per feature/module** inside each person's folder (e.g.
  `feedback`, `certificate`, `internship`, `forms-repository`,
  `alumni-employment`). If a change doesn't fit an existing feature folder,
  make a new one named after the feature, not the date or the person.

## Naming convention

- Files are named `NNN_description.sql` (or `.js` for one-off Node scripts
  like data-relocation tasks) — a 3-digit zero-padded sequence number,
  underscore, then a short snake_case description. Example:
  `005_decouple_forms_repository.sql`.
- **The sequence number is per-person, not global.** Continue from your own
  last number regardless of what number is highest in the other person's
  folder — `kisses/` and `zumi/` each keep their own counter. Check every
  subfolder under your own person-folder to find your current highest
  number before picking the next one; don't restart at 000 in a new feature
  subfolder.
- Never reuse, renumber, or delete a past number, even if that migration
  is superseded later — add a new numbered file instead and note in it that
  it supersedes the old one.

## Every migration must

1. **Be idempotent / safe to re-run.** Use `ADD COLUMN IF NOT EXISTS`,
   `CREATE TABLE IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, `CREATE INDEX
   IF NOT EXISTS`, `ON CONFLICT ... DO NOTHING`, etc. Running it twice by
   accident must never error or duplicate data.
2. **Wrap multi-statement changes in `BEGIN` / `COMMIT`** so a failure partway
   through doesn't leave the schema half-migrated.
3. **Reference the real schema**, not a guess or a template from another
   project. Before writing a foreign key or column type, check how the same
   pattern is already done elsewhere in `backend/database/*.sql` (e.g. admin
   ownership columns are `adminid VARCHAR(50) REFERENCES
   admin_accounts(adminid)` — there is no `users` table in this project).
4. **Include a header comment** stating what changed, why, and the exact
   `psql -f backend/database/migrations/<person>/<feature>/NNN_....sql`
   command to run it — copy-pasteable, not paraphrased.
5. **Come with a doc** in the same feature subfolder: either a `README.md`
   (for the feature's ongoing/reference documentation) or a `PROMPT.md` (for
   a one-time cross-device handoff prompt, see
   `zumi/forms-repository/PROMPT.md` for the format) — enough for the other
   person's AI assistant to run it correctly without asking you what a step
   means.

## When you hand a migration to the other person

1. Copy the new file(s) into their copy of this repo at the exact same
   relative path under `backend/database/migrations/<your-person-folder>/`.
2. Send them the accompanying `PROMPT.md` (or equivalent) to paste into their
   AI assistant — it should name the exact file paths, what changed, why, the
   exact commands, and how to verify it worked.
3. They (or their assistant) should apply the migration against their local
   `capstone_db`, confirm the columns/tables/constraints match what the new
   backend code expects (`\d <table>` in `psql`), and restart the backend.

## Current state (update this every time you add a migration or a new feature folder)

- `kisses/feedback/` — last used: `002` (plus `000` and an alternate `001`,
  see its README)
- `kisses/certificate/` — last used: `003`
- `kisses/internship/` — last used: `004`
- `kisses/career-ojt/` — docs only, no migration file
- `zumi/forms-repository/` — last used: `007`
- `zumi/alumni-employment/` — last used: `008`
