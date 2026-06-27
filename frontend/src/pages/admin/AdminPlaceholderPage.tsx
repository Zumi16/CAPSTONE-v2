import { Link, useNavigate } from "react-router-dom";

import { PATHS } from "@/routes/paths";
import {
  clearAdminSession,
  getStoredAdminId,
  getStoredRoleName,
} from "@/lib/adminAuth";

/**
 * Temporary landing page for admin dashboards that haven't been migrated from
 * the legacy "private/" area yet. Login already works end-to-end and routes
 * here by role; each dashboard replaces this as it's ported.
 */
export function AdminPlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate();
  const adminId = getStoredAdminId();
  const roleName = getStoredRoleName();

  const handleLogout = () => {
    clearAdminSession();
    navigate(PATHS.admin.login, { replace: true });
  };

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "4rem 1.5rem",
        textAlign: "center",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <i
        className="fas fa-tools"
        style={{ fontSize: "2.5rem", color: "#800000", marginBottom: "1rem" }}
      />
      <h1 style={{ color: "#800000", marginBottom: "0.5rem" }}>{title}</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        This admin dashboard is being migrated to the new system and isn't
        available yet.
        {adminId && (
          <>
            <br />
            Signed in as <strong>{adminId}</strong>
            {roleName ? ` (${roleName})` : ""}.
          </>
        )}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link
          to={PATHS.home}
          style={{
            padding: "0.6rem 1.2rem",
            border: "1px solid #800000",
            borderRadius: 6,
            color: "#800000",
            textDecoration: "none",
          }}
        >
          Public Site
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: "0.6rem 1.2rem",
            background: "#800000",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>
    </main>
  );
}
