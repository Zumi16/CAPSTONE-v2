import { AdminLayout, type AdminNavSection } from "@/components/layout/admin/AdminLayout";
import { PATHS } from "@/routes/paths";

const NAV: AdminNavSection[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        icon: "fas fa-tachometer-alt",
        to: PATHS.admin.enierga.dashboard,
        end: true,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        label: "Data Uploads",
        icon: "fa-solid fa-copy",
        to: PATHS.admin.enierga.dataUploads,
      },
      {
        label: "Analytics Report",
        icon: "fa-solid fa-chart-line",
        to: PATHS.admin.enierga.analyticsReport,
      },
      {
        label: "File Repository",
        icon: "fa-solid fa-box-archive",
        to: PATHS.admin.enierga.fileRepository,
      },
    ],
  },
];

/** Shell for the adminEnierga portal — wraps all of its pages via <Outlet/>. */
export function EniergaLayout() {
  return <AdminLayout navSections={NAV} userName="Admin Enierga" />;
}
