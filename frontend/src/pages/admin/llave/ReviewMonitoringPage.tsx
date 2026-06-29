import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/llave-review-monitoring.css";

/**
 * adminLlave → Review Monitoring. Read-mostly progress dashboard for the active
 * accreditation cycle: overall + by-status + accreditor-performance overview,
 * per-area breakdown, a filterable detailed review table, an accreditor
 * performance table, a comments modal and a "send reminder" action. Refreshes
 * the overview every 30s.
 *
 * Endpoints (under `/api/accreditation`): /cycle/active, /review-stats/:cycle,
 * /areas-review/:cycle, /area/:cycle/:area/accreditors, /reviews/all/:cycle,
 * /accreditor-performance/:cycle, /send-reminder.
 */

const ADMIN_ID = 6;

type ReviewStats = { total_sections?: number; reviewed_count?: number; complete_count?: number; needs_revision_count?: number; incomplete_count?: number; not_reviewed_count?: number; total_accreditors?: number; top_reviewer_name?: string; pending_reviewers?: number };
type AreaReview = { area_id: number; area_number: number; area_name: string; total_sections?: number; reviewed_sections?: number; complete_sections?: number; needs_revision_count?: number; incomplete_count?: number; not_reviewed_count?: number };
type Review = { section_name: string; area_number: number; google_drive_link?: string; review_status?: string; reviewed_by_name?: string; reviewed_at?: string; comments?: string; accreditor_id?: number };
type Performance = { accreditor_name: string; assigned_areas?: string; total_assigned?: number; reviewed_count?: number; last_activity?: string; accreditor_id: number };
type Toast = { msg: string; type: "success" | "error" | "info" | "warning" };

const numv = (v?: number) => Number(v ?? 0) || 0;
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

function statusBadge(status?: string) {
  if (!status || status === "Not Reviewed") return <span className="badge badge-gray"><i className="fas fa-clock" /> Not Reviewed</span>;
  if (status === "Complete") return <span className="badge badge-green"><i className="fas fa-check-circle" /> Complete</span>;
  if (status === "Needs Revision") return <span className="badge badge-yellow"><i className="fas fa-exclamation-triangle" /> Needs Revision</span>;
  if (status === "Incomplete") return <span className="badge badge-red"><i className="fas fa-times-circle" /> Incomplete</span>;
  return <span className="badge badge-gray">-</span>;
}

export function ReviewMonitoringPage() {
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [noCycle, setNoCycle] = useState(false);
  const [stats, setStats] = useState<ReviewStats>({});
  const [areas, setAreas] = useState<AreaReview[]>([]);
  const [areaAccreditors, setAreaAccreditors] = useState<Record<number, string>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [comments, setComments] = useState<{ section: string; text: string } | null>(null);

  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [accreditorFilter, setAccreditorFilter] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadOverview = useCallback(async (cid: number) => {
    try { const d = await api.get<{ stats?: ReviewStats }>(`/api/accreditation/review-stats/${cid}`); setStats(d.stats ?? {}); } catch { /* */ }
  }, []);
  const loadAreas = useCallback(async (cid: number) => {
    try {
      const d = await api.get<{ areas?: AreaReview[] }>(`/api/accreditation/areas-review/${cid}`);
      const list = d.areas ?? [];
      setAreas(list);
      list.forEach(async (a) => {
        try {
          const r = await api.get<{ accreditors?: { accreditor_name: string }[] }>(`/api/accreditation/area/${cid}/${a.area_id}/accreditors`);
          setAreaAccreditors((prev) => ({ ...prev, [a.area_id]: r.accreditors && r.accreditors.length ? r.accreditors.map((x) => x.accreditor_name).join(", ") : "None assigned" }));
        } catch { setAreaAccreditors((prev) => ({ ...prev, [a.area_id]: "Error" })); }
      });
    } catch { /* */ }
  }, []);
  const loadReviews = useCallback(async (cid: number) => {
    try { const d = await api.get<{ reviews?: Review[] }>(`/api/accreditation/reviews/all/${cid}`); setReviews(d.reviews ?? []); } catch { setReviews([]); }
  }, []);
  const loadPerformance = useCallback(async (cid: number) => {
    try { const d = await api.get<{ performance?: Performance[] }>(`/api/accreditation/accreditor-performance/${cid}`); setPerformance(d.performance ?? []); } catch { setPerformance([]); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get<{ cycle?: { id: number } }>("/api/accreditation/cycle/active");
        if (d.cycle) {
          setCycleId(d.cycle.id);
          await Promise.all([loadOverview(d.cycle.id), loadAreas(d.cycle.id), loadReviews(d.cycle.id), loadPerformance(d.cycle.id)]);
        } else {
          setNoCycle(true);
        }
      } catch { showToast("Failed to load cycle information", "error"); }
    })();
  }, [loadOverview, loadAreas, loadReviews, loadPerformance, showToast]);

  // 30s refresh of overview + area breakdown.
  useEffect(() => {
    if (!cycleId) return;
    const id = setInterval(() => { loadOverview(cycleId); loadAreas(cycleId); }, 30000);
    return () => clearInterval(id);
  }, [cycleId, loadOverview, loadAreas]);

  const accreditorOptions = useMemo(() => [...new Set(reviews.filter((r) => r.reviewed_by_name).map((r) => r.reviewed_by_name!))], [reviews]);

  const filteredReviews = useMemo(() => {
    const q = search.toLowerCase();
    return reviews.filter((r) => {
      if (q && !r.section_name.toLowerCase().includes(q)) return false;
      if (areaFilter && String(r.area_number) !== areaFilter) return false;
      if (statusFilter && (r.review_status || "Not Reviewed") !== statusFilter) return false;
      if (accreditorFilter && r.reviewed_by_name !== accreditorFilter) return false;
      return true;
    });
  }, [reviews, search, areaFilter, statusFilter, accreditorFilter]);

  async function sendReminder(accreditorId: number, sectionName?: string) {
    const msg = sectionName ? `Send reminder to review "${sectionName}"?` : "Send reminder to complete pending reviews?";
    if (!window.confirm(msg)) return;
    try {
      const d = await api.post<{ success?: boolean; error?: string }>("/api/accreditation/send-reminder", { accreditor_id: accreditorId, section_name: sectionName ?? null, sent_by: ADMIN_ID });
      if (d.success) showToast("Reminder sent successfully", "success");
      else showToast(d.error || "Failed to send reminder", "error");
    } catch { showToast("Failed to send reminder", "error"); }
  }

  function viewAreaDetails(area: AreaReview) {
    setAreaFilter(String(area.area_number));
    tableRef.current?.scrollIntoView({ behavior: "smooth" });
    showToast(`Filtered to ${area.area_name}`, "info");
  }

  if (noCycle) {
    return (
      <div className="review-monitoring-page">
        <div className="no-cycle-message">
          <i className="fas fa-exclamation-circle" />
          <h2>No Active Cycle</h2>
          <p>Please create an accreditation cycle first to begin monitoring reviews.</p>
        </div>
      </div>
    );
  }

  const total = numv(stats.total_sections), reviewed = numv(stats.reviewed_count);
  const avgReviews = numv(stats.total_accreditors) > 0 ? (reviewed / numv(stats.total_accreditors)).toFixed(1) : "0";

  return (
    <div className="review-monitoring-page">
      {/* Overview cards */}
      <div className="progress-overview">
        <div className="stat-card">
          <div className="stat-icon total"><i className="fas fa-clipboard-list" /></div>
          <div className="stat-content">
            <h3 className="stat-title">Total Reviews</h3>
            <div className="stat-numbers"><span className="stat-value">{total}</span><span className="stat-label">Items</span></div>
            <div className="stat-breakdown">
              <div className="breakdown-item"><span className="breakdown-label">Reviewed:</span><span className="breakdown-value">{reviewed}</span></div>
              <div className="breakdown-item"><span className="breakdown-label">Pending:</span><span className="breakdown-value">{total - reviewed}</span></div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct(reviewed, total)}%` }} /></div>
              <span className="progress-text">{pct(reviewed, total)}%</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon status"><i className="fas fa-chart-pie" /></div>
          <div className="stat-content">
            <h3 className="stat-title">By Status</h3>
            <div className="status-grid">
              <StatusItem cls="complete" icon="fa-check-circle" count={numv(stats.complete_count)} label="Complete" />
              <StatusItem cls="revision" icon="fa-exclamation-triangle" count={numv(stats.needs_revision_count)} label="Needs Revision" />
              <StatusItem cls="incomplete" icon="fa-times-circle" count={numv(stats.incomplete_count)} label="Incomplete" />
              <StatusItem cls="not-reviewed" icon="fa-clock" count={numv(stats.not_reviewed_count)} label="Not Reviewed" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon performance"><i className="fas fa-users" /></div>
          <div className="stat-content">
            <h3 className="stat-title">Accreditor Performance</h3>
            <div className="performance-stats">
              <div className="perf-item"><span className="perf-label">Average Reviews:</span><span className="perf-value">{avgReviews}</span></div>
              <div className="perf-item"><span className="perf-label">Top Reviewer:</span><span className="perf-value">{stats.top_reviewer_name || "-"}</span></div>
              <div className="perf-item"><span className="perf-label">Pending Reviewers:</span><span className="perf-value">{numv(stats.pending_reviewers)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Area breakdown */}
      <div className="section-header"><h2 className="section-title"><i className="fas fa-layer-group" /> Area Breakdown</h2></div>
      <div className="areas-grid">
        {areas.length === 0 ? <div className="no-data-card">No areas found</div> : areas.map((area) => {
          const t = numv(area.total_sections), rev = numv(area.reviewed_sections);
          return (
            <div className="area-breakdown-card" key={area.area_id}>
              <div className="area-breakdown-header"><h4 className="area-breakdown-title">Area {area.area_number}</h4><span className="area-breakdown-subtitle">{area.area_name}</span></div>
              <div className="area-breakdown-progress">
                <div className="progress-header"><span>Review Progress</span><span className="progress-value">{rev}/{t}</span></div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct(rev, t)}%` }} /></div>
                <span className="progress-text">{pct(rev, t)}%</span>
              </div>
              <div className="area-breakdown-stats">
                <BreakdownStat cls="complete" icon="fa-check-circle" num={numv(area.complete_sections)} lbl="Complete" />
                <BreakdownStat cls="revision" icon="fa-exclamation-triangle" num={numv(area.needs_revision_count)} lbl="Revision" />
                <BreakdownStat cls="incomplete" icon="fa-times-circle" num={numv(area.incomplete_count)} lbl="Incomplete" />
                <BreakdownStat cls="pending" icon="fa-clock" num={numv(area.not_reviewed_count)} lbl="Pending" />
              </div>
              <div className="area-breakdown-footer">
                <div className="accreditors-list"><i className="fas fa-user-check" /><span>{areaAccreditors[area.area_id] ?? "Loading..."}</span></div>
                <button className="btn-view-details-small" onClick={() => viewAreaDetails(area)}><i className="fas fa-eye" /> View Details</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed reviews */}
      <div className="section-header"><h2 className="section-title"><i className="fas fa-filter" /> Detailed Review Status</h2></div>
      <div className="search-filter-bar">
        <div className="search-box"><i className="fas fa-search" /><input type="text" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="filter-group">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="">All Areas</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>Area {n}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="Complete">Complete</option>
            <option value="Needs Revision">Needs Revision</option>
            <option value="Incomplete">Incomplete</option>
            <option value="Not Reviewed">Not Reviewed</option>
          </select>
          <select value={accreditorFilter} onChange={(e) => setAccreditorFilter(e.target.value)}>
            <option value="">All Accreditors</option>
            {accreditorOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="review-card" ref={tableRef}>
        <div className="table-container">
          <table className="data-table review-table">
            <thead><tr><th>Item Name</th><th>Area</th><th>Google Drive Link</th><th>Review Status</th><th>Reviewed By</th><th>Date Reviewed</th><th>Comments</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr><td colSpan={8} className="no-data">{reviews.length === 0 ? "No sections found for review" : "No reviews match your filters"}</td></tr>
              ) : filteredReviews.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.section_name}</strong></td>
                  <td>Area {r.area_number}</td>
                  <td>{r.google_drive_link ? <a href={r.google_drive_link} target="_blank" rel="noreferrer" className="link-button"><i className="fas fa-external-link-alt" /> Open</a> : <span className="text-muted">No link</span>}</td>
                  <td>{statusBadge(r.review_status)}</td>
                  <td>{r.reviewed_by_name || "-"}</td>
                  <td>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "-"}</td>
                  <td>{r.comments ? <button className="btn-icon" title="View Comments" onClick={() => setComments({ section: r.section_name, text: r.comments! })}><i className="fas fa-comment" /></button> : <span className="text-muted">-</span>}</td>
                  <td className="action-buttons">
                    {r.google_drive_link && <a href={r.google_drive_link} target="_blank" rel="noreferrer" className="btn-icon" title="Open Link"><i className="fas fa-external-link-alt" /></a>}
                    {r.review_status === "Not Reviewed" && r.accreditor_id && <button className="btn-icon btn-warning" title="Send Reminder" onClick={() => sendReminder(r.accreditor_id!, r.section_name)}><i className="fas fa-bell" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accreditor performance */}
      <div className="section-header"><h2 className="section-title"><i className="fas fa-trophy" /> Accreditor Performance Summary</h2></div>
      <div className="review-card">
        <div className="table-container">
          <table className="data-table accreditor-table">
            <thead><tr><th>Accreditor Name</th><th>Assigned Areas</th><th>Total Assigned</th><th>Reviewed</th><th>Pending</th><th>Completion %</th><th>Last Activity</th><th></th></tr></thead>
            <tbody>
              {performance.length === 0 ? (
                <tr><td colSpan={8} className="no-data">No accreditor data available</td></tr>
              ) : performance.map((acc, i) => {
                const ta = numv(acc.total_assigned), rc = numv(acc.reviewed_count), pending = ta - rc, completion = pct(rc, ta);
                const cls = completion === 100 ? "complete" : completion >= 50 ? "good" : "warning";
                return (
                  <tr key={i}>
                    <td><strong>{acc.accreditor_name}</strong></td>
                    <td>{acc.assigned_areas || "-"}</td>
                    <td>{ta}</td>
                    <td>{rc}</td>
                    <td>{pending}</td>
                    <td><div className={cx("completion-badge", cls)}>{completion}%</div></td>
                    <td>{acc.last_activity ? new Date(acc.last_activity).toLocaleDateString() : "Never"}</td>
                    <td className="action-buttons">{pending > 0 && <button className="btn-icon btn-warning" title="Send Reminder" onClick={() => sendReminder(acc.accreditor_id)}><i className="fas fa-bell" /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {comments && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setComments(null)}>
          <div className="modal-content">
            <div className="modal-header"><h3>Comments for {comments.section}</h3><button className="modal-close" onClick={() => setComments(null)}><i className="fas fa-times" /></button></div>
            <div className="modal-body"><div className="comments-display"><p>{comments.text}</p></div></div>
            <div className="modal-footer"><button className="btn-primary" onClick={() => setComments(null)}>Close</button></div>
          </div>
        </div>
      )}

      {toast && <div className={cx("rm-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
    </div>
  );
}

function StatusItem({ cls, icon, count, label }: { cls: string; icon: string; count: number; label: string }) {
  return <div className={cx("status-item", cls)}><i className={cx("fas", icon)} /><span className="status-count">{count}</span><span className="status-label">{label}</span></div>;
}
function BreakdownStat({ cls, icon, num, lbl }: { cls: string; icon: string; num: number; lbl: string }) {
  return <div className={cx("breakdown-stat", cls)}><i className={cx("fas", icon)} /><span className="stat-num">{num}</span><span className="stat-lbl">{lbl}</span></div>;
}
