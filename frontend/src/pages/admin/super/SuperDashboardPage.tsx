import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/admin/super-dashboard.css";

/**
 * superAdmin dashboard. Faithful port of superAdmin.js: aggregates five
 * endpoints (datasets / users / roles / activity-logs / feedback) and derives
 * every metric, insight, activity and system-alert client-side. All fetches
 * degrade gracefully to empty so the page renders even with the backend down.
 */

type Dataset = { file_size?: number; uploaded_at?: string; created_at?: string; file_name?: string; filename?: string };
type User = { status?: string };
type Role = { is_system?: boolean; user_count?: number };
type Feedback = { status?: string };
type Activity = { id: number | string; type: string; title: string; description: string; module: string; timestamp: Date; user?: string };
type RawLog = { id: number | string; action?: string; type?: string; message?: string; details?: unknown; module?: string; timestamp?: string; adminid?: string };
type Notif = { type: "info" | "warning" | "error" | "success"; title: string; message: string };

const TOTAL_STORAGE = 100 * 1024 * 1024 * 1024;

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, s] of intervals) {
    const i = Math.floor(seconds / s);
    if (i >= 1) return `${i} ${unit}${i > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function activityType(action?: string): string {
  const l = (action || "").toLowerCase();
  if (l.includes("upload")) return "upload";
  if (l.includes("report") || l.includes("analytics")) return "report";
  if (l.includes("repository") || l.includes("file")) return "repository";
  if (l.includes("chart") || l.includes("visualization")) return "visualization";
  return "report";
}
const ACTIVITY_ICON: Record<string, string> = { upload: "fa-cloud-upload-alt", report: "fa-chart-pie", repository: "fa-folder", visualization: "fa-chart-area" };
const NOTIF_ICON: Record<Notif["type"], string> = { info: "fa-info-circle", warning: "fa-exclamation-triangle", error: "fa-exclamation-circle", success: "fa-check-circle" };

function useDateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function SuperDashboardPage() {
  const now = useDateTime();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [lastSync, setLastSync] = useState(() => new Date());
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  const P = PATHS.admin.super;

  async function loadActivities(): Promise<Activity[]> {
    try {
      const logs = await api.get<RawLog[]>("/api/activity-logs");
      const acts = (Array.isArray(logs) ? logs : []).map((log) => {
        // `details` may be a JSON object (analytics logs) — never render it raw,
        // or React throws "Objects are not valid as a React child".
        const detailsText = typeof log.details === "string" ? log.details : "";
        return {
          id: log.id,
          type: activityType(log.action || log.type),
          title: log.action || log.message || "Activity",
          description: detailsText || log.message || "",
          module: log.module || "System",
          timestamp: new Date(log.timestamp ?? Date.now()),
          user: log.adminid,
        };
      });
      setActivities(acts);
      return acts;
    } catch {
      setActivities([]);
      return [];
    }
  }

  useEffect(() => {
    (async () => {
      const [ds, us, rl, fb] = await Promise.all([
        api.get<Dataset[]>("/api/files/data").catch(() => [] as Dataset[]),
        api.get<User[] | { users?: User[] }>("/api/users").catch(() => [] as User[]),
        api.get<Role[]>("/api/roles").catch(() => [] as Role[]),
        api.get<Feedback[]>("/api/feedback").catch(() => [] as Feedback[]),
      ]);
      setDatasets(Array.isArray(ds) ? ds : []);
      setUsers(Array.isArray(us) ? us : us.users ?? []);
      setRoles(Array.isArray(rl) ? rl : []);
      setFeedback(Array.isArray(fb) ? fb : []);
      await loadActivities();
    })();
    // Auto-refresh activities every 60s.
    const id = setInterval(() => { loadActivities(); setLastSync(new Date()); }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- derived metrics ----
  const storageUsed = useMemo(() => datasets.reduce((s, d) => s + (d.file_size || 0), 0), [datasets]);
  const storagePct = ((storageUsed / TOTAL_STORAGE) * 100).toFixed(1);
  const recentUploads = useMemo(() => datasets.filter((d) => Date.now() - new Date(d.uploaded_at || d.created_at || 0).getTime() <= 86400000).length, [datasets]);
  const sortedDatasets = useMemo(() => [...datasets].sort((a, b) => new Date(b.uploaded_at || b.created_at || 0).getTime() - new Date(a.uploaded_at || a.created_at || 0).getTime()), [datasets]);
  const latest = sortedDatasets[0];

  const userM = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    suspended: users.filter((u) => u.status === "suspended").length,
  }), [users]);

  const roleM = useMemo(() => {
    const system = roles.filter((r) => r.is_system).length;
    const withUsers = roles.filter((r) => (r.user_count ?? 0) > 0).length;
    return { total: roles.length, system, custom: roles.length - system, empty: roles.length - withUsers };
  }, [roles]);

  const fbM = useMemo(() => ({
    total: feedback.length,
    pending: feedback.filter((f) => f.status === "pending").length,
    resolved: feedback.filter((f) => f.status === "resolved").length,
    inProgress: feedback.filter((f) => f.status === "in_progress").length,
  }), [feedback]);

  const fileTypes = useMemo(() => {
    const map: Record<string, number> = {};
    datasets.forEach((d) => {
      const ext = (d.file_name || d.filename || "").split(".").pop()?.toLowerCase();
      const type = ext === "csv" ? "CSV" : ext === "xlsx" || ext === "xls" ? "Excel" : "JSON";
      map[type] = (map[type] || 0) + 1;
    });
    return map;
  }, [datasets]);

  const uploadTrend = useMemo(() => {
    const last7 = datasets.filter((d) => Date.now() - new Date(d.uploaded_at || d.created_at || 0).getTime() <= 7 * 86400000).length;
    const prev7 = datasets.filter((d) => {
      const diff = Date.now() - new Date(d.uploaded_at || d.created_at || 0).getTime();
      return diff > 7 * 86400000 && diff <= 14 * 86400000;
    }).length;
    if (last7 > prev7) return { dir: "", icon: "fa-arrow-up", text: `Increasing - ${last7} uploads this week` };
    if (last7 < prev7) return { dir: "down", icon: "fa-arrow-down", text: `Decreasing - ${last7} uploads this week` };
    return { dir: "stable", icon: "fa-minus", text: `Stable - ${last7} uploads this week` };
  }, [datasets]);

  const avgSizeMB = datasets.length ? (storageUsed / datasets.length / (1024 * 1024)).toFixed(2) : "0";

  const notifications = useMemo<Notif[]>(() => {
    const list: Notif[] = [];
    const add = (n: Notif) => { if (!list.some((x) => x.title === n.title && x.type === n.type)) list.push(n); };
    if (Number(storagePct) > 90) add({ type: "error", title: "Storage Critical", message: `Storage is ${storagePct}% full. Immediate action required.` });
    else if (Number(storagePct) > 75) add({ type: "warning", title: "Storage Warning", message: `Storage is ${storagePct}% full.` });
    if (datasets.length === 0) add({ type: "info", title: "No Data", message: "Upload datasets to enable analytics." });
    if (userM.inactive > 5) add({ type: "warning", title: `${userM.inactive} Inactive Users`, message: "Review and update user accounts." });
    if (userM.suspended > 0) add({ type: "info", title: "Suspended Users", message: `${userM.suspended} users currently suspended.` });
    if (roleM.empty > 3) add({ type: "info", title: "Unused Roles", message: `${roleM.empty} roles have no users assigned.` });
    if (fbM.pending > 10) add({ type: "warning", title: `${fbM.pending} Pending Feedback`, message: "Respond to user feedback." });
    const recentActivity = activities.filter((a) => Date.now() - a.timestamp.getTime() <= 7 * 86400000);
    if (recentActivity.length === 0 && datasets.length > 0) add({ type: "info", title: "Low Activity", message: "No system activity in 7 days." });
    if (datasets.length > 0 && recentActivity.length > 0) add({ type: "success", title: "System Healthy", message: "All systems normal." });
    return list;
  }, [storagePct, datasets.length, userM, roleM.empty, fbM.pending, activities]);

  const alertCount = notifications.filter((n) => n.type === "error" || n.type === "warning").length;
  const systemHealthy = datasets.length > 0 && users.length > 0;

  const filteredActivities = useMemo(() => {
    let list = [...activities];
    if (typeFilter !== "all") list = list.filter((a) => a.type === typeFilter);
    if (timeFilter !== "all") {
      list = list.filter((a) => {
        const days = (Date.now() - a.timestamp.getTime()) / 86400000;
        if (timeFilter === "today") return days < 1;
        if (timeFilter === "week") return days < 7;
        if (timeFilter === "month") return days < 30;
        return true;
      });
    }
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, typeFilter, timeFilter]);

  const feedActivities = useMemo(() => [...activities].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8), [activities]);

  const dateText = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const NAV_CARDS = [
    { cls: "analytics", icon: "fa-chart-line", title: "Analytics", sub: "View reports & insights", count: datasets.length, to: P.analytics },
    { cls: "users", icon: "fa-users", title: "Users", sub: "Manage user accounts", count: userM.total, to: P.users },
    { cls: "roles", icon: "fa-user-tag", title: "Roles", sub: "Configure permissions", count: roleM.total, to: P.roles },
    { cls: "feedback", icon: "fa-comment-dots", title: "Feedback", sub: "Review submissions", count: fbM.pending, to: P.feedback },
  ];

  const KEY_METRICS = [
    { grad: "gradient-blue", icon: "fa-database", value: datasets.length, label: "Total Datasets", sub: "All-time uploads" },
    { grad: "gradient-green", icon: "fa-arrow-up", value: recentUploads, label: "Recent Uploads", sub: "Last 24 hours" },
    { grad: "gradient-purple", icon: "fa-chart-pie", value: datasets.length, label: "Reports Generated", sub: "Analytics available" },
    { grad: "gradient-orange", icon: "fa-folder-open", value: datasets.length, label: "Repository Items", sub: "Files stored" },
  ];

  const OVERVIEW = [
    { grad: "gradient-teal", icon: "fa-users", value: userM.total, label: "Total Users", sub: "User Management", to: P.users },
    { grad: "gradient-green", icon: "fa-user-check", value: userM.active, label: "Active Users", sub: "Currently active" },
    { grad: "gradient-orange", icon: "fa-user-slash", value: userM.inactive, label: "Inactive Users", sub: "Needs review" },
    { grad: "gradient-red", icon: "fa-ban", value: userM.suspended, label: "Suspended", sub: "Blocked access" },
    { grad: "gradient-indigo", icon: "fa-user-tag", value: roleM.total, label: "Total Roles", sub: "Role Management", to: P.roles },
    { grad: "gradient-purple", icon: "fa-shield-alt", value: roleM.system, label: "System Roles", sub: "Protected roles" },
    { grad: "gradient-cyan", icon: "fa-user-cog", value: roleM.custom, label: "Custom Roles", sub: "User-defined" },
    { grad: "gradient-gray", icon: "fa-user-times", value: roleM.empty, label: "Empty Roles", sub: "No users assigned" },
    { grad: "gradient-yellow", icon: "fa-comments", value: fbM.total, label: "Total Feedback", sub: "All submissions", to: P.feedback },
    { grad: "gradient-orange", icon: "fa-clock", value: fbM.pending, label: "Pending", sub: "Awaiting response" },
    { grad: "gradient-green", icon: "fa-check-circle", value: fbM.resolved, label: "Resolved", sub: "Completed" },
    { grad: "gradient-blue", icon: "fa-spinner", value: fbM.inProgress, label: "In Progress", sub: "Being addressed" },
  ];

  return (
    <div className="super-dashboard">
      {/* Welcome */}
      <section className="welcome-section">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome back, <span>SuperAdmin</span>!</h1>
          <p className="welcome-subtitle">Here's what's happening with your system today</p>
          <div className="datetime-display"><i className="far fa-clock" /> <span>{dateText}</span></div>
        </div>
        <div className="system-status">
          <div className="status-indicator">
            <div className={cx("status-dot", systemHealthy ? "operational" : "maintenance")} />
            <div className="status-text">
              <span className="status-label">System Status</span>
              <span className="status-value">{systemHealthy ? "Operational" : "Needs Attention"}</span>
            </div>
          </div>
          <div className="last-sync"><i className="fas fa-sync-alt" /> <span>Last sync: {formatTimeAgo(lastSync)}</span></div>
        </div>
      </section>

      {/* Quick navigation */}
      <section className="quick-actions-enhanced">
        <h3 className="section-heading"><i className="fas fa-bolt" /> Quick Navigation</h3>
        <div className="quick-nav-grid">
          {NAV_CARDS.map((c) => (
            <Link to={c.to} className={cx("quick-nav-card", c.cls)} key={c.title}>
              <div className="nav-icon"><i className={cx("fas", c.icon)} /></div>
              <h4>{c.title}</h4>
              <p>{c.sub}</p>
              <span className="nav-count">{c.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Key metrics */}
      <section className="metrics-section">
        <div className="metrics-grid">
          {KEY_METRICS.map((m) => (
            <div className={cx("metric-card", m.grad)} key={m.label}>
              <div className="metric-icon"><i className={cx("fas", m.icon)} /></div>
              <div className="metric-content">
                <div className="metric-value">{m.value}</div>
                <div className="metric-label">{m.label}</div>
                <div className="metric-subtext">{m.sub}</div>
              </div>
            </div>
          ))}
          <div className="metric-card gradient-teal">
            <div className="metric-icon"><i className="fas fa-hdd" /></div>
            <div className="metric-content">
              <div className="metric-value">{(storageUsed / (1024 ** 3)).toFixed(2)} GB</div>
              <div className="metric-label">Storage Used</div>
              <div className="metric-subtext">of 100GB</div>
            </div>
            <div className="storage-progress"><div className="storage-bar"><div className="storage-fill" style={{ width: `${storagePct}%` }} /></div></div>
          </div>
          <div className="metric-card gradient-pink">
            <div className="metric-icon"><i className="fas fa-clock" /></div>
            <div className="metric-content">
              <div className="metric-value small">{latest ? formatTimeAgo(new Date(latest.uploaded_at || latest.created_at || 0)) : "Never"}</div>
              <div className="metric-label">Last Upload</div>
              <div className="metric-subtext">{latest ? latest.filename || latest.file_name || "Unknown file" : "No recent uploads"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* System overview */}
      <section className="cross-tab-metrics">
        <h3 className="section-heading"><i className="fas fa-th-large" /> System Overview</h3>
        <div className="metrics-grid enhanced">
          {OVERVIEW.map((m, i) => (
            <div className={cx("metric-card", m.grad)} key={`${m.label}-${i}`}>
              <div className="metric-icon"><i className={cx("fas", m.icon)} /></div>
              <div className="metric-content">
                <div className="metric-value">{m.value}</div>
                <div className="metric-label">{m.label}</div>
                <div className="metric-subtext">{m.sub}</div>
              </div>
              {m.to && <Link to={m.to} className="metric-link"><i className="fas fa-arrow-right" /></Link>}
            </div>
          ))}
        </div>
      </section>

      {/* Two columns */}
      <div className="content-columns">
        <div className="left-column">
          <section className="insights-card">
            <div className="card-header"><h3><i className="fas fa-chart-line" /> Upload Insights</h3></div>
            <div className="card-body">
              <div className="insight-item">
                <div className={cx("insight-icon trending", uploadTrend.dir)}><i className={cx("fas", uploadTrend.icon)} /></div>
                <div className="insight-content"><div className="insight-label">Upload Trend</div><div className="insight-value">{uploadTrend.text}</div></div>
              </div>
              <div className="insight-item">
                <div className="insight-icon"><i className="fas fa-file" /></div>
                <div className="insight-content"><div className="insight-label">Most Recent Dataset</div><div className="insight-value">{latest ? latest.filename || latest.file_name || "Unknown" : "No uploads yet"}</div></div>
              </div>
              <div className="file-type-breakdown">
                <h4>File Type Distribution</h4>
                <div className="file-types">
                  {Object.keys(fileTypes).length === 0 ? (
                    <p style={{ color: "#a0aec0" }}>No files uploaded yet</p>
                  ) : (
                    Object.entries(fileTypes).map(([type, count]) => (
                      <div className="file-type-item" key={type}>
                        <div className="file-type-info">
                          <div className={cx("file-type-icon", type.toLowerCase())}><i className={cx("fas", type === "CSV" ? "fa-file-csv" : type === "Excel" ? "fa-file-excel" : "fa-file-code")} /></div>
                          <span className="file-type-name">{type}</span>
                        </div>
                        <span className="file-type-count">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="insights-card">
            <div className="card-header"><h3><i className="fas fa-brain" /> Analytics Snapshot</h3></div>
            <div className="card-body">
              <div className="analytics-stats">
                <div className="stat-item"><div className="stat-number">{datasets.length}</div><div className="stat-label">Available Reports</div></div>
                <div className="stat-item"><div className="stat-number">{latest ? formatTimeAgo(new Date(latest.uploaded_at || latest.created_at || 0)) : "N/A"}</div><div className="stat-label">Last Generated</div></div>
              </div>
              <div className="recent-report"><div className="report-label">Most Recent Report</div><div className="report-name">{latest ? latest.filename || latest.file_name || "Unknown" : "No reports available"}</div></div>
              <div className="insight-message">
                <i className="fas fa-lightbulb" />
                <p>{datasets.length > 0 ? `System has ${datasets.length} datasets (avg ${avgSizeMB}MB). ${datasets.length > 5 ? "Excellent data volume!" : "Upload more for better insights."}` : "Upload your first dataset to start analytics."}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="right-column">
          <section className="activity-feed-card">
            <div className="card-header">
              <h3><i className="fas fa-history" /> Recent Activity</h3>
              <button className="view-all-btn" onClick={() => setShowModal(true)}>View All</button>
            </div>
            <div className="card-body">
              <div className="activity-list">
                {feedActivities.length === 0 ? (
                  <div className="empty-activities"><i className="fas fa-inbox" /><h4>No activities yet</h4><p>System activities will appear here</p></div>
                ) : (
                  feedActivities.map((a) => <ActivityRow key={a.id} a={a} />)
                )}
              </div>
              <div className="activity-auto-refresh"><i className="fas fa-sync-alt" /><span>Auto-refreshing every 60s</span></div>
            </div>
          </section>

          <section className="notifications-card">
            <div className="card-header"><h3><i className="fas fa-bell" /> System Alerts {alertCount > 0 && <span className="notification-badge" style={{ position: "static" }}>{alertCount}</span>}</h3></div>
            <div className="card-body">
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications"><i className="fas fa-check-circle" /><p>All systems operational</p></div>
                ) : (
                  notifications.map((n, i) => (
                    <div className={cx("notification-item", n.type)} key={i}>
                      <div className="notification-icon"><i className={cx("fas", NOTIF_ICON[n.type])} /></div>
                      <div className="notification-content"><div className="notification-title">{n.title}</div><div className="notification-message">{n.message}</div></div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Activity modal */}
      {showModal && (
        <div className="modal active">
          <div className="modal-overlay" onClick={() => setShowModal(false)} />
          <div className="modal-container">
            <div className="modal-header">
              <h3><i className="fas fa-history" /> All System Activities</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="activity-filters">
                <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All Activities</option>
                  <option value="upload">Uploads</option>
                  <option value="report">Reports</option>
                  <option value="repository">Repository</option>
                  <option value="visualization">Visualizations</option>
                </select>
                <select className="filter-select" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              <div className="modal-activity-list">
                {filteredActivities.length === 0 ? (
                  <div className="empty-activities"><i className="fas fa-inbox" /><h4>No activities found</h4><p>Try adjusting filters</p></div>
                ) : (
                  filteredActivities.map((a) => <ActivityRow key={a.id} a={a} />)
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function ActivityRow({ a }: { a: Activity }) {
    return (
      <div className={cx("activity-item", a.type)}>
        <div className="activity-icon"><i className={cx("fas", ACTIVITY_ICON[a.type] ?? "fa-circle-info")} /></div>
        <div className="activity-content">
          <div className="activity-title">{a.title}</div>
          <div className="activity-description">{a.description}</div>
          <div className="activity-meta">
            <span className="activity-module"><i className="fas fa-tag" /> {a.module}</span>
            <span className="activity-time"><i className="far fa-clock" /> {formatTimeAgo(a.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }
}
