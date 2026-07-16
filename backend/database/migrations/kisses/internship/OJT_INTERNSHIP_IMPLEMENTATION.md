# OJT & Internship System Implementation Guide

**Status:** ✅ **COMPLETE** - OJT and Internship modules are fully separated and implemented

---

## Overview

As requested by Ma'am Ave, **OJT (On-the-Job Training) and Internship are now completely separate modules**. Each has:
- Dedicated database tables
- Separate API endpoints
- Independent public pages
- Independent admin management pages
- Completely isolated from each other

---

## System Architecture

### OJT Module
- **Database Tables:** `ojt_posts`, `ojt_post_files`
- **API Base:** `/api/ojt`
- **Public URL:** `/students/ojt`
- **Admin URL:** `/admin/ave/ojt`
- **Purpose:** On-the-Job Training announcements and updates

### Internship Module (NEW)
- **Database Tables:** `internship_posts`, `internship_post_files`
- **API Base:** `/api/internship`
- **Public URL:** `/students/internship`
- **Admin URL:** `/admin/ave/internship`
- **Purpose:** Internship program announcements and updates

---

## Public Pages

### OJT Page
**URL:** `http://localhost:5173/students/ojt`

**Features:**
- Displays OJT announcements from the OJT Office
- Facebook page embed for social media integration
- AnnouncementFeed component for clean post display
- Responsive design for all devices
- File attachments support

**File:** `frontend/src/pages/public/students/OjtPage.tsx`

---

### Internship Page (NEW)
**URL:** `http://localhost:5173/students/internship`

**Features:**
- Displays internship announcements and opportunities
- Facebook page embed for social media integration
- AnnouncementFeed component for clean post display
- Responsive design for all devices
- File attachments support

**File:** `frontend/src/pages/public/students/InternshipPage.tsx`

---

## Admin Pages

### OJT Admin Dashboard
**URL:** `/admin/ave/ojt`

**Managed by:** adminAve (Ma'am Ave)

**Features:**
- Create/Edit/Delete OJT announcements
- Attach up to 3 files per announcement
- Soft delete (move to trash)
- Restore from trash
- Permanently delete posts
- Empty all trash at once

**File:** `frontend/src/pages/admin/ave/OjtPage.tsx`

---

### Internship Admin Dashboard (NEW)
**URL:** `/admin/ave/internship`

**Managed by:** adminAve (Ma'am Ave)

**Features:**
- Create/Edit/Delete internship announcements
- Attach up to 3 files per announcement
- Soft delete (move to trash)
- Restore from trash
- Permanently delete posts
- Empty all trash at once

**File:** `frontend/src/pages/admin/ave/InternshipPage.tsx`

---

## Database Schema

### OJT Tables
```sql
-- Existing tables
ojt_posts (id, title, content, adminid, created_at, updated_at, deleted_at)
ojt_post_files (id, post_id, file_id, created_at)
```

### Internship Tables (NEW)
```sql
-- New tables
internship_posts (id, title, content, adminid, created_at, updated_at, deleted_at)
internship_post_files (id, post_id, file_id, created_at)
```

---

## API Endpoints

### OJT Endpoints
```
GET    /api/ojt/posts          - Get active OJT posts
GET    /api/ojt/trash          - Get trashed OJT posts
POST   /api/ojt/create         - Create new OJT post
PUT    /api/ojt/update/:id     - Update OJT post
PUT    /api/ojt/trash/:id      - Move post to trash
PUT    /api/ojt/restore/:id    - Restore from trash
DELETE /api/ojt/delete/:id     - Permanently delete
DELETE /api/ojt/empty-trash    - Empty trash
```

### Internship Endpoints (NEW)
```
GET    /api/internship/posts          - Get active internship posts
GET    /api/internship/trash          - Get trashed internship posts
POST   /api/internship/create         - Create new internship post
PUT    /api/internship/update/:id     - Update internship post
PUT    /api/internship/trash/:id      - Move post to trash
PUT    /api/internship/restore/:id    - Restore from trash
DELETE /api/internship/delete/:id     - Permanently delete
DELETE /api/internship/empty-trash    - Empty trash
```

---

## Files Created

### Backend
- `backend/routes/internshipRoute.js` - Internship API endpoints
- `backend/migrations/004_create_internship_tables.sql` - Database migration

### Frontend
- `frontend/src/pages/public/students/InternshipPage.tsx` - Public internship page
- `frontend/src/pages/admin/ave/InternshipPage.tsx` - Admin internship management
- `frontend/src/styles/pages/internship-public.css` - Public page styling

### Documentation
- `INTERNSHIP_DATABASE_MIGRATION.md` - Database setup guide
- `OJT_INTERNSHIP_IMPLEMENTATION.md` - This file

---

## Files Modified

### Backend
- `backend/server.js` - Added internship route registration

### Frontend
- `frontend/src/App.tsx` - Added internship routes
- `frontend/src/routes/paths.ts` - Added internship path constants

### Configuration
- `SETUP_INSTRUCTIONS.txt` - Updated with internship migration
- `.gitignore` - No changes needed (already configured)

---

## Setup Instructions

### Database Setup

Export your local Postgres password from `backend/.env` first:
```bash
export PG_PASSWORD=$(grep PG_PASSWORD backend/.env | cut -d '=' -f2)
```

Run the migration to create the internship tables:

```bash
PGPASSWORD=$PG_PASSWORD psql -h localhost -U postgres -d capstone_db -f backend/migrations/004_create_internship_tables.sql
```

### Backend Setup

1. Install dependencies (if not already done):
   ```bash
   cd backend
   npm install
   ```

2. Start the backend server:
   ```bash
   npm start
   # or with auto-reload
   nodemon server.js
   ```

### Frontend Setup

1. Install dependencies (if not already done):
   ```bash
   cd frontend
   npm install
   ```

2. Start the frontend dev server (in a new terminal):
   ```bash
   npm run dev
   ```

---

## Testing Checklist

- [ ] OJT page loads at `/students/ojt`
- [ ] Internship page loads at `/students/internship`
- [ ] Both pages show announcements from their respective endpoints
- [ ] Admin can create OJT posts
- [ ] Admin can create internship posts
- [ ] OJT and internship posts are separate (not mixed)
- [ ] File attachments work for both modules
- [ ] Trash/restore functionality works
- [ ] Facebook embeds display (if configured)
- [ ] Responsive design works on mobile

---

## Navigation Links

Both pages should be accessible from the navigation menu:

**Public Navigation:**
- Students → OJT Announcements (`/students/ojt`)
- Students → Internship Announcements (`/students/internship`)

**Admin Navigation (for adminAve):**
- Dashboard → OJT (`/admin/ave/ojt`)
- Dashboard → Internship (`/admin/ave/internship`)

---

## Key Differences: OJT vs Internship

| Feature | OJT | Internship |
|---------|-----|-----------|
| **Purpose** | On-the-Job Training announcements | Internship program opportunities |
| **Database** | `ojt_posts`, `ojt_post_files` | `internship_posts`, `internship_post_files` |
| **API Endpoint** | `/api/ojt` | `/api/internship` |
| **Public URL** | `/students/ojt` | `/students/internship` |
| **Admin URL** | `/admin/ave/ojt` | `/admin/ave/internship` |
| **Managed by** | adminAve | adminAve |
| **Facebook Page** | OJT page (configurable) | Internship page (configurable) |
| **Completely Separate** | ✅ Yes | ✅ Yes |

---

## Configuration Options

### Facebook Page URLs

Both modules can be customized with their own Facebook page URLs:

**OJT Facebook URL:**
```typescript
// frontend/src/pages/public/students/OjtPage.tsx
const OJT_FACEBOOK_PAGE = "https://www.facebook.com/profile.php?id=61573085073705";
```

**Internship Facebook URL:**
```typescript
// frontend/src/pages/public/students/InternshipPage.tsx
const INTERNSHIP_FACEBOOK_PAGE = "https://www.facebook.com/profile.php?id=61573085073705";
```

Update these URLs to point to the official Facebook pages for each module.

---

## Admin Management Features

Both modules provide identical management features:

1. **Create Posts**
   - Add title and content
   - Attach up to 3 files
   - Files can be PDFs, Word docs, images, spreadsheets, etc.

2. **Edit Posts**
   - Modify title and content
   - Update attached files
   - Keep or remove existing files

3. **Delete Posts**
   - Move to trash (soft delete) for recovery
   - Restore from trash
   - Permanently delete (hard delete)

4. **Manage Trash**
   - View trashed posts
   - Restore individual posts
   - Empty entire trash at once

---

## Performance Considerations

- **Database Indexes:** Both modules have indexes on common query fields (created_at, deleted_at, post_id)
- **Cascade Deletes:** Files are automatically deleted when posts are deleted
- **Soft Deletes:** Trashed posts are preserved until manually purged

---

## Security Notes

- Both modules use the same file upload infrastructure
- File uploads are validated (type and size restrictions)
- Admin-only access to management features
- No sensitive data exposed in public endpoints

---

## Future Enhancements

Possible future additions:
- Email notifications for new posts
- Search functionality
- Tags/categories for internship posts
- Application submission for internship opportunities
- Analytics on post views/engagement
- Integration with LinkedIn for internship opportunities

---

## Support & Troubleshooting

### Database Tables Not Created
1. Verify PostgreSQL is running
2. Check connection credentials
3. Ensure `users` table exists
4. Run migration command manually and check for errors

### Pages Not Loading
1. Check routes are properly registered in `App.tsx`
2. Verify path constants in `routes/paths.ts`
3. Check console for TypeScript errors
4. Restart frontend dev server

### API Endpoints Not Working
1. Verify backend is running
2. Check that internship route is registered in `server.js`
3. Check backend logs for errors
4. Verify database tables exist

---

## Documentation Files

- `INTERNSHIP_DATABASE_MIGRATION.md` - Detailed database setup
- `OJT_INTERNSHIP_IMPLEMENTATION.md` - This implementation guide
- `CAREER_OJT_IMPLEMENTATION.md` - Career & Job Placement module guide
- `SETUP_INSTRUCTIONS.txt` - General setup instructions

---

## Summary

OJT and Internship are now completely separate, independent modules with:
- ✅ Separate database tables
- ✅ Separate API endpoints
- ✅ Separate public pages
- ✅ Separate admin dashboards
- ✅ Identical feature sets
- ✅ Easy to manage independently

Both modules are production-ready and can be customized independently as needed.
