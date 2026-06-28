import { AdminLayout, type AdminNavSection } from "@/components/layout/admin/AdminLayout";
import { PATHS } from "@/routes/paths";

const NAV: AdminNavSection[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        icon: "fas fa-tachometer-alt",
        to: PATHS.admin.mila.dashboard,
        end: true,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        label: "Scholarship Opportunities",
        icon: "fa-solid fa-graduation-cap",
        to: PATHS.admin.mila.scholarships,
      },
      {
        label: "Career & Job Placement",
        icon: "fa-solid fa-briefcase",
        to: PATHS.admin.mila.careers,
      },
      {
        label: "Digital Certificates",
        icon: "fa-solid fa-certificate",
        to: PATHS.admin.mila.certificates,
      },
      {
        label: "Alumni Employment Tracking",
        icon: "fa-solid fa-users",
        to: PATHS.admin.mila.alumni,
      },
    ],
  },
];

/** Shell for the adminMila portal. */
export function MilaLayout() {
  return <AdminLayout navSections={NAV} userName="AdminMila" />;
}
