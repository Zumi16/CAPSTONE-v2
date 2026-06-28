import { AdminLayout } from "@/components/layout/admin/AdminLayout";
import { PATHS } from "@/routes/paths";
import { buildPortalNav } from "../super/portalNav";

const NAV = buildPortalNav(PATHS.admin.secondary);

/** Shell for the secondarySuperAdmin (Assistant) portal. */
export function SecondaryLayout() {
  return <AdminLayout navSections={NAV} userName="System Administrator" roleLabel="Assistant Super Administrator" />;
}
