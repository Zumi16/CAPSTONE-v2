import { Navigate } from "react-router-dom";

import { AdminLayout, type AdminNavSection } from "@/components/layout/admin/AdminLayout";
import { PATHS } from "@/routes/paths";
import { getStoredAccreditationUser, getStoredAdminId, getStoredRoleName } from "@/lib/adminAuth";
import { buildPortalNav } from "./super/portalNav";

/**
 * Single source of truth for every admin / accreditation portal: its base path,
 * sidebar nav, display name and role label. Replaces the ten near-identical
 * `*Layout.tsx` wrappers — each was just an `<AdminLayout>` with a different nav.
 *
 * `getCurrentPortalKey()` maps the stored login session to the portal it owns
 * (mirrors `resolveAdminDashboard`), and `<PortalRoute>` uses it as a session
 * guard: it redirects unauthenticated users to login and users who wander into
 * another role's portal URL back to their own. NOTE: this is frontend UX/defense
 * only — real authorization must be enforced by the backend API.
 */

export type PortalKey =
  | "super" | "secondary" | "ave" | "enierga" | "mila" | "llave" | "serrano" | "cmo" | "ly"
  | "areaHead" | "accreditor";

type PortalConfig = {
  basePath: string;
  nav: AdminNavSection[];
  roleLabel?: string;
  /** Static label, or a function resolving the name from the session. */
  userName: string | (() => string);
};

const accName = (fallback: string) => () => {
  const u = getStoredAccreditationUser();
  return u?.full_name || u?.username || fallback;
};

export const PORTALS: Record<PortalKey, PortalConfig> = {
  super: {
    basePath: PATHS.admin.super.dashboard,
    nav: buildPortalNav(PATHS.admin.super),
    userName: "SuperAdmin",
    roleLabel: "Super Administrator",
  },
  secondary: {
    basePath: PATHS.admin.secondary.dashboard,
    nav: buildPortalNav(PATHS.admin.secondary),
    userName: "System Administrator",
    roleLabel: "Assistant Super Administrator",
  },
  ave: {
    basePath: PATHS.admin.ave.dashboard,
    userName: "Admin Avegail",
    nav: [
      { title: "Main", items: [{ label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.ave.dashboard, end: true }] },
      {
        title: "Management",
        items: [
          { label: "OJT", icon: "fa-solid fa-briefcase", to: PATHS.admin.ave.ojt },
          { label: "Internship", icon: "fa-solid fa-graduation-cap", to: PATHS.admin.ave.internship },
          { label: "Research & Extension", icon: "fa-solid fa-book", to: PATHS.admin.ave.research },
          { label: "NSTP", icon: "fa-solid fa-handshake-angle", to: PATHS.admin.ave.nstp },
          { label: "Forms Repository", icon: "fa-brands fa-wpforms", to: PATHS.admin.ave.forms },
        ],
      },
    ],
  },
  enierga: {
    basePath: PATHS.admin.enierga.dashboard,
    userName: "Admin Enierga",
    nav: [
      { title: "Main", items: [{ label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.enierga.dashboard, end: true }] },
      {
        title: "Management",
        items: [
          { label: "Data Uploads", icon: "fa-solid fa-copy", to: PATHS.admin.enierga.dataUploads },
          { label: "Analytics Report", icon: "fa-solid fa-chart-line", to: PATHS.admin.enierga.analyticsReport },
          { label: "File Repository", icon: "fa-solid fa-box-archive", to: PATHS.admin.enierga.fileRepository },
        ],
      },
    ],
  },
  mila: {
    basePath: PATHS.admin.mila.dashboard,
    userName: "AdminMila",
    nav: [
      { title: "Main", items: [{ label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.mila.dashboard, end: true }] },
      {
        title: "Management",
        items: [
          { label: "Scholarship Opportunities", icon: "fa-solid fa-graduation-cap", to: PATHS.admin.mila.scholarships },
          { label: "Career & Job Placement", icon: "fa-solid fa-briefcase", to: PATHS.admin.mila.careers },
          { label: "Digital Certificates", icon: "fa-solid fa-certificate", to: PATHS.admin.mila.certificates },
          { label: "Alumni Employment Tracking", icon: "fa-solid fa-users", to: PATHS.admin.mila.alumni },
        ],
      },
    ],
  },
  llave: {
    basePath: PATHS.admin.llave.dashboard,
    userName: "AdminLlave",
    roleLabel: "Accreditation",
    nav: [
      {
        title: "Accreditation",
        items: [
          { label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.llave.dashboard, end: true },
          { label: "Management", icon: "fa-solid fa-cog", to: PATHS.admin.llave.management },
          { label: "Review Monitoring", icon: "fa-solid fa-clipboard-check", to: PATHS.admin.llave.reviewMonitoring },
          { label: "Reports & Logs", icon: "fa-solid fa-file-alt", to: PATHS.admin.llave.reportsLogs },
        ],
      },
    ],
  },
  serrano: {
    basePath: PATHS.admin.serrano.dashboard,
    userName: "Admin Serrano",
    roleLabel: "Academic Affairs",
    nav: [
      { title: "Main", items: [{ label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.serrano.dashboard, end: true }] },
      { title: "Faculty Management", items: [{ label: "Faculty Management", icon: "fas fa-users", to: PATHS.admin.serrano.facultyManagement }] },
      { title: "Analytics & Reports", items: [{ label: "Analytics & AI Insights", icon: "fas fa-chart-line", to: PATHS.admin.serrano.analyticsReport }] },
    ],
  },
  cmo: {
    basePath: PATHS.admin.cmo.dashboard,
    userName: "Admin CMO",
    roleLabel: "Communications & Marketing",
    nav: [
      { title: "Main", items: [{ label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.cmo.dashboard, end: true }] },
      { title: "Management", items: [{ label: "News & Updates", icon: "fa-solid fa-newspaper", to: PATHS.admin.cmo.news }] },
    ],
  },
  ly: {
    basePath: PATHS.admin.ly.dashboard,
    userName: "Ms. Ly",
    roleLabel: "Live Chat Support",
    nav: [
      { title: "Main", items: [{ label: "Live Chat", icon: "fas fa-comment-dots", to: PATHS.admin.ly.dashboard, end: true }] },
    ],
  },
  areaHead: {
    basePath: PATHS.admin.accreditation.areaHead.dashboard,
    userName: accName("Area Head"),
    roleLabel: "Area Head",
    nav: [
      {
        title: "Area Management",
        items: [
          { label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.accreditation.areaHead.dashboard, end: true },
          { label: "Activity Log", icon: "fa-solid fa-history", to: PATHS.admin.accreditation.areaHead.activityLog },
          { label: "Reports", icon: "fa-solid fa-chart-bar", to: PATHS.admin.accreditation.areaHead.reports },
        ],
      },
    ],
  },
  accreditor: {
    basePath: PATHS.admin.accreditation.accreditor.dashboard,
    userName: accName("Accreditor"),
    roleLabel: "Accreditor",
    nav: [
      {
        title: "Review Management",
        items: [
          { label: "Dashboard", icon: "fas fa-tachometer-alt", to: PATHS.admin.accreditation.accreditor.dashboard, end: true },
          { label: "My Reviews", icon: "fas fa-history", to: PATHS.admin.accreditation.accreditor.myReviews },
          { label: "Statistics", icon: "fas fa-chart-bar", to: PATHS.admin.accreditation.accreditor.statistics },
        ],
      },
    ],
  },
};

/** Which portal the current login session belongs to, or null if not signed in. */
export function getCurrentPortalKey(): PortalKey | null {
  const accUser = getStoredAccreditationUser();
  if (accUser) return accUser.role === "Area Head" ? "areaHead" : "accreditor";

  const adminid = getStoredAdminId();
  const roleName = getStoredRoleName();
  if (roleName === "Assistant Super Administrator") return "secondary";
  switch (adminid) {
    case "adminSalao": return "super";
    case "adminave": return "ave";
    case "adminEnierga": return "enierga";
    case "adminMila": return "mila";
    case "adminLlave": return "llave";
    case "adminSerrano": return "serrano";
    case "adminCMO": return "cmo";
    case "adminLy": return "ly";
    default: return null;
  }
}

/**
 * Route element for a portal: a session guard wrapped around the shared
 * `AdminLayout`. Renders the layout (whose <Outlet/> shows the active page) only
 * when the logged-in session owns this portal.
 */
export function PortalRoute({ portal }: { portal: PortalKey }) {
  const cfg = PORTALS[portal];
  const current = getCurrentPortalKey();

  if (!current) return <Navigate to={PATHS.admin.login} replace />;
  if (current !== portal) return <Navigate to={PORTALS[current].basePath} replace />;

  const userName = typeof cfg.userName === "function" ? cfg.userName() : cfg.userName;
  return <AdminLayout navSections={cfg.nav} userName={userName} roleLabel={cfg.roleLabel} />;
}
