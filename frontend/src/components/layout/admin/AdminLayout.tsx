import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { PATHS } from "@/routes/paths";
import { cx } from "@/lib/cx";
import { clearAdminSession, getStoredAdminId } from "@/lib/adminAuth";
import "@/styles/layout/admin-shell.css";

const LOGO = "/assets/images/PUPLogo.webp";

export type AdminNavItem = {
  label: string;
  icon: string; // Font Awesome classes, e.g. "fas fa-tachometer-alt"
  to: string;
  /** Match the route exactly (used for the index/dashboard link). */
  end?: boolean;
};

export type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
};

/**
 * Shared shell for every admin portal page: sidebar (brand + grouped nav +
 * logged-in user), a sticky header with the page title and profile menu, and
 * an <Outlet/> for the active page.
 *
 * Migrated from the legacy admin HTML pages + "profileFunction.js". Each admin
 * area passes its own nav config and brand label.
 */
export function AdminLayout({
  navSections,
  userName,
  roleLabel = "Administrator",
}: {
  navSections: AdminNavSection[];
  userName: string;
  roleLabel?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const adminId = getStoredAdminId() ?? userName;

  // Page title = label of the deepest nav item matching the current path.
  const isItemActive = (item: AdminNavItem) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const allItems = navSections.flatMap((s) => s.items);
  const active = allItems
    .filter(isItemActive)
    .sort((a, b) => b.to.length - a.to.length)[0];
  const pageTitle = active?.label ?? "Dashboard";

  // Close the profile dropdown on any outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    clearAdminSession();
    sessionStorage.clear();
    navigate(PATHS.home, { replace: true });
  };

  return (
    <div className="admin-shell">
      {/* SIDEBAR */}
      <section className="sidebar">
        <div className="logo">
          <img className="logoimage" src={LOGO} alt="PUP Logo" />
          <div className="logotitlewrap">
            <h2 className="logotitle logotitle1">PUP</h2>
            <h2 className="logotitle">Parañaque</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-scroll">
            {navSections.map((section) => (
              <div className="nav-section" key={section.title}>
                <h3 className="nav-title">{section.title}</h3>
                <ul className="nav-list">
                  {section.items.map((item) => (
                    <li
                      className={cx("nav-item", isItemActive(item) && "active")}
                      key={item.to}
                    >
                      <Link className="nav-link" to={item.to}>
                        <i className={item.icon} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">
                <i className="fas fa-user-circle" />
              </div>
              <div className="user-details">
                <span className="user-name">{userName}</span>
              </div>
            </div>
          </div>
        </nav>
      </section>

      {/* MAIN */}
      <main className="admin-main">
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="header-right">
            <div className="notification-button">
              <i className="fa fa-bell" aria-hidden="true" />
            </div>
            <div className="profile-button" ref={profileRef}>
              <i
                className="fa fa-user"
                aria-hidden="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              />
              <div className={cx("profile-dropdown", menuOpen && "show")}>
                <div className="dropdown-header">
                  <i className="fas fa-user-circle" />
                  <div className="dropdown-user-info">
                    <span className="dropdown-username">{adminId}</span>
                    <span className="dropdown-role">{roleLabel}</span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button type="button" className="dropdown-item logout" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
