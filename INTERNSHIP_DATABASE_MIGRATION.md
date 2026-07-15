# Internship System - Database Migration Guide

**Status:** Database tables need to be created for Internship system (separate from OJT)

---

## Overview

The Internship system requires the following database tables to function properly. These tables follow the same structure as the OJT system but are completely separate.

---

## Database Tables

### 1. `internship_posts` Table

Stores all internship announcements and updates posted by administrators.

```sql
CREATE TABLE IF NOT EXISTS internship_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  adminid VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (adminid) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_internship_posts_created_at ON internship_posts(created_at DESC);
CREATE INDEX idx_internship_posts_deleted_at ON internship_posts(deleted_at);
```

**Columns:**
- `id`: Unique post identifier
- `title`: Post title/subject
- `content`: Post content/body text
- `adminid`: Reference to admin user who created the post
- `created_at`: Timestamp when post was created
- `updated_at`: Timestamp of last update
- `deleted_at`: Timestamp of deletion (NULL if not deleted - soft delete)

---

### 2. `internship_post_files` Table

Links internship posts to attached files.

```sql
CREATE TABLE IF NOT EXISTS internship_post_files (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES internship_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES forms_repository_files(id) ON DELETE CASCADE,
  UNIQUE(post_id, file_id)
);

CREATE INDEX idx_internship_post_files_post_id ON internship_post_files(post_id);
CREATE INDEX idx_internship_post_files_file_id ON internship_post_files(file_id);
```

**Columns:**
- `id`: Unique relationship identifier
- `post_id`: Reference to internship post
- `file_id`: Reference to file in forms_repository_files
- `created_at`: Timestamp of attachment

---

## Installation Steps

### Step 1: Run Database Migration

Execute this SQL to create the required tables:

```bash
PGPASSWORD=Kisses123 psql -h localhost -U postgres -d capstone_db << 'EOF'
-- Create internship_posts table
CREATE TABLE IF NOT EXISTS internship_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  adminid VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (adminid) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_internship_posts_created_at ON internship_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internship_posts_deleted_at ON internship_posts(deleted_at);

-- Create internship_post_files table
CREATE TABLE IF NOT EXISTS internship_post_files (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES internship_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES forms_repository_files(id) ON DELETE CASCADE,
  UNIQUE(post_id, file_id)
);

CREATE INDEX IF NOT EXISTS idx_internship_post_files_post_id ON internship_post_files(post_id);
CREATE INDEX IF NOT EXISTS idx_internship_post_files_file_id ON internship_post_files(file_id);

SELECT 'Internship tables created successfully!' as result;
EOF
```

### Step 2: Verify Tables Created

Check that the tables were created:

```bash
PGPASSWORD=Kisses123 psql -h localhost -U postgres -d capstone_db -c "\dt internship*"
```

You should see:
```
             List of relations
 Schema |            Name             | Type  | Owner
--------+-----------------------------+-------+----------
 public | internship_post_files       | table | postgres
 public | internship_posts            | table | postgres
```

---

## Backend Route Setup

The backend internship route is already created at:
```
backend/routes/internshipRoute.js
```

### API Endpoints

**Get Active Internship Posts (Public)**
```
GET /api/internship/posts
```

**Create Internship Post (Admin)**
```
POST /api/internship/create
```

**Update Internship Post (Admin)**
```
PUT /api/internship/update/:id
```

**Move Post to Trash (Soft Delete)**
```
PUT /api/internship/trash/:id
```

**Get Trashed Posts**
```
GET /api/internship/trash
```

**Restore from Trash**
```
PUT /api/internship/restore/:id
```

**Permanently Delete Post**
```
DELETE /api/internship/delete/:id
```

**Empty Trash**
```
DELETE /api/internship/empty-trash
```

---

## Frontend Route Setup

Routes are already configured in `frontend/src/App.tsx`:

**Public Route:**
```
GET /students/internship
```
- Maps to: `InternshipPage` component
- Displays internship announcements

**Admin Route:**
```
GET /admin/ave/internship
```
- Maps to: `AveInternshipPage` component
- Admin dashboard for managing internship posts

---

## File Structure

### Backend Files Created:
- `backend/routes/internshipRoute.js` - API endpoints for internship posts

### Frontend Files Created:
- `frontend/src/pages/public/students/InternshipPage.tsx` - Public internship announcements page
- `frontend/src/pages/admin/ave/InternshipPage.tsx` - Admin internship management page
- `frontend/src/styles/pages/internship-public.css` - Public page styling

### Files Modified:
- `frontend/src/App.tsx` - Added routes for internship pages
- `frontend/src/routes/paths.ts` - Added path constants for internship routes

---

## Testing

### 1. Verify Database Tables
```bash
PGPASSWORD=Kisses123 psql -h localhost -U postgres -d capstone_db << 'EOF'
SELECT * FROM internship_posts;
SELECT * FROM internship_post_files;
EOF
```

### 2. Test Public Page
- Visit: `http://localhost:5173/students/internship`
- Should display internship announcements feed

### 3. Test Admin Dashboard
- Login as adminAve
- Navigate to Admin Dashboard → Internship
- Should show internship post management interface

### 4. Create Test Post
- From admin dashboard, create a test internship post
- Attach a file
- Verify it appears on public page

---

## Key Differences: OJT vs Internship

| Aspect | OJT | Internship |
|--------|-----|-----------|
| **Database Tables** | `ojt_posts`, `ojt_post_files` | `internship_posts`, `internship_post_files` |
| **API Base Path** | `/api/ojt` | `/api/internship` |
| **Public Route** | `/students/ojt` | `/students/internship` |
| **Admin Route** | `/admin/ave/ojt` | `/admin/ave/internship` |
| **Purpose** | On-the-Job Training announcements | Internship program announcements |
| **Completely Separate** | Yes (own tables, routes, pages) | Yes (own tables, routes, pages) |

---

## Notes

- Both OJT and Internship are completely independent systems
- They share the same file upload infrastructure (`forms_repository_files`)
- They use the same admin user (adminave/Ave)
- Soft delete is used for both systems (posts can be recovered from trash)
- Facebook embeds can be configured separately for each module

---

## Support

If database tables fail to create:
1. Verify PostgreSQL is running
2. Check database credentials in `backend/routes/internshipRoute.js`
3. Ensure you have write permissions on the capstone_db database
4. Check for any existing table conflicts
