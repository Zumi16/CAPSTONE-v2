# Database Migrations for Feedback System

This directory contains all database migration scripts for the new general feedback system.

## Overview

The feedback system has been updated from a transaction-based system to a general feedback system that allows:
- Students and visitors to submit feedback anonymously or with their name
- No requirement for transaction IDs
- Role-based access control (Super Admin only can see identities)

## Migration Files

### `000_complete_feedback_setup.sql` ⭐ RECOMMENDED
**Use this for quick setup - runs everything in one transaction**

This is the all-in-one migration script that includes:
- Add new columns (`submitter_name`, `submitter_email`, `submitter_phone`)
- Remove old constraints (`chk_feedback_user_data`, `chk_visitor_feedback`)
- Make old columns nullable
- Create performance indexes

**Size**: ~80 lines
**Run time**: <1 second

---

### `001_add_feedback_columns.sql`
**Optional: Run this first if doing step-by-step migration**

Adds the new identity columns:
- `submitter_name` VARCHAR(255)
- `submitter_email` VARCHAR(255)
- `submitter_phone` VARCHAR(20)

Also creates performance indexes.

---

### `002_update_constraints.sql`
**Optional: Run this second if doing step-by-step migration**

Removes old constraints and makes columns flexible:
- Drops `chk_feedback_user_data`
- Drops `chk_visitor_feedback`
- Makes `transaction_id`, `student_number`, `visitor_name`, `visit_date` nullable

---

## How to Run

Before running any command below, export your local Postgres password from
`backend/.env` into your shell (values there are gitignored per-device
secrets, so this isn't hardcoded here):
```bash
export PG_PASSWORD=$(grep PG_PASSWORD backend/.env | cut -d '=' -f2)
```

### ✅ Quick Setup (Recommended)

**Step 1: Open Git Bash in the project root**
```bash
cd C:/Users/YourName/OneDrive\ -\ Polytechnic\ University\ of\ the\ Philippines/Desktop/CAPSTONE-v2
```

**Step 2: Run the migration**
```bash
PGPASSWORD=$PG_PASSWORD psql -h localhost -U postgres -d capstone_db -f backend/migrations/000_complete_feedback_setup.sql
```

**Expected output:**
```
BEGIN
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMIT
        result
-----------
 ✅ Migration completed successfully!
(1 row)
```

---

### Step-by-Step Setup (If preferred)

**Step 1: Add columns**
```bash
PGPASSWORD=$PG_PASSWORD psql -h localhost -U postgres -d capstone_db -f backend/migrations/001_add_feedback_columns.sql
```

**Step 2: Update constraints**
```bash
PGPASSWORD=$PG_PASSWORD psql -h localhost -U postgres -d capstone_db -f backend/migrations/002_update_constraints.sql
```

---

### Alternative: Direct SQL (No file needed)

If you prefer to run SQL directly without files:

```bash
PGPASSWORD=$PG_PASSWORD psql -h localhost -U postgres -d capstone_db << 'EOF'
BEGIN TRANSACTION;

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(20);

ALTER TABLE feedback DROP CONSTRAINT IF EXISTS chk_feedback_user_data;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS chk_visitor_feedback;

ALTER TABLE feedback ALTER COLUMN transaction_id DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN student_number DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN visitor_name DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN visit_date DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_anonymous ON feedback(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON feedback(user_type);
CREATE INDEX IF NOT EXISTS idx_feedback_department ON feedback(department_id);

COMMIT;

SELECT 'Migration completed!' as result;
EOF
```

---

## Verification

After running the migration, verify it was successful:

```bash
PGPASSWORD=$PG_PASSWORD psql -h localhost -U postgres -d capstone_db << 'EOF'
-- Check if new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'feedback' 
AND column_name IN ('submitter_name', 'submitter_email', 'submitter_phone');

-- Should return 3 rows:
-- submitter_name
-- submitter_email
-- submitter_phone
EOF
```

---

## Database Credentials

Used in migration scripts:
- **Host**: localhost
- **User**: postgres
- **Password**: see `backend/.env` (`PG_PASSWORD`)
- **Database**: capstone_db
- **Port**: 5432

---

## What Changed in the Database

### New Columns Added
```
Column Name        | Type          | Nullable
submitter_name     | VARCHAR(255)  | YES
submitter_email    | VARCHAR(255)  | YES
submitter_phone    | VARCHAR(20)   | YES
```

### Old Columns Made Flexible
```
Column Name      | Old Nullable | New Nullable
transaction_id   | NO           | YES
student_number   | NO           | YES
visitor_name     | NO           | YES
visit_date       | NO           | YES
```

### Constraints Removed
- ❌ `chk_feedback_user_data` (required transaction_id + student_number for students)
- ❌ `chk_visitor_feedback` (required visitor_name for visitors)

### Indexes Added
- ✅ `idx_feedback_anonymous` (on is_anonymous column)
- ✅ `idx_feedback_user_type` (on user_type column)
- ✅ `idx_feedback_department` (on department_id column)

---

## Troubleshooting

### Error: "password authentication failed"
**Solution**: Check if password is correct. Update `PGPASSWORD` in the command.

### Error: "connection refused"
**Solution**: Make sure PostgreSQL is running and listening on localhost:5432

### Error: "database does not exist"
**Solution**: Change `capstone_db` to your actual database name

### Error: "relation feedback does not exist"
**Solution**: The feedback table might be named differently. Check with:
```bash
PGPASSWORD=$PG_PASSWORD psql -h localhost -U postgres -d capstone_db -c "\dt"
```

### Want to undo the migration?
Unfortunately, SQL migrations cannot be easily undone. If you need to revert:
1. Restore from a database backup
2. Or manually undo the changes (requires database knowledge)

**Best practice**: Always backup before running migrations!

---

## Next Steps After Migration

1. **Restart the backend server**:
   ```bash
   npm start
   # or
   node server.js
   ```

2. **Test the feedback form**:
   - Open feedback page in browser
   - Submit feedback with name option
   - Submit feedback anonymously
   - Both should work without 500 errors

3. **Check the feedback dashboard**:
   - Admin should be able to view feedback
   - Super Admin should see identities
   - Department staff should not see email/phone

---

## Documentation

For complete documentation on the feedback system changes:
- See `BACKEND_MIGRATION_GUIDE.md` for backend code changes
- See `FEEDBACK_SYSTEM_REVISIONS.md` for feature documentation
- See `CHANGES_SUMMARY.md` for quick reference

