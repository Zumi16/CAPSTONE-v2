import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import {
  resolveAdminDashboard,
  resolveAccreditationDashboard,
  storeAdminSession,
  storeAccreditationSession,
  getStoredAdminId,
  getStoredRoleName,
  getStoredAccreditationUser,
  type AdminLoginResponse,
  type AccreditationUser,
} from "@/lib/adminAuth";
import "@/styles/pages/login.css";

type Tab = "admin" | "accreditation";

/**
 * Admin / Accreditation login portal — migrated from the legacy
 * "private/html/AdminLogin/login.html" + "private/js/login.js".
 *
 * Two tabs hit two real backend endpoints:
 *   - Admin:        POST /api/login              -> role-based dashboard
 *   - Accreditation POST /api/accreditation/login -> Area Head / Accreditor
 *
 * The session is kept in localStorage exactly as before, so the upcoming admin
 * dashboards can read it without any extra plumbing.
 */
export function LoginPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("admin");

  // Admin form
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPw, setShowAdminPw] = useState(false);

  // Accreditation form
  const [accUsername, setAccUsername] = useState("");
  const [accPassword, setAccPassword] = useState("");
  const [showAccPw, setShowAccPw] = useState(false);
  const [accError, setAccError] = useState("");
  const [busy, setBusy] = useState(false);

  // If a session already exists, skip the form and go straight to the portal.
  useEffect(() => {
    const adminid = getStoredAdminId();
    if (adminid) {
      const dest = resolveAdminDashboard({
        success: true,
        adminid,
        role_name: getStoredRoleName() ?? undefined,
      });
      if (dest) navigate(dest, { replace: true });
      return;
    }
    const accUser = getStoredAccreditationUser();
    if (accUser) {
      navigate(resolveAccreditationDashboard(accUser.role), { replace: true });
    }
  }, [navigate]);

  const handleAdminSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.post<AdminLoginResponse>("/api/login", {
        adminid: adminId,
        password: adminPassword,
      });

      if (!data.success) {
        window.alert(data.message || "Invalid admin ID or password.");
        return;
      }

      const dest = resolveAdminDashboard(data);
      if (!dest) {
        window.alert("Unknown admin role. Please contact support.");
        return;
      }

      storeAdminSession(data);
      navigate(dest);
    } catch (error) {
      // ApiError carries the server's message (e.g. suspended/inactive account).
      window.alert(
        error instanceof ApiError
          ? error.message
          : "Server error. Please try again later.",
      );
    }
  };

  const handleAccreditationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const username = accUsername.trim();
    if (!username || !accPassword) {
      setAccError("Please enter both username and password");
      return;
    }

    setBusy(true);
    setAccError("");
    try {
      const data = await api.post<{
        success: boolean;
        user: AccreditationUser;
        error?: string;
      }>("/api/accreditation/login", { username, password: accPassword });

      if (!data.success) {
        setAccError(data.error || "Login failed. Please try again.");
        return;
      }

      storeAccreditationSession(data.user);
      navigate(resolveAccreditationDashboard(data.user.role));
    } catch (error) {
      setAccError(
        error instanceof ApiError ? error.message : "Connection error. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setAccError("");
  };

  return (
    <main className="login-main">
      <div className="welcome-container">
        <h1 className="welcome-title">Admin Login Portal</h1>
        <p className="welcome-desc">
          Access the official PUP Parañaque Campus system to manage academic
          content, announcements, and campus activities.
        </p>
      </div>

      <hr className="hr2" />

      <div className="login-container">
        {/* Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={cx("tab-btn", tab === "admin" && "active")}
            onClick={() => switchTab("admin")}
          >
            <i className="fas fa-user-shield" /> <span>Admin Login</span>
          </button>
          <button
            type="button"
            className={cx("tab-btn", tab === "accreditation" && "active")}
            onClick={() => switchTab("accreditation")}
          >
            <i className="fas fa-certificate" /> <span>Accreditation Login</span>
          </button>
        </div>

        <div className="tab-content">
          {/* Admin */}
          {tab === "admin" && (
            <div className="tab-pane active">
              <h2 className="login-title">Login to Your Admin Account</h2>

              <form className="login-form" onSubmit={handleAdminSubmit}>
                <div className="form-group">
                  <label htmlFor="admin-username">Admin ID</label>
                  <input
                    type="text"
                    id="admin-username"
                    placeholder="Enter admin ID"
                    required
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="admin-password">Password</label>
                  <div className="password-field">
                    <input
                      type={showAdminPw ? "text" : "password"}
                      id="admin-password"
                      placeholder="Enter your password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <span
                      className="toggle-password"
                      onClick={() => setShowAdminPw((v) => !v)}
                    >
                      <i className={cx("fas", showAdminPw ? "fa-eye-slash" : "fa-eye")} />
                    </span>
                  </div>
                </div>

                <div className="form-group remember-forgot">
                  <div className="remember-me">
                    <input type="checkbox" id="admin-remember" />
                    <label htmlFor="admin-remember">Remember me</label>
                  </div>
                  <a href="#" className="forgot-password">
                    Forgot password?
                  </a>
                </div>

                <button type="submit" className="login-btn">
                  Login
                </button>
              </form>
            </div>
          )}

          {/* Accreditation */}
          {tab === "accreditation" && (
            <div className="tab-pane active">
              <h2 className="login-title">Accreditation Portal Login</h2>
              <p className="login-subtitle">For Area Heads and Accreditors</p>

              {accError && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle" />
                  <span>{accError}</span>
                </div>
              )}

              <form className="login-form" onSubmit={handleAccreditationSubmit}>
                <div className="form-group">
                  <label htmlFor="accreditation-username">Username</label>
                  <input
                    type="text"
                    id="accreditation-username"
                    placeholder="Enter your username"
                    required
                    autoComplete="username"
                    value={accUsername}
                    onChange={(e) => setAccUsername(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="accreditation-password">Password</label>
                  <div className="password-field">
                    <input
                      type={showAccPw ? "text" : "password"}
                      id="accreditation-password"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      value={accPassword}
                      onChange={(e) => setAccPassword(e.target.value)}
                    />
                    <span
                      className="toggle-password"
                      onClick={() => setShowAccPw((v) => !v)}
                    >
                      <i className={cx("fas", showAccPw ? "fa-eye-slash" : "fa-eye")} />
                    </span>
                  </div>
                </div>

                <div className="form-group remember-forgot">
                  <div className="remember-me">
                    <input type="checkbox" id="accreditation-remember" />
                    <label htmlFor="accreditation-remember">Remember me</label>
                  </div>
                  <a href="#" className="forgot-password">
                    Forgot password?
                  </a>
                </div>

                <button type="submit" className="login-btn" disabled={busy}>
                  <span className="btn-text">
                    {busy ? (
                      <>
                        <i className="fas fa-spinner" /> Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
