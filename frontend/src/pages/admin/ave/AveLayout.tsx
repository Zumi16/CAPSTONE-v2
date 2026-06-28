import { AdminLayout, type AdminNavSection } from "@/components/layout/admin/AdminLayout";
import { PATHS } from "@/routes/paths";

const NAV: AdminNavSection[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        icon: "fas fa-tachometer-alt",
        to: PATHS.admin.ave.dashboard,
        end: true,
      },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "OJT", icon: "fa-solid fa-briefcase", to: PATHS.admin.ave.ojt },
      {
        label: "Research & Extension",
        icon: "fa-solid fa-book",
        to: PATHS.admin.ave.research,
      },
      { label: "NSTP", icon: "fa-solid fa-handshake-angle", to: PATHS.admin.ave.nstp },
      {
        label: "Forms Repository",
        icon: "fa-brands fa-wpforms",
        to: PATHS.admin.ave.forms,
      },
    ],
  },
];

/** Shell for the adminAve portal. */
export function AveLayout() {
  return <AdminLayout navSections={NAV} userName="Admin Avegail" />;
}
