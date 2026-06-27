/**
 * Admin / accreditation session helpers.
 *
 * The legacy "private/js/login.js" stored the logged-in admin in localStorage
 * and picked a destination HTML file from the admin id / role. That logic lives
 * here now so the login page, the "already logged in" redirect, and the future
 * admin dashboards all agree on one source of truth.
 */
import { PATHS } from "@/routes/paths";

/** Shape returned by POST /api/login. */
export type AdminLoginResponse = {
  success: boolean;
  adminid?: string;
  role_id?: number;
  role_name?: string;
  hierarchy_level?: number;
  message?: string;
};

/** Shape of the `user` returned by POST /api/accreditation/login. */
export type AccreditationUser = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string; // "Area Head" | "Accreditor"
  is_active: boolean;
};

const { dashboards, accreditation } = PATHS.admin;

/**
 * Map a successful admin login to its dashboard route, mirroring the old
 * login.js redirect chain. Returns `null` for an unrecognised admin.
 */
export function resolveAdminDashboard(data: AdminLoginResponse): string | null {
  if (data.role_name === "Assistant Super Administrator") {
    return dashboards.secondarySuperAdmin;
  }
  switch (data.adminid) {
    case "adminSalao":
      return dashboards.superAdmin;
    case "adminave":
      return dashboards.adminAve;
    case "adminEnierga":
      return dashboards.adminEnierga;
    case "adminMila":
      return dashboards.adminMila;
    case "adminLlave":
      return dashboards.adminLlave;
    case "adminSerrano":
      return dashboards.adminSerrano;
    case "adminCMO":
      return dashboards.adminCMO;
    default:
      return null;
  }
}

/** Area Heads and Accreditors land on different portals. */
export function resolveAccreditationDashboard(role: string): string {
  return role === "Area Head" ? accreditation.areaHead : accreditation.accreditor;
}

// --- localStorage session -------------------------------------------------

export function storeAdminSession(data: AdminLoginResponse): void {
  if (data.adminid) localStorage.setItem("adminid", data.adminid);
  if (data.role_name) localStorage.setItem("role_name", data.role_name);
  if (data.role_id != null) localStorage.setItem("role_id", String(data.role_id));
  if (data.hierarchy_level != null) {
    localStorage.setItem("hierarchy_level", String(data.hierarchy_level));
  }
}

export function storeAccreditationSession(user: AccreditationUser): void {
  localStorage.setItem("accreditation_user", JSON.stringify(user));
}

export function getStoredAdminId(): string | null {
  return localStorage.getItem("adminid");
}

export function getStoredRoleName(): string | null {
  return localStorage.getItem("role_name");
}

export function getStoredAccreditationUser(): AccreditationUser | null {
  const raw = localStorage.getItem("accreditation_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AccreditationUser;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  localStorage.removeItem("adminid");
  localStorage.removeItem("role_name");
  localStorage.removeItem("role_id");
  localStorage.removeItem("hierarchy_level");
  localStorage.removeItem("accreditation_user");
}
