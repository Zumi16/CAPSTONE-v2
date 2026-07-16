# Certificate Request Revisions

**Date:** 2026-07-05

Adds control numbers, a purpose field, downloadable certificate file paths,
and email-tracking columns to `certificate_requests`, plus a
`certificate_purposes` reference table.

## Migration

### `003_certificate_revisions.sql`

Run:
```bash
psql -U postgres -h localhost -d capstone_db -f backend/database/migrations/kisses/certificate/003_certificate_revisions.sql
```

Safe to re-run — uses `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT
EXISTS`, and `ON CONFLICT ... DO NOTHING`.

### What it does

- Adds to `certificate_requests`: `control_number` (unique),
  `certificate_purpose`, `certificate_file_path`, `email_sent`,
  `email_sent_at`.
- Creates `certificate_purposes` (reference table) and seeds it with:
  `scholarship`, `employment`, `legal`, `government`, `personal`, `other`.
- Adds indexes on `control_number`, `certificate_purpose`, `email_sent`.

### Depends on

`backend/services/certificateGenerator.js` (PDF + QR generation) and
`backend/services/emailService.js` (notification emails) — both require the
`nodemailer`, `pdfkit`, and `qrcode` npm packages in `backend/package.json`.
