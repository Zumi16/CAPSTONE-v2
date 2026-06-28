import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/activity-logs.css";

/**
 * Shared Admin Activity Logs page (superAdmin + secondarySuperAdmin). Reads the
 * `/api/superadmin-actions` audit trail: summary metrics, admin/action/time
 * filters (with custom date range), a timeline ⇄ table toggle, per-admin and
 * per-action breakdown bars, a recent-critical-actions panel, a details modal
 * and CSV export.
 */

const BACKUP_ROLE = "Backup Campus System Administrator";

type Log = { id: number; adminid: string; action_type: string; target_user?: string; details?: string; ip_address?: string; created_at: string };
type Admin = { adminid: string; role_name?: string };
type Toast = { msg: string; type: "success" | "error" | "info" };
type TimeRange = "all" | "today" | "week" | "month" | "custom";

function actionClass(t: string): string {
  const l = t.toLowerCase();
  if (l.includes("create")) return "create";
  if (l.includes("edit") || l.includes("update")) return "edit";
  if (l.includes("delete")) return "delete";
  if (l.includes("assign")) return "assign";
  if (l.includes("reset")) return "reset";
  if (l.includes("suspend") || l.includes("activate")) return "suspend";
  return "edit";
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, sec] of intervals) { const i = Math.floor(s / sec); if (i >= 1) return `${i} ${u}${i > 1 ? "s" : ""} ago`; }
  return "just now";
}

export function ActivityLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [adminFilter, setAdminFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedRange, setAppliedRange] = useState({ start: "", end: "" });
  const [detail, setDetail] = useState<Log | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    const [a, ad] = await Promise.all([
      api.get<{ actions?: Log[] }>("/api/superadmin-actions?limit=500").catch(() => ({ actions: [] as Log[] })),
      api.get<{ admins?: Admin[] }>("/api/admin-accounts").catch(() => ({ admins: [] as Admin[] })),
    ]);
    setLogs(a.actions ?? []);
    setAdmins(ad.admins ?? []);
  }, []);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, [load]);

  const isBackup = useCallback((adminid: string) => admins.find((a) => a.adminid === adminid)?.role_name === BACKUP_ROLE, [admins]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (adminFilter && log.adminid !== adminFilter) return false;
      if (actionFilter && !log.action_type.toLowerCase().includes(actionFilter)) return false;
      if (timeRange !== "all") {
        const d = new Date(log.created_at);
        const now = new Date();
        if (timeRange === "today" && d.toDateString() !== now.toDateString()) return false;
        if (timeRange === "week" && d < new Date(now.getTime() - 7 * 86400000)) return false;
        if (timeRange === "month" && d < new Date(now.getTime() - 30 * 86400000)) return false;
        if (timeRange === "custom") {
          if (appliedRange.start && d < new Date(appliedRange.start)) return false;
          if (appliedRange.end && d > new Date(appliedRange.end)) return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logs, adminFilter, actionFilter, timeRange, appliedRange]);

  const metrics = useMemo(() => {
    const thirty = new Date(); thirty.setDate(thirty.getDate() - 30);
    const day = new Date(); day.setHours(day.getHours() - 24);
    return {
      total: logs.length,
      activeAdmins: new Set(logs.filter((l) => new Date(l.created_at) >= thirty).map((l) => l.adminid)).size,
      recent: logs.filter((l) => new Date(l.created_at) >= day).length,
      backup: logs.filter((l) => isBackup(l.adminid)).length,
    };
  }, [logs, isBackup]);

  const adminBars = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((l) => { counts[l.adminid] = (counts[l.adminid] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const max = Math.max(1, ...sorted.map(([, c]) => c));
    return sorted.map(([adminid, count]) => ({ adminid, count, pct: (count / max) * 100 }));
  }, [filtered]);

  const typeBars = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((l) => { counts[l.action_type] = (counts[l.action_type] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, c]) => s + c, 0) || 1;
    return sorted.map(([type, count]) => ({ type, count, pct: ((count / total) * 100).toFixed(1) }));
  }, [filtered]);

  const critical = useMemo(() =>
    filtered.filter((l) => { const t = l.action_type.toLowerCase(); return t.includes("delete") || t.includes("suspend") || t.includes("role updated"); }).slice(0, 10),
  [filtered]);

  const adminOptions = useMemo(() => [...new Set(logs.map((l) => l.adminid))], [logs]);

  function clearFilters() {
    setAdminFilter(""); setActionFilter(""); setTimeRange("all"); setStartDate(""); setEndDate(""); setAppliedRange({ start: "", end: "" });
    showToast("Filters cleared", "info");
  }

  async function refresh() {
    await load();
    showToast("Logs refreshed successfully", "success");
  }

  function exportCSV() {
    const rows = [
      ["Timestamp", "Admin", "Action Type", "Target User", "Details", "IP Address"].join(","),
      ...filtered.map((l) => [new Date(l.created_at).toLocaleString(), l.adminid, l.action_type, l.target_user || "", `"${(l.details || "").replace(/"/g, '""')}"`, l.ip_address || ""].join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin_activity_logs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported successfully", "success");
  }

  const SUMMARY = [
    { grad: "gradient-blue", icon: "fa-clipboard-list", value: metrics.total, label: "Total Actions", sub: "All time" },
    { grad: "gradient-green", icon: "fa-users-cog", value: metrics.activeAdmins, label: "Active Admins", sub: "With recent activity" },
    { grad: "gradient-orange", icon: "fa-clock", value: metrics.recent, label: "Recent Actions", sub: "Last 24 hours" },
    { grad: "gradient-purple", icon: "fa-user-shield", value: metrics.backup, label: "System Admin Actions", sub: "Secondary administrators" },
  ];

  return (
    <div className="activity-logs-page">
      <div className="al-header">
        <h2>Admin Activity Logs</h2>
        <button className="refresh-btn" title="Refresh Logs" onClick={refresh}><i className="fas fa-sync-alt" /></button>
      </div>

      <section className="summary-section">
        <div className="summary-grid">
          {SUMMARY.map((s) => (
            <div className={cx("summary-card", s.grad)} key={s.label}>
              <div className="summary-icon"><i className={cx("fas", s.icon)} /></div>
              <div className="summary-content"><h3>{s.value}</h3><p>{s.label}</p><small className="summary-subtext">{s.sub}</small></div>
            </div>
          ))}
        </div>
      </section>

      <section className="controls-section">
        <div className="controls-container">
          <div className="filter-group">
            <select className="filter-select" value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)}>
              <option value="">All Admins</option>
              {adminOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select className="filter-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="edit">Edit/Update</option>
              <option value="delete">Delete</option>
              <option value="assign">Assign Role</option>
              <option value="reset">Password Reset</option>
              <option value="suspend">Suspend/Activate</option>
            </select>
            <select className="filter-select" value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
            <button className="btn-clear" onClick={clearFilters}><i className="fas fa-times" /> Clear Filters</button>
          </div>
          <div className="action-group">
            <button className="btn-export" onClick={exportCSV}><i className="fas fa-file-csv" /> Export CSV</button>
            <button className="btn-export" onClick={() => showToast("PDF export feature coming soon", "info")}><i className="fas fa-file-pdf" /> Export PDF</button>
          </div>
        </div>
        {timeRange === "custom" && (
          <div className="date-range-container" style={{ display: "flex" }}>
            <input type="date" className="date-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span>to</span>
            <input type="date" className="date-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button className="btn-apply" onClick={() => setAppliedRange({ start: startDate, end: endDate })}>Apply</button>
          </div>
        )}
      </section>

      <section className="timeline-section">
        <div className="timeline-header">
          <h3><i className="fas fa-history" /> Activity Timeline</h3>
          <div className="timeline-controls">
            <button className={cx("timeline-view-btn", view === "timeline" && "active")} onClick={() => setView("timeline")}><i className="fas fa-stream" /> Timeline View</button>
            <button className={cx("timeline-view-btn", view === "table" && "active")} onClick={() => setView("table")}><i className="fas fa-table" /> Table View</button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><i className="fas fa-spinner fa-spin" /><p>Loading activity logs...</p></div>
        ) : view === "timeline" ? (
          <div className="timeline-content">
            {filtered.length === 0 ? (
              <div className="empty-state"><i className="fas fa-inbox" /><h3>No Activity Logs</h3><p>{logs.length === 0 ? "No activity logs recorded yet" : "No logs match the current filters"}</p></div>
            ) : (
              filtered.map((log) => {
                const cls = actionClass(log.action_type);
                const backup = isBackup(log.adminid);
                return (
                  <div className={cx("timeline-item", cls)} key={log.id} onClick={() => setDetail(log)}>
                    <div className="timeline-item-header">
                      <div className="timeline-action">
                        <span className={cx("action-badge", cls)}>{log.action_type}</span>
                      </div>
                      <div className="timeline-timestamp"><i className="far fa-clock" /> {timeAgo(new Date(log.created_at))}</div>
                    </div>
                    <div className="timeline-details">
                      <div className="detail-row"><strong>Admin:</strong> <span className={backup ? "backup-admin-badge" : "admin-badge"}>{log.adminid}{backup ? " (Backup)" : ""}</span></div>
                      {log.target_user && <div className="detail-row"><strong>Target User:</strong> <span>{log.target_user}</span></div>}
                      {log.details && <div className="detail-row"><strong>Details:</strong> <span>{log.details}</span></div>}
                      {log.ip_address && <div className="detail-row"><strong>IP Address:</strong> <span>{log.ip_address}</span></div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="table-content" style={{ display: "block" }}>
            <div className="activity-table-container">
              <table className="activity-table">
                <thead><tr><th>Timestamp</th><th>Admin</th><th>Action Type</th><th>Target User</th><th>Details</th><th>IP Address</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="empty-table"><i className="fas fa-inbox" /><p>{logs.length === 0 ? "No activity logs recorded yet" : "No logs match the current filters"}</p></td></tr>
                  ) : (
                    filtered.map((log) => (
                      <tr key={log.id} onClick={() => setDetail(log)}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{log.adminid}</td>
                        <td><span className={cx("action-badge", actionClass(log.action_type))}>{log.action_type}</span></td>
                        <td>{log.target_user || "-"}</td>
                        <td>{log.details || "-"}</td>
                        <td>{log.ip_address || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="breakdown-section">
        <div className="breakdown-grid">
          <div className="breakdown-card">
            <div className="card-header"><h3><i className="fas fa-chart-bar" /> Activity by Admin</h3></div>
            <div className="card-body">
              <div className="chart-container" style={{ flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start" }}>
                {adminBars.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#a0aec0", padding: 20 }}>No data available</p>
                ) : (
                  adminBars.map((b) => (
                    <div key={b.adminid} style={{ marginBottom: 15 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontWeight: 600, color: "#2d3748" }}>{b.adminid}{isBackup(b.adminid) && <span style={{ color: "#ed8936", fontSize: "0.8rem" }}> (Backup)</span>}</span>
                        <span style={{ fontWeight: 700, color: "#667eea" }}>{b.count}</span>
                      </div>
                      <div style={{ height: 12, background: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${b.pct}%`, background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)", transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="breakdown-card">
            <div className="card-header"><h3><i className="fas fa-chart-pie" /> Action Type Distribution</h3></div>
            <div className="card-body">
              <div className="chart-container" style={{ flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start" }}>
                {typeBars.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#a0aec0", padding: 20 }}>No data available</p>
                ) : (
                  typeBars.map((b) => (
                    <div key={b.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#f7fafc", borderRadius: 8, marginBottom: 10 }}>
                      <span className={cx("action-badge", actionClass(b.type))} style={{ fontSize: "0.75rem", padding: "4px 10px" }}>{b.type}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                        <span style={{ fontSize: "0.9rem", color: "#718096" }}>{b.pct}%</span>
                        <span style={{ fontWeight: 700, color: "#2d3748", minWidth: 40, textAlign: "right" }}>{b.count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="critical-actions-section">
        <div className="card">
          <div className="card-header"><h3><i className="fas fa-exclamation-triangle" /> Recent Critical Actions</h3><span className="badge-warning">{critical.length}</span></div>
          <div className="card-body">
            <div className="critical-list">
              {critical.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}><i className="fas fa-check-circle" style={{ color: "#48bb78" }} /><p>No critical actions recently</p></div>
              ) : (
                critical.map((log) => (
                  <div className="critical-item" key={log.id} onClick={() => setDetail(log)}>
                    <div className="critical-header"><span className="critical-action">{log.action_type}</span><span className="critical-timestamp">{timeAgo(new Date(log.created_at))}</span></div>
                    <div className="critical-details"><strong>{log.adminid}</strong>{log.target_user ? <> performed action on <strong>{log.target_user}</strong></> : ""}{log.details ? ` - ${log.details}` : ""}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {detail && (
        <div className="modal active">
          <div className="modal-overlay" onClick={() => setDetail(null)} />
          <div className="modal-container">
            <div className="modal-header"><h3><i className="fas fa-clipboard-list" /> Action Details</h3><button className="modal-close" onClick={() => setDetail(null)}>×</button></div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ padding: 20, background: "#f7fafc", borderRadius: 10 }}>
                  <h4 style={{ margin: "0 0 15px", color: "#2d3748", fontSize: "1.1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: 10 }}><i className="fas fa-info-circle" /> Action Information</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 15 }}>
                    <DetailField label="Action Type"><span className={cx("action-badge", actionClass(detail.action_type))}>{detail.action_type}</span></DetailField>
                    <DetailField label="Timestamp"><span style={{ fontWeight: 500 }}>{new Date(detail.created_at).toLocaleString()}</span></DetailField>
                    <DetailField label="Performed By"><span className={isBackup(detail.adminid) ? "backup-admin-badge" : "admin-badge"}>{detail.adminid}{isBackup(detail.adminid) ? " (System Admin)" : ""}</span></DetailField>
                    {detail.target_user && <DetailField label="Target User"><span style={{ fontWeight: 500 }}>{detail.target_user}</span></DetailField>}
                    {detail.ip_address && <DetailField label="IP Address"><span style={{ fontWeight: 500 }}>{detail.ip_address}</span></DetailField>}
                  </div>
                </div>
                {detail.details && (
                  <div style={{ padding: 20, background: "#f7fafc", borderRadius: 10 }}>
                    <h4 style={{ margin: "0 0 15px", color: "#2d3748", fontSize: "1.1rem", borderBottom: "2px solid #e2e8f0", paddingBottom: 10 }}><i className="fas fa-file-alt" /> Details</h4>
                    <p style={{ lineHeight: 1.6, color: "#4a5568", margin: 0 }}>{detail.details}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={cx("toast", toast.type, "show")}>
            <div className="toast-icon"><i className={cx("fas", toast.type === "success" ? "fa-check-circle" : toast.type === "error" ? "fa-exclamation-circle" : "fa-info-circle")} /></div>
            <div className="toast-content"><div className="toast-message">{toast.msg}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "0.85rem", color: "#718096", fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}
