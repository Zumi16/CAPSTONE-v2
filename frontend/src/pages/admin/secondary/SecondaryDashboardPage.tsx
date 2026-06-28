import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PATHS } from "@/routes/paths";
import { getStoredAdminId } from "@/lib/adminAuth";
import "@/styles/pages/admin/secondary-dashboard.css";

/**
 * secondarySuperAdmin (Assistant) dashboard. A leaner counterpart to the super
 * dashboard: four read-only system metrics, quick navigation (with access
 * badges) and the assistant's own recent action log.
 *
 * Endpoints: GET /api/admin-accounts, /api/roles, /api/feedback/director/analytics,
 * /api/superadmin-actions?adminid=<me>&limit=5.
 */

type Admin = { adminid: string; status?: string };
type FeedbackAnalytics = { low_rating_count?: number };
type Action = { id: number | string; action_type: string; details?: string; target_user?: string; created_at: string };

function actionTypeClass(t: string): string {
  const l = t.toLowerCase();
  if (l.includes("create")) return "create";
  if (l.includes("edit") || l.includes("update")) return "edit";
  if (l.includes("delete") || l.includes("disable")) return "delete";
  if (l.includes("assign")) return "assign";
  return "default";
}
function actionIcon(t: string): string {
  const l = t.toLowerCase();
  if (l.includes("create")) return "fa-plus-circle";
  if (l.includes("edit") || l.includes("update")) return "fa-edit";
  if (l.includes("delete")) return "fa-trash";
  if (l.includes("disable")) return "fa-ban";
  if (l.includes("assign")) return "fa-user-tag";
  return "fa-info-circle";
}
function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, sec] of intervals) { const i = Math.floor(s / sec); if (i >= 1) return `${i} ${u}${i > 1 ? "s" : ""} ago`; }
  return "just now";
}

function useDateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

export function SecondaryDashboardPage() {
  const now = useDateTime();
  const me = getStoredAdminId();
  const [users, setUsers] = useState<Admin[]>([]);
  const [roleCount, setRoleCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackAnalytics[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const P = PATHS.admin.secondary;

  useEffect(() => {
    (async () => {
      const [admins, roles, fb, acts] = await Promise.all([
        api.get<{ admins?: Admin[] }>("/api/admin-accounts").catch(() => ({ admins: [] as Admin[] })),
        api.get<unknown[]>("/api/roles").catch(() => [] as unknown[]),
        api.get<{ analytics?: FeedbackAnalytics[] }>("/api/feedback/director/analytics").catch(() => ({ analytics: [] as FeedbackAnalytics[] })),
        api.get<{ actions?: Action[] }>(`/api/superadmin-actions?adminid=${me ?? ""}&limit=5`).catch(() => ({ actions: [] as Action[] })),
      ]);
      setUsers(admins.admins ?? []);
      setRoleCount(Array.isArray(roles) ? roles.length : 0);
      setFeedback(fb.analytics ?? []);
      setActions(acts.actions ?? []);
    })();
  }, [me]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const pendingFeedback = useMemo(() => feedback.reduce((s, d) => s + (d.low_rating_count || 0), 0), [feedback]);

  const dateText = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const NAV = [
    { cls: "analytics", icon: "fa-chart-line", title: "Analytics", sub: "View reports & insights", count: 0, to: P.analytics, badge: "READ ONLY", badgeCls: "read-only" },
    { cls: "users", icon: "fa-users", title: "Users", sub: "Manage user accounts", count: totalUsers, to: P.users, badge: "LIMITED", badgeCls: "limited" },
    { cls: "roles", icon: "fa-user-tag", title: "Roles", sub: "Configure permissions", count: roleCount, to: P.roles, badge: "LIMITED", badgeCls: "limited" },
    { cls: "feedback", icon: "fa-comment-dots", title: "Feedback", sub: "Review submissions", count: pendingFeedback, to: P.feedback, badge: "", badgeCls: "" },
  ];

  const METRICS = [
    { grad: "gradient-blue", icon: "fa-users", value: totalUsers, label: "Total Users", sub: "All admin accounts" },
    { grad: "gradient-green", icon: "fa-user-check", value: activeUsers, label: "Active Users", sub: "Currently active" },
    { grad: "gradient-purple", icon: "fa-user-tag", value: roleCount, label: "Total Roles", sub: "Configured roles" },
    { grad: "gradient-orange", icon: "fa-comments", value: pendingFeedback, label: "Pending Feedback", sub: "Needs attention" },
  ];

  return (
    <div className="secondary-dashboard">
      <section className="welcome-section backup">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome back, <span>System Administrator</span>!</h1>
          <p className="welcome-subtitle">Here's what's happening with your limited access today</p>
          <div className="datetime-display"><i className="far fa-clock" /> <span>{dateText}</span></div>
        </div>
        <div className="system-status">
          <div className="status-indicator">
            <div className="status-dot operational" />
            <div className="status-text"><span className="status-label">System Status</span><span className="status-value">Operational</span></div>
          </div>
          <div className="last-sync"><i className="fas fa-sync-alt" /> <span>Last sync: just now</span></div>
        </div>
      </section>

      <section className="quick-actions-enhanced">
        <h3 className="section-heading"><i className="fas fa-bolt" /> Quick Navigation</h3>
        <div className="quick-nav-grid">
          {NAV.map((c) => (
            <Link to={c.to} className={cx("quick-nav-card", c.cls)} key={c.title}>
              {c.badge && <div className={cx("access-indicator", c.badgeCls)}>{c.badge}</div>}
              <div className="nav-icon"><i className={cx("fas", c.icon)} /></div>
              <h4>{c.title}</h4>
              <p>{c.sub}</p>
              <span className="nav-count">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="metrics-section">
        <h3 className="section-heading"><i className="fas fa-chart-pie" /> System Metrics <span className="read-only-badge">Read Only</span></h3>
        <div className="metrics-grid">
          {METRICS.map((m) => (
            <div className={cx("metric-card", m.grad)} key={m.label}>
              <div className="metric-icon"><i className={cx("fas", m.icon)} /></div>
              <div className="metric-content"><div className="metric-value">{m.value}</div><div className="metric-label">{m.label}</div><div className="metric-subtext">{m.sub}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section className="recent-actions-section">
        <div className="card-header"><h3><i className="fas fa-history" /> My Recent Actions</h3></div>
        <div className="recent-actions-list">
          {actions.length === 0 ? (
            <div className="empty-state"><i className="fas fa-inbox" /><p>No actions recorded yet</p><small>Your administrative actions will appear here</small></div>
          ) : (
            actions.map((a) => (
              <div className="action-item" key={a.id}>
                <div className={cx("action-icon", actionTypeClass(a.action_type))}><i className={cx("fas", actionIcon(a.action_type))} /></div>
                <div className="action-content">
                  <div className="action-title">{a.action_type}</div>
                  <div className="action-details">{a.details || "No details"}</div>
                  {a.target_user && <div className="action-target">Target: {a.target_user}</div>}
                  <div className="action-time"><i className="far fa-clock" /> {timeAgo(new Date(a.created_at))}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
