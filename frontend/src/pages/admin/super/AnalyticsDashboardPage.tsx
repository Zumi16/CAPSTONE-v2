import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PY_API_BASE } from "@/lib/config";
import "@/styles/pages/admin/analytics-dashboard.css";

/**
 * Shared Analytics Dashboard (superAdmin + secondarySuperAdmin) — a read-only
 * cross-admin view of every uploaded dataset. For each file it pulls the saved
 * AI interpretation (Node) and processed statistics + chart (Python API on
 * :5000), then shows executive summary cards, heuristic key insights, an admin
 * activity overview and a grid of report cards with a per-report column picker
 * and a details modal. Degrades gracefully when the Python API is unavailable.
 *
 * Node:   GET /api/files/data, /api/files/interpretation/:id, /api/activity-logs
 * Python: POST {PY_API_BASE}/analytics/process  (proxied to :5000 in dev)
 */

// Uses PY_API_BASE ("/pyapi/api" same-origin proxy) so analytics work locally
// AND through one ngrok tunnel. For a direct local-only setup (no proxy / no
// ngrok), comment the line below and uncomment the original:
// const PY = "http://localhost:5000/api";
const PY = PY_API_BASE;

const ADMIN_NAMES: Record<string, string> = {
  "1": "adminEnierga", "2": "adminAve", admin1: "adminEnierga", admin2: "adminAve",
  adminEnierga: "adminEnierga", adminAve: "adminAve",
};
const adminName = (id: string) => ADMIN_NAMES[id] || `Admin ${id}`;

type Stats = { count: number; mean: number; median: number; mode: number; std: number; min: number; max: number; q1: number; q3: number; range: number };
type Column = { raw_name: string; display_name: string; data_count: number };
type FileRow = { id: number; filename?: string; file_name?: string; originalName?: string; displayName?: string; adminid?: string; type?: string; file_type?: string; chart_type?: string; uploaded_at?: string; created_at?: string };
type Report = {
  id: number; file_id: number; title: string; actualFilename: string; date: string; uploadedAt: Date;
  recordsProcessed: number; chartType: string; chartImage: string; statistics: Stats;
  interpretation: string; hasInterpretation: boolean; interpretationGenerated?: string; analyzedColumn?: string;
  availableColumns: Column[]; currentColumn: string; adminId: string; error?: string;
};
type Toast = { msg: string; type: "success" | "error" };

const ZERO_STATS: Stats = { count: 0, mean: 0, median: 0, mode: 0, std: 0, min: 0, max: 0, q1: 0, q3: 0, range: 0 };

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, sec] of intervals) { const i = Math.floor(s / sec); if (i >= 1) return `${i} ${u}${i > 1 ? "s" : ""} ago`; }
  return "just now";
}

function executiveSummary(r: Report): string {
  const s = r.statistics;
  const col = r.currentColumn.toLowerCase();
  let trend = "stable";
  if (s.mean > s.median + s.std * 0.5) trend = "skewed high";
  else if (s.mean < s.median - s.std * 0.5) trend = "skewed low";
  let performance = "moderate";
  if (s.mean > 75) performance = "excellent";
  else if (s.mean > 50) performance = "good";
  else if (s.mean < 30) performance = "needs attention";
  const cv = s.mean ? (s.std / s.mean) * 100 : 0;
  const consistency = cv < 20 ? "highly consistent" : cv < 40 ? "moderately varied" : "highly varied";
  let out = `Performance: ${performance.toUpperCase()}. This dataset shows ${consistency} data with a ${trend} distribution. The average value of ${s.mean.toFixed(1)} `;
  if (col.includes("enrollment") || col.includes("student")) out += `indicates ${s.mean > 100 ? "strong" : "moderate"} enrollment figures. `;
  else if (col.includes("grade") || col.includes("score")) out += `reflects ${performance} academic performance across the dataset. `;
  if (s.range > s.mean * 2) out += `Note: Significant range (${s.range.toFixed(1)}) suggests diverse data points requiring attention.`;
  return out;
}

export function AnalyticsDashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [activityLogs, setActivityLogs] = useState<{ adminid: string; timestamp: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all");
  const [detail, setDetail] = useState<Report | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((msg: string, type: Toast["type"]) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    let files: FileRow[] = [];
    try {
      files = await api.get<FileRow[]>("/api/files/data");
    } catch {
      files = [];
    }
    api.get<{ adminid: string; timestamp: string }[]>("/api/activity-logs").then((l) => setActivityLogs(Array.isArray(l) ? l : [])).catch(() => setActivityLogs([]));

    const out: Report[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const actualFilename = file.filename || file.file_name || file.originalName || file.displayName || "";
      const displayName = file.displayName || file.originalName || file.file_name || file.filename || `Report ${i + 1}`;
      const chartType = file.chart_type || "bar";

      let savedInterpretation: string | null = null;
      let interpretationGenerated: string | undefined;
      let analyzedColumn: string | undefined;
      try {
        const it = await api.get<{ interpretation?: string; generated_at?: string; analyzed_column?: string }>(`/api/files/interpretation/${file.id}`);
        savedInterpretation = it.interpretation ?? null;
        interpretationGenerated = it.generated_at;
        analyzedColumn = it.analyzed_column;
      } catch { /* none */ }

      try {
        const res = await fetch(`${PY}/analytics/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: actualFilename, chart_type: chartType, generate_interpretation: false }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        out.push({
          id: file.id, file_id: file.id, title: displayName, actualFilename, date: new Date(file.uploaded_at || file.created_at || Date.now()).toLocaleDateString(),
          uploadedAt: new Date(file.uploaded_at || file.created_at || Date.now()), recordsProcessed: d.statistics.count, chartType,
          chartImage: d.chart_image, statistics: d.statistics, interpretation: savedInterpretation || "No AI interpretation available yet.",
          hasInterpretation: !!savedInterpretation, interpretationGenerated, analyzedColumn,
          availableColumns: d.file_info?.available_columns || [], currentColumn: d.file_info?.analyzed_column || "Default Column", adminId: file.adminid || "Unknown",
        });
      } catch {
        // Don't silently drop the file — surface it so it's clear a chart failed
        // (analytics service offline, or this file can't be processed).
        out.push({
          id: file.id, file_id: file.id, title: displayName, actualFilename,
          date: new Date(file.uploaded_at || file.created_at || Date.now()).toLocaleDateString(),
          uploadedAt: new Date(file.uploaded_at || file.created_at || Date.now()),
          recordsProcessed: 0, chartType, chartImage: "", statistics: ZERO_STATS,
          interpretation: savedInterpretation || "", hasInterpretation: !!savedInterpretation,
          availableColumns: [], currentColumn: "", adminId: file.adminid || "Unknown",
          error: "Visualization unavailable — the analytics service (port 5000) is offline or this file can't be processed.",
        });
      }
    }
    setReports(out);
  }, []);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, [load]);

  async function refresh() {
    setLoading(true);
    await load();
    setLoading(false);
    showToast("Dashboard refreshed successfully!", "success");
  }

  async function changeColumn(report: Report, column: string) {
    try {
      const res = await fetch(`${PY}/analytics/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: report.actualFilename, chart_type: report.chartType, column, generate_interpretation: false }),
      });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, chartImage: d.chart_image, statistics: d.statistics, hasInterpretation: false, currentColumn: d.file_info.analyzed_column } : r));
    } catch {
      showToast("Failed to load data for selected column.", "error");
    }
  }

  const visible = useMemo(() => {
    if (timeFilter === "all") return reports;
    return reports.filter((r) => {
      const days = (Date.now() - r.uploadedAt.getTime()) / 86400000;
      if (timeFilter === "today") return days < 1;
      if (timeFilter === "week") return days < 7;
      if (timeFilter === "month") return days < 30;
      return true;
    });
  }, [reports, timeFilter]);

  const totalRecords = useMemo(() => reports.reduce((s, r) => s + r.recordsProcessed, 0), [reports]);
  const avgRecords = reports.length ? Math.round(totalRecords / reports.length) : 0;
  const uniqueAdmins = useMemo(() => [...new Set(reports.map((r) => r.adminId))].filter((id) => id && id !== "Unknown" && id.toLowerCase() !== "superadmin"), [reports]);

  const insights = useMemo(() => {
    const list: { type: string; icon: string; title: string; message: string }[] = [];
    if (totalRecords > 10000) list.push({ type: "success", icon: "fa-check-circle", title: "Excellent Data Volume", message: `System has processed ${totalRecords.toLocaleString()} records, providing robust analytics foundation.` });
    const recent = reports.filter((r) => (Date.now() - r.uploadedAt.getTime()) / 86400000 <= 7);
    if (recent.length > 0) list.push({ type: "info", icon: "fa-clock", title: "Recent Activity", message: `${recent.length} reports uploaded in the last 7 days. System is actively used.` });
    if (reports.length) {
      const avgMean = reports.reduce((s, r) => s + (r.statistics.mean || 0), 0) / reports.length;
      list.push({ type: "primary", icon: "fa-chart-pie", title: "Data Distribution", message: `Average mean across all datasets is ${avgMean.toFixed(2)}, indicating ${avgMean > 50 ? "higher" : "moderate"} value trends.` });
    }
    const highVar = reports.filter((r) => r.statistics.std > r.statistics.mean * 0.5);
    if (reports.length && highVar.length > reports.length * 0.3) list.push({ type: "warning", icon: "fa-exclamation-triangle", title: "Data Variance Detected", message: `${highVar.length} reports show high variance. Consider investigating for consistency.` });
    return list;
  }, [reports, totalRecords]);

  const adminStats = useMemo(() => {
    const map: Record<string, { uploads: number; totalRecords: number; lastActivity: Date }> = {};
    reports.forEach((r) => {
      const id = r.adminId || "Unknown";
      if (!map[id]) map[id] = { uploads: 0, totalRecords: 0, lastActivity: r.uploadedAt };
      map[id].uploads++;
      map[id].totalRecords += r.recordsProcessed;
      if (r.uploadedAt > map[id].lastActivity) map[id].lastActivity = r.uploadedAt;
    });
    activityLogs.forEach((log) => {
      const t = new Date(log.timestamp);
      if (map[log.adminid] && t > map[log.adminid].lastActivity) map[log.adminid].lastActivity = t;
    });
    return Object.entries(map);
  }, [reports, activityLogs]);

  if (loading) {
    return <div className="analytics-dashboard-page"><div className="loading-state"><i className="fas fa-spinner fa-spin" /> Loading analytics dashboard...</div></div>;
  }
  if (reports.length === 0) {
    return (
      <div className="analytics-dashboard-page">
        <div className="ad-header"><button className="refresh-btn" onClick={refresh} title="Refresh"><i className="fas fa-sync-alt" /></button></div>
        <div className="empty-state">
          <i className="fas fa-chart-line empty-icon" />
          <h2>No Analytics Data Available</h2>
          <p>No reports have been uploaded yet, or the Python analytics API (port 5000) is offline. Analytics appear here once admins upload data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard-page">
      <div className="ad-header"><button className="refresh-btn" onClick={refresh} title="Refresh"><i className="fas fa-sync-alt" /></button></div>

      <div className="executive-summary">
        <SummaryCard grad="gradient-blue" icon="fa-file-alt" value={reports.length} label="Total Reports" />
        <SummaryCard grad="gradient-green" icon="fa-database" value={totalRecords.toLocaleString()} label="Total Records" />
        <SummaryCard grad="gradient-purple" icon="fa-chart-line" value={avgRecords.toLocaleString()} label="Avg Records/Report" />
        <SummaryCard grad="gradient-orange" icon="fa-users" value={uniqueAdmins.length} label="Active Admins" />
      </div>

      <div className="insights-section">
        <h2 className="section-title"><i className="fas fa-lightbulb" /> Key Insights</h2>
        <div className="insights-grid">
          {insights.map((ins, i) => (
            <div className={cx("insight-card", ins.type)} key={i}>
              <div className="insight-icon"><i className={cx("fas", ins.icon)} /></div>
              <div className="insight-content"><h4>{ins.title}</h4><p>{ins.message}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-activity-section">
        <h2 className="section-title"><i className="fas fa-users-cog" /> Admin Activity Overview</h2>
        {adminStats.length === 0 ? <p className="no-data">No admin activity recorded yet.</p> : (
          <div className="admin-stats-grid">
            {adminStats.map(([id, s]) => (
              <div className="admin-stat-card" key={id}>
                <div className="admin-avatar"><i className="fas fa-user-shield" /></div>
                <div className="admin-info">
                  <h4>{adminName(id)}</h4>
                  <div className="admin-metrics">
                    <span><i className="fas fa-upload" /> {s.uploads} uploads</span>
                    <span><i className="fas fa-database" /> {s.totalRecords.toLocaleString()} records</span>
                  </div>
                  <p className="last-activity">Last active: {timeAgo(s.lastActivity)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="analytics-grid-section">
        <div className="section-header">
          <h2 className="section-title"><i className="fas fa-chart-bar" /> Analytics Reports</h2>
          <div className="filter-controls">
            <select className="filter-select" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
        <div className="reports-grid">
          {visible.length === 0 ? <p className="no-data">No reports match the selected filters</p> : (
            visible.map((r) => (
              <div className="analytics-report-card" key={r.id}>
                {r.error ? (
                  <>
                    <div className="report-card-header"><h3>{r.title}</h3><span className="admin-badge">{adminName(r.adminId)}</span></div>
                    <div className="chart-preview"><p className="loading-chart">{r.error}</p></div>
                    <div className="report-card-footer"><span className="upload-date"><i className="far fa-calendar" /> {r.date}</span></div>
                  </>
                ) : (
                <>
                <div className="report-card-header"><h3>{r.title}</h3><span className="admin-badge">{adminName(r.adminId)}</span></div>
                <span className={cx("ai-status-badge", r.hasInterpretation ? "success" : "pending")}>
                  <i className={cx("fas", r.hasInterpretation ? "fa-check-circle" : "fa-robot")} /> {r.hasInterpretation ? "AI Analysis Available" : "No AI Analysis"}
                </span>
                {r.availableColumns.length > 1 ? (
                  <div className="column-selector">
                    <label>Analyzing Column:</label>
                    <select className="column-select-dropdown" value={r.availableColumns.find((c) => c.display_name === r.currentColumn)?.raw_name ?? ""} onChange={(e) => changeColumn(r, e.target.value)}>
                      {r.availableColumns.map((c) => <option key={c.raw_name} value={c.raw_name}>{c.display_name} ({c.data_count} values)</option>)}
                    </select>
                  </div>
                ) : (
                  <p className="current-column-display"><strong>Analyzing:</strong> {r.currentColumn}</p>
                )}
                <div className="chart-preview">{r.chartImage ? <img src={r.chartImage} alt="Chart Preview" /> : <p className="loading-chart">No chart</p>}</div>
                <div className="report-stats-mini">
                  <MiniStat label="Records" value={r.recordsProcessed.toLocaleString()} />
                  <MiniStat label="Mean" value={r.statistics.mean.toFixed(1)} />
                  <MiniStat label="Range" value={r.statistics.range.toFixed(1)} />
                </div>
                <div className="enhanced-interpretation">
                  <h4><i className="fas fa-brain" /> Executive Summary</h4>
                  <p>{executiveSummary(r)}</p>
                </div>
                <div className="report-card-footer">
                  <span className="upload-date"><i className="far fa-calendar" /> {r.date}</span>
                  <button className="view-details-btn" onClick={() => setDetail(r)}><i className="fas fa-eye" /> View Details</button>
                </div>
                </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {detail && <ReportModal report={detail} onClose={() => setDetail(null)} />}

      {toast && (
        <div className={cx("refresh-notification", toast.type, "show")}>
          <i className={cx("fas", toast.type === "success" ? "fa-check-circle" : "fa-exclamation-circle")} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ grad, icon, value, label }: { grad: string; icon: string; value: string | number; label: string }) {
  return (
    <div className={cx("summary-card", grad)}>
      <div className="summary-icon"><i className={cx("fas", icon)} /></div>
      <div className="summary-content"><h3>{value}</h3><p>{label}</p></div>
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="stat-item"><span className="stat-label">{label}</span><span className="stat-value">{value}</span></div>;
}

function ReportModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const s = report.statistics;
  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-header"><h3>Report Details</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="report-details">
            <h2>{report.title}</h2>
            <div className="modal-admin-info">
              <span className="admin-badge-large">Uploaded by {adminName(report.adminId)}</span>
              <span className="upload-date-large">{report.date}</span>
              <span className={cx("ai-status-badge", report.hasInterpretation ? "success" : "pending")}>
                <i className={cx("fas", report.hasInterpretation ? "fa-check-circle" : "fa-robot")} /> {report.hasInterpretation ? "AI Analysis Available" : "No AI Analysis"}
              </span>
            </div>
            {report.chartImage && <div className="modal-chart"><img src={report.chartImage} alt="Full Chart" /></div>}
            <div className="modal-executive-summary">
              <h3><i className="fas fa-chart-bar" /> Executive Summary</h3>
              <p>{executiveSummary(report)}</p>
            </div>
            <div className="modal-statistics-grid">
              <div className="stat-box"><strong>Mean</strong> {s.mean.toFixed(2)}</div>
              <div className="stat-box"><strong>Median</strong> {s.median.toFixed(2)}</div>
              <div className="stat-box"><strong>Mode</strong> {s.mode.toFixed(2)}</div>
              <div className="stat-box"><strong>Std Dev</strong> {s.std.toFixed(2)}</div>
              <div className="stat-box"><strong>Min</strong> {s.min.toFixed(2)}</div>
              <div className="stat-box"><strong>Max</strong> {s.max.toFixed(2)}</div>
              <div className="stat-box"><strong>Q1</strong> {s.q1.toFixed(2)}</div>
              <div className="stat-box"><strong>Q3</strong> {s.q3.toFixed(2)}</div>
            </div>
            <div className={cx("modal-interpretation", report.hasInterpretation ? "has-ai" : "no-ai")}>
              <h3><i className="fas fa-lightbulb" /> Detailed AI Analysis</h3>
              {report.hasInterpretation && report.interpretationGenerated && (
                <p className="interpretation-meta"><i className="fas fa-clock" /> Generated: {new Date(report.interpretationGenerated).toLocaleString()}</p>
              )}
              <div className="interpretation-content">
                {report.hasInterpretation ? <p>{report.interpretation}</p> : (
                  <p className="no-interpretation"><i className="fas fa-info-circle" /> No AI interpretation has been generated for this report yet. The admin who uploaded this file needs to click "Generate AI" on their Analytics Report page.</p>
                )}
              </div>
              {report.analyzedColumn && <p className="analyzed-column-info"><strong>Analyzed Column:</strong> {report.analyzedColumn}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
