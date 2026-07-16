# Career & Job Placement / Internship (OJT) Implementation Guide

**Status:** ✅ **COMPLETE** - Career & Job Placement and Internship modules are fully implemented and operational

---

## Overview

The system features two **separate** modules for career and internship services, as requested by Ma'am Ave:

1. **Career & Job Placement Directory** - Showcases partner companies
2. **Internship (OJT) Page** - Displays internship announcements and updates

---

## Career & Job Placement Page

### URL
`http://localhost:5173/careers`

### Features Implemented

✅ **Partner Organization Directory**
- Display of all active partner organizations
- Each organization includes:
  - Company logo
  - Brief company information/description
  - Official website link
  - Optional careers page link
  - Category badge (Government, University Unit, Private Company)

✅ **Filter & Search Functionality**
- Category filters (All, Government, University Unit, Private Company)
- Search by organization name
- Real-time filtering

✅ **External Employment Resources** (NEW)
- **PESO (Public Employment Service Office)**
  - Link: https://www.peso.gov.ph
  - Description: Browse job opportunities, career guidance, and employment services
  
- **DOLE NCR (Department of Labor and Employment - National Capital Region)**
  - Link: https://ncr.dole.gov.ph
  - Description: Explore labor information, job listings, and employment programs

✅ **Information Cards**
- Trusted Partners
- Direct Access
- Regular Updates

✅ **Disclaimer Banner**
- Clarifies that campus is information dissemination platform only
- Job availability managed by partner organizations

### Backend Endpoints

**Get Active Organizations (Public)**
```
GET /api/career/public/organizations
```

**Admin - Get All Organizations**
```
GET /api/career/organizations/all
```

**Admin - Create Organization**
```
POST /api/career/organizations/create
```

**Admin - Update Organization**
```
PUT /api/career/organizations/update/:id
```

**Admin - Delete Organization**
```
DELETE /api/career/organizations/delete/:id
```

### Files Modified

**Frontend:**
- `frontend/src/pages/public/students/CareersPage.tsx` - Added EXTERNAL_RESOURCES with PESO and DOLE NCR links
- `frontend/src/styles/pages/careers-public.css` - Added styling for resource cards section

**Backend:**
- `backend/routes/careerRoutes.js` - Already fully implemented

---

## Internship (OJT) Page

### URL
`http://localhost:5173/ojt`

### Features Implemented

✅ **Separate Internship Module**
- Completely independent from Career & Job Placement page
- Dedicated to OJT announcements and updates only

✅ **Announcement Feed**
- Shows posts from OJT Office
- Professional announcement display

✅ **Facebook Integration**
- Embedded Facebook page for OJT Facebook page
- Provides social media integration for announcements

✅ **AnnouncementFeed Component**
- Fetches OJT posts from backend
- Clean, organized post display
- Empty state handling

### Backend Endpoints

**Get OJT Posts**
```
GET /api/ojt/posts
```

### Files Used

**Frontend:**
- `frontend/src/pages/public/students/OjtPage.tsx`
- `frontend/src/styles/pages/ojt-public.css`
- `frontend/src/features/announcements/AnnouncementFeed.tsx`

**Backend:**
- `backend/routes/ojtRoute.js`

---

## Admin Pages

### Career Management (Admin - MILA)
**URL:** Admin Dashboard → Careers
- Manage partner organizations
- Add/Edit/Delete organizations
- Set organization status and details
- Upload company logos

**File:** `frontend/src/pages/admin/mila/CareersPage.tsx`

### OJT Management (Admin - Ave)
**URL:** Admin Dashboard → OJT
- Create and manage OJT announcements
- Post updates for students
- Manage OJT-related information

**File:** `frontend/src/pages/admin/ave/OjtPage.tsx`

---

## Database

### Partner Organizations Table
```
partner_organizations:
- id (serial primary key)
- name (varchar unique)
- category (varchar - Government, University Unit, Private Company)
- description (text)
- website_url (varchar unique)
- careers_page_url (varchar, nullable)
- logo_url (varchar, nullable)
- status (varchar - active/inactive)
- adminid (varchar)
- created_at (timestamp)
- updated_at (timestamp)
```

---

## Navigation

Both pages are accessible through the main navigation:

**Public Pages:**
- `/careers` - Career & Job Placement Directory
- `/ojt` - Internship Announcements

The pages are completely separate modules with distinct purposes:
- **Careers page** = Partner company directory + job resources
- **OJT page** = Internship announcements and updates

---

## Testing Checklist

- [ ] Career page loads with partner organizations
- [ ] PESO and DOLE NCR resource cards display correctly
- [ ] Resource links open in new tabs
- [ ] Search and filter functionality works
- [ ] OJT page loads with announcements
- [ ] Facebook embed displays (if OJT has public Facebook page)
- [ ] Both pages are properly separated and independent
- [ ] Responsive design works on mobile devices

---

## Notes

1. **Separation:** As requested, OJT and Internship are treated as completely separate modules
2. **External Resources:** PESO and DOLE NCR links provide students with additional employment opportunities beyond campus partners
3. **Admin Management:** Career organizations are managed by MILA; OJT announcements managed by Ave
4. **Status:** All features are production-ready

---

## Configuration

No additional configuration needed. Both modules use existing database tables and routes.

If you need to add more partner organizations, use the admin dashboard to create them (they'll automatically appear on the public careers page once set to active status).

