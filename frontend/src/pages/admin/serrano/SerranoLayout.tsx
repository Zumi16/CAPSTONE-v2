import { AdminLayout, type AdminNavSection } from "@/components/layout/admin/AdminLayout";
import { PATHS } from "@/routes/paths";

const NAV: AdminNavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.serrano.dashboard, end: true },
    ],
  },
  {
    title: "Faculty Management",
    items: [
      { label: "Faculty Management", icon: "fas fa-users", to: PATHS.admin.serrano.facultyManagement },
    ],
  },
  {
    title: "Analytics & Reports",
    items: [
      { label: "Analytics & AI Insights", icon: "fas fa-chart-line", to: PATHS.admin.serrano.analyticsReport },
    ],
  },
];

/** Shell for the adminSerrano (Academic Affairs) portal. */
export function SerranoLayout() {
  return <AdminLayout navSections={NAV} userName="Admin Serrano" roleLabel="Academic Affairs" />;
}
