import { Component, type ErrorInfo, type ReactNode } from "react";

import { clearAdminSession } from "@/lib/adminAuth";

/**
 * App-wide error boundary. Without this, any uncaught render error unmounts the
 * whole React tree and leaves a blank white screen — and because the login page
 * auto-redirects an existing session back into the (crashing) portal, the user
 * gets trapped with no way to log out. This catches the error, shows it, and
 * always offers a "Log out & return to login" escape hatch.
 */
type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  private handleLogout = () => {
    clearAdminSession();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc" }}>
        <div style={{ maxWidth: 560, width: "100%", background: "white", borderRadius: 12, padding: 32, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#b91c1c", margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#475569", margin: "0 0 16px", lineHeight: 1.6 }}>
            This page hit an unexpected error and couldn't render. You can return to login or reload the page.
          </p>
          <pre style={{ background: "#f1f5f9", color: "#334155", padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0 0 20px", maxHeight: 200, overflow: "auto" }}>
            {error.message}
          </pre>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={this.handleLogout} style={{ padding: "10px 20px", border: "none", borderRadius: 8, background: "#800000", color: "white", fontWeight: 600, cursor: "pointer" }}>
              Log out &amp; return to login
            </button>
            <button onClick={() => window.location.reload()} style={{ padding: "10px 20px", border: "2px solid #e2e8f0", borderRadius: 8, background: "white", color: "#475569", fontWeight: 600, cursor: "pointer" }}>
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
