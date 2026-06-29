import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/llave-reports-logs.css";

/**
 * adminLlave → Reports & Logs. Two sub-tabs:
 *  - Accreditation Reports: five one-click Excel report generators (area
 *    completion, compliance, accreditor summary, master links, complete report).
 *  - Activity Log: filterable + paginated audit trail with summary cards and
 *    Excel export.
 *
 * Endpoints (under `/api/accreditation`): /cycle/active, /areas/:cycle,
 * /reviews/all/:cycle, /accreditor-performance/:cycle, /activity/:cycle?limit=.
 */

const PER_PAGE = 50;

type Cycle = { id: number; academic_year: string };
type Area = { area_number: number; area_name: string; total_sections?: number; submitted_sections?: number; reviewed_sections?: number; complete_sections?: number };
type Review = { section_name: string; area_number: number; area_name?: string; google_drive_link?: string; submitted_by_name?: string; submitted_at?: string; review_status?: string; reviewed_by_name?: string; comments?: string };
type Performance = { accreditor_name: string; assigned_areas?: string; total_assigned?: number; reviewed_count?: number; last_activity?: string };
type Log = { user_name?: string; user_role: string; action_type: string; target_name: string; details: string; created_at: string };
type Toast = { msg: string; type: "success" | "error" | "info" | "warning" };

const num = (v?: number | string) => parseInt(String(v ?? 0)) || 0;

const REPORT_TYPES = [
  { id: "area-completion", title: "Area Completion Report", description: "Detailed report of completion status for each accreditation area", icon: "fa-clipboard-check", formats: ["Excel"] },
  { id: "section-compliance", title: "Accreditation Compliance Report", description: "Complete list of all accreditation items with submission and review status", icon: "fa-list-check", formats: ["Excel"] },
  { id: "accreditor-summary", title: "Accreditor Review Summary", description: "Performance summary and statistics for each accreditor", icon: "fa-user-check", formats: ["Excel"] },
  { id: "master-links", title: "Master Link Repository", description: "All Google Drive links with metadata in one exportable file", icon: "fa-link", formats: ["Excel"] },
  { id: "complete-report", title: "Complete Accreditation Report", description: "Comprehensive report combining all data with executive summary", icon: "fa-file-pdf", formats: ["Excel"] },
] as const;

export function ReportsLogsPage() {
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [noCycle, setNoCycle] = useState(false);
  const [tab, setTab] = useState<"reports" | "logs">("reports");
  const [toast, setToast] = useState<Toast | null>(null);

  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState({ search: "", role: "", action: "", from: "", to: "" });

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get<{ cycle?: Cycle }>("/api/accreditation/cycle/active");
        if (d.cycle) setCycle(d.cycle);
        else setNoCycle(true);
      } catch { showToast("Failed to load cycle information", "error"); }
    })();
  }, [showToast]);

  const loadLogs = useCallback(async (cid: number) => {
    try { const d = await api.get<{ activities?: Log[] }>(`/api/accreditation/activity/${cid}?limit=1000`); setLogs(d.activities ?? []); } catch { setLogs([]); }
  }, []);

  useEffect(() => {
    if (tab === "logs" && cycle) loadLogs(cycle.id);
  }, [tab, cycle, loadLogs]);

  async function generateReport(id: string, title: string) {
    if (!cycle) return showToast("No active cycle to generate report from", "error");
    showToast(`Generating ${title}...`, "info");
    try {
      const wb = XLSX.utils.book_new();
      const head = (name: string) => [[name], [`Academic Year: ${cycle.academic_year}`], [`Generated: ${new Date().toLocaleDateString()}`], []];

      if (id === "area-completion") {
        const d = await api.get<{ areas?: Area[] }>(`/api/accreditation/areas/${cycle.id}`);
        const rows: (string | number)[][] = [...head("Area Completion Report"), ["Area", "Area Name", "Total Sections", "Submitted", "Reviewed", "Complete", "Completion %"]];
        (d.areas ?? []).forEach((a) => { const t = num(a.total_sections), c = num(a.complete_sections); rows.push([`Area ${a.area_number}`, a.area_name, t, num(a.submitted_sections), num(a.reviewed_sections), c, `${t > 0 ? Math.round((c / t) * 100) : 0}%`]); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Area Completion");
        XLSX.writeFile(wb, `Area_Completion_Report_${cycle.academic_year}.xlsx`);
      } else if (id === "section-compliance") {
        const d = await api.get<{ reviews?: Review[] }>(`/api/accreditation/reviews/all/${cycle.id}`);
        const rows: (string | number)[][] = [...head("Section Compliance Report"), ["Section Name", "Area", "Google Drive Link", "Submitted Date", "Review Status", "Reviewed By", "Comments"]];
        (d.reviews ?? []).forEach((s) => rows.push([s.section_name, `Area ${s.area_number}`, s.google_drive_link || "Not Submitted", s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-", s.review_status || "Not Reviewed", s.reviewed_by_name || "-", s.comments || "-"]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Section Compliance");
        XLSX.writeFile(wb, `Section_Compliance_Report_${cycle.academic_year}.xlsx`);
      } else if (id === "accreditor-summary") {
        const d = await api.get<{ performance?: Performance[] }>(`/api/accreditation/accreditor-performance/${cycle.id}`);
        const rows: (string | number)[][] = [...head("Accreditor Review Summary"), ["Accreditor Name", "Assigned Areas", "Total Assigned", "Reviewed", "Pending", "Completion %", "Last Activity"]];
        (d.performance ?? []).forEach((acc) => { const t = num(acc.total_assigned), r = num(acc.reviewed_count); rows.push([acc.accreditor_name, acc.assigned_areas || "-", t, r, t - r, `${t > 0 ? Math.round((r / t) * 100) : 0}%`, acc.last_activity ? new Date(acc.last_activity).toLocaleDateString() : "Never"]); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Accreditor Summary");
        XLSX.writeFile(wb, `Accreditor_Summary_Report_${cycle.academic_year}.xlsx`);
      } else if (id === "master-links") {
        const d = await api.get<{ reviews?: Review[] }>(`/api/accreditation/reviews/all/${cycle.id}`);
        const rows: (string | number)[][] = [...head("Master Link Repository"), ["Section", "Area", "Google Drive Link", "Submitted By", "Date Submitted", "Status"]];
        (d.reviews ?? []).forEach((s) => rows.push([s.section_name, `Area ${s.area_number}${s.area_name ? `: ${s.area_name}` : ""}`, s.google_drive_link || "Not Submitted", s.submitted_by_name || "-", s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-", s.review_status || "Not Reviewed"]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Master Links");
        XLSX.writeFile(wb, `Master_Link_Repository_${cycle.academic_year}.xlsx`);
      } else if (id === "complete-report") {
        const [areas, sections, perf] = await Promise.all([
          api.get<{ areas?: Area[] }>(`/api/accreditation/areas/${cycle.id}`),
          api.get<{ reviews?: Review[] }>(`/api/accreditation/reviews/all/${cycle.id}`),
          api.get<{ performance?: Performance[] }>(`/api/accreditation/accreditor-performance/${cycle.id}`),
        ]);
        const summary: (string | number)[][] = [...head("Complete Accreditation Report"), ["Executive Summary"], ["Total Areas", "10"], ["Total Sections", (sections.reviews ?? []).length], ["Total Accreditors", (perf.performance ?? []).length]];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Executive Summary");
        const areaRows: (string | number)[][] = [["Area", "Area Name", "Total", "Complete"]];
        (areas.areas ?? []).forEach((a) => areaRows.push([`Area ${a.area_number}`, a.area_name, num(a.total_sections), num(a.complete_sections)]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(areaRows), "Areas");
        const secRows: (string | number)[][] = [["Section", "Area", "Status", "Reviewed By"]];
        (sections.reviews ?? []).forEach((s) => secRows.push([s.section_name, `Area ${s.area_number}`, s.review_status || "Not Reviewed", s.reviewed_by_name || "-"]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(secRows), "Sections");
        XLSX.writeFile(wb, `Complete_Accreditation_Report_${cycle.academic_year}.xlsx`);
      }
      showToast(`${title} generated successfully!`, "success");
    } catch { showToast("Failed to generate report", "error"); }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = applied.search.toLowerCase();
      if (q && !(log.user_name?.toLowerCase().includes(q) || log.target_name?.toLowerCase().includes(q) || log.details?.toLowerCase().includes(q))) return false;
      if (applied.role && log.user_role !== applied.role) return false;
      if (applied.action && log.action_type !== applied.action) return false;
      if (applied.from && new Date(log.created_at) < new Date(applied.from)) return false;
      if (applied.to) { const to = new Date(applied.to); to.setHours(23, 59, 59, 999); if (new Date(log.created_at) > to) return false; }
      return true;
    });
  }, [logs, applied]);

  const summary = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 86400000);
    const counts: Record<string, number> = {};
    logs.forEach((l) => { const u = l.user_name || "Unknown"; counts[u] = (counts[u] || 0) + 1; });
    const most = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return {
      today: logs.filter((l) => new Date(l.created_at) >= todayStart).length,
      week: logs.filter((l) => new Date(l.created_at) >= weekStart).length,
      cycle: logs.length,
      mostActive: most ? most[0] : "-",
    };
  }, [logs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PER_PAGE));
  const pageLogs = filteredLogs.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function applyFilters() {
    setApplied({ search, role: roleFilter, action: actionFilter, from: dateFrom, to: dateTo });
    setPage(1);
    showToast("Filters applied", "info");
  }
  function resetFilters() {
    setSearch(""); setRoleFilter(""); setActionFilter(""); setDateFrom(""); setDateTo("");
    setApplied({ search: "", role: "", action: "", from: "", to: "" });
    setPage(1);
    showToast("Filters reset", "info");
  }
  function exportLogs() {
    if (!cycle || logs.length === 0) return showToast("No activity log to export", "error");
    const rows: (string | number)[][] = [["Activity Log Export"], [`Academic Year: ${cycle.academic_year}`], [`Exported: ${new Date().toLocaleDateString()}`], [], ["Timestamp", "User", "Role", "Action", "Target", "Details"]];
    logs.forEach((l) => { const t = new Date(l.created_at); rows.push([`${t.toLocaleDateString()} ${t.toLocaleTimeString()}`, l.user_name || "System", l.user_role, l.action_type, l.target_name, l.details]); });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Activity Log");
    XLSX.writeFile(wb, `Activity_Log_${cycle.academic_year}_${new Date().toISOString().split("T")[0]}.xlsx`);
    showToast("Activity log exported successfully", "success");
  }

  if (noCycle) {
    return (
      <div className="reports-logs-page">
        <div className="no-data-message">
          <i className="fas fa-exclamation-circle" />
          <h2>No Active Cycle</h2>
          <p>Please create an accreditation cycle first to generate reports & view activity logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-logs-page">
      <div className="sub-tab-toggle">
        <button className={cx("sub-tab-btn", tab === "reports" && "active")} onClick={() => setTab("reports")}><i className="fas fa-chart-bar" /> Accreditation Reports</button>
        <button className={cx("sub-tab-btn", tab === "logs" && "active")} onClick={() => setTab("logs")}><i className="fas fa-history" /> Activity Log</button>
      </div>

      {tab === "reports" ? (
        <div className="report-card">
          <div className="report-card-header"><h2 className="report-card-title"><i className="fas fa-file-download" /> Generate Reports</h2></div>
          <div className="reports-grid">
            {REPORT_TYPES.map((r) => (
              <div className="report-item" key={r.id}>
                <div className="report-item-header">
                  <div className="report-icon"><i className={cx("fas", r.icon)} /></div>
                  <div><div className="report-item-title">{r.title}</div></div>
                </div>
                <div className="report-item-desc">{r.description}</div>
                <div className="report-item-footer">
                  <div className="report-format">{r.formats.map((f) => <span className="format-badge" key={f}>{f}</span>)}</div>
                  <button className="btn-generate" disabled={!cycle} onClick={() => generateReport(r.id, r.title)}><i className="fas fa-download" /> Generate</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="log-filters">
            <div className="filters-row">
              <div className="filter-group"><label className="filter-label">Search</label><input type="text" className="filter-input" placeholder="Search by user, section, or action..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <div className="filter-group">
                <label className="filter-label">User Role</label>
                <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">All Roles</option><option value="AdminLlave">AdminLlave</option><option value="Area Head">Area Head</option><option value="Accreditor">Accreditor</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Action Type</label>
                <select className="filter-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                  <option value="">All Actions</option><option value="Created">Created</option><option value="Updated">Updated</option><option value="Deleted">Deleted</option><option value="Submitted">Submitted</option><option value="Reviewed">Reviewed</option><option value="Assigned">Assigned</option>
                </select>
              </div>
              <div className="filter-group"><label className="filter-label">Date Range</label><input type="date" className="filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
              <div className="filter-group"><label className="filter-label">&nbsp;</label><input type="date" className="filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
            </div>
            <div className="filters-actions">
              <button className="btn-filter" onClick={applyFilters}><i className="fas fa-filter" /> Apply Filters</button>
              <button className="btn-reset" onClick={resetFilters}><i className="fas fa-redo" /> Reset</button>
              <button className="btn-export" onClick={exportLogs}><i className="fas fa-file-export" /> Export Log</button>
            </div>
          </div>

          <div className="activity-summary">
            <div className="summary-grid">
              <SummaryItem value={summary.today} label="Activities Today" />
              <SummaryItem value={summary.week} label="Activities This Week" />
              <SummaryItem value={summary.cycle} label="Activities This Cycle" />
              <SummaryItem value={summary.mostActive} label="Most Active User" />
            </div>
          </div>

          <div className="log-card">
            <table className="log-table">
              <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
              <tbody>
                {pageLogs.length === 0 ? (
                  <tr><td colSpan={5} className="no-data">No activity found</td></tr>
                ) : pageLogs.map((log, i) => {
                  const t = new Date(log.created_at);
                  return (
                    <tr key={i}>
                      <td><div className="log-timestamp">{t.toLocaleDateString()}<br />{t.toLocaleTimeString()}</div></td>
                      <td>
                        <div className="log-user">
                          <div className="user-avatar-small">{log.user_name ? log.user_name.charAt(0).toUpperCase() : "?"}</div>
                          <div className="user-info"><div className="user-name">{log.user_name || "System"}</div><div className="user-role">{log.user_role}</div></div>
                        </div>
                      </td>
                      <td><span className={cx("action-badge", `action-${log.action_type.toLowerCase()}`)}>{log.action_type}</span></td>
                      <td><strong>{log.target_name}</strong></td>
                      <td><div className="log-details" title={log.details}>{log.details}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="pagination">
              <button className="pagination-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><i className="fas fa-chevron-left" /> Previous</button>
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next <i className="fas fa-chevron-right" /></button>
            </div>
          </div>
        </>
      )}

      {toast && <div className={cx("rl-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
    </div>
  );
}

function SummaryItem({ value, label }: { value: number | string; label: string }) {
  return <div className="summary-item"><div className="summary-value">{value}</div><div className="summary-label">{label}</div></div>;
}
