import { type AdminNavSection } from "@/components/layout/admin/AdminLayout";

/**
 * The superAdmin and secondarySuperAdmin portals share the exact same nav
 * structure and the same backend endpoints — only the base path, the displayed
 * user name, and a couple of action-logging details differ. This builds the nav
 * for either portal from its `PATHS.admin.super` / `PATHS.admin.secondary` block.
 */
export type PortalPaths = {
  dashboard: string;
  analytics: string;
  users: string;
  roles: string;
  feedback: string;
  activityLogs: string;
};

export function buildPortalNav(paths: PortalPaths): AdminNavSection[] {
  return [
    {
      title: "Main",
      items: [{ label: "Dashboard", icon: "fas fa-tachometer-alt", to: paths.dashboard, end: true }],
    },
    {
      title: "Management",
      items: [
        { label: "Analytics Dashboard", icon: "fa-solid fa-chart-line", to: paths.analytics },
        { label: "User Management", icon: "fa-solid fa-users", to: paths.users },
        { label: "Role Management", icon: "fa-solid fa-user-tag", to: paths.roles },
        { label: "Service Feedback", icon: "fa-solid fa-comments", to: paths.feedback },
        { label: "Admin Activity Logs", icon: "fa-solid fa-clipboard-list", to: paths.activityLogs },
      ],
    },
  ];
}
