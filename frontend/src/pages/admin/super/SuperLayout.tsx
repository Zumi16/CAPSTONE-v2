import { AdminLayout } from "@/components/layout/admin/AdminLayout";
import { PATHS } from "@/routes/paths";
import { buildPortalNav } from "./portalNav";

const NAV = buildPortalNav(PATHS.admin.super);

/** Shell for the superAdmin (Salao) portal. */
export function SuperLayout() {
  return <AdminLayout navSections={NAV} userName="SuperAdmin" roleLabel="Super Administrator" />;
}
