import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/accreditation-areahead.css";
import { useAreaHead } from "./useAreaHead";

/**
 * Area Head → My Activity Log. A personal audit timeline of the area head's
 * link submissions / updates / deletions for the active cycle, with summary
 * cards, action/date/search filters, 20-per-page pagination and CSV export.
 *
 * Endpoint: GET /api/accreditation/area-head/activity/:userId/:cycleId.
 */

type Activity = { action_type: string; target_type: string; target_name: string; details?: string; created_at: string };
type Toast = { msg: string; type: "success" | "warning" };

const PER_PAGE = 20;
const ACTION_ICON: Record<string, string> = { Submitted: "fa-upload", Updated: "fa-edit", Deleted: "fa-trash", Created: "fa-plus", Removed: "fa-minus" };

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, s] of intervals) {
    const n = Math.floor(seconds / s);
    if (n >= 1) return `${n} ${unit}${n > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

export function ActivityLogPage() {
  const { user, cycle, area, state } = useAreaHead();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (msg: string, type: Toast["type"] = "warning") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!user || !cycle) return;
    try {
      const d = await api.get<{ activities?: Activity[] }>(`/api/accreditation/area-head/activity/${user.id}/${cycle.id}`);
      setActivities(d.activities ?? []);
    } catch { setActivities([]); }
  }, [user, cycle]);

  useEffect(() => { if (state === "ready") load(); }, [state, load]);

  const summary = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return {
      total: activities.length,
      submitted: activities.filter((a) => a.action_type === "Submitted").length,
      updated: activities.filter((a) => a.action_type === "Updated").length,
      week: activities.filter((a) => new Date(a.created_at) >= weekAgo).length,
    };
  }, [activities]);

  const filtered = useMemo(() => {
    let list = activities;
    if (actionType) list = list.filter((a) => a.action_type === actionType);
    if (dateRange !== "all") {
      const now = new Date();
      let start: Date | undefined;
      if (dateRange === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (dateRange === "week") start = new Date(now.getTime() - 7 * 86400000);
      else if (dateRange === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
      if (start) list = list.filter((a) => new Date(a.created_at) >= start!);
    }
    if (search) list = list.filter((a) => a.target_name.toLowerCase().includes(search.toLowerCase()) || (a.details && a.details.toLowerCase().includes(search.toLowerCase())));
    return list;
  }, [activities, actionType, dateRange, search]);

  useEffect(() => { setPage(1); }, [actionType, dateRange, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function resetFilters() { setActionType(""); setDateRange("all"); setSearch(""); }

  function exportCsv() {
    if (activities.length === 0) return showToast("No activities to export");
    const rows = [["Date", "Time", "Action", "Target Type", "Target Name", "Details"], ...activities.map((a) => {
      const d = new Date(a.created_at);
      return [d.toLocaleDateString(), d.toLocaleTimeString(), a.action_type, a.target_type, a.target_name, a.details || ""];
    })];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = `My_Activities_${new Date().toISOString().split("T")[0]}.csv`; link.click();
    URL.revokeObjectURL(url);
    showToast("Activities exported successfully", "success");
  }

  if (state === "loading") return <div className="areahead-page"><div className="no-data-message"><i className="fas fa-spinner fa-spin" /><h2>Loading…</h2></div></div>;
  if (state !== "ready") return <div className="areahead-page"><div className="no-data-message"><i className="fas fa-exclamation-circle" /><h2>No Active Assignment</h2><p>You don't have an active area assignment or accreditation cycle.</p></div></div>;

  return (
    <div className="areahead-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="main-title">My Activity Log</h1>
          <p className="subtitle">Area {area!.area_number}: {area!.area_name}</p>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard icon="fa-tasks" variant="total" value={summary.total} label="Total Activities" />
        <SummaryCard icon="fa-upload" variant="submissions" value={summary.submitted} label="Link Submissions" />
        <SummaryCard icon="fa-edit" variant="updates" value={summary.updated} label="Updates Made" />
        <SummaryCard icon="fa-clock" variant="recent" value={summary.week} label="This Week" />
      </div>

      <div className="filters-card">
        <div className="filters-row">
          <div className="filter-group">
            <label>Action Type</label>
            <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
              <option value="">All Actions</option><option value="Submitted">Submitted</option><option value="Updated">Updated</option><option value="Deleted">Deleted</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Date Range</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Search</label>
            <input id="searchActivity" type="text" placeholder="Search by section..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-actions">
            <button className="btn-secondary" onClick={resetFilters}><i className="fas fa-redo" /> Reset</button>
            <button className="btn-primary" onClick={exportCsv}><i className="fas fa-download" /> Export</button>
          </div>
        </div>
      </div>

      <div className="activity-card">
        <div className="card-header"><h2 className="card-title"><i className="fas fa-history" /> Activity Timeline</h2></div>
        <div className="activity-timeline">
          {pageItems.length === 0 ? (
            <div className="no-activity-message"><i className="fas fa-inbox" /><h3>No Activities Yet</h3><p>Your activities will appear here once you start submitting section links.</p></div>
          ) : pageItems.map((a, i) => {
            const date = new Date(a.created_at);
            return (
              <div className="timeline-item" key={i}>
                <div className={cx("timeline-marker", a.action_type.toLowerCase().replace(" ", "-"))}><i className={cx("fas", ACTION_ICON[a.action_type] || "fa-circle")} /></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div className="timeline-title"><strong>{a.action_type}</strong> {a.target_type}</div>
                    <div className="timeline-time">{timeAgo(date)}</div>
                  </div>
                  <div className="timeline-body">
                    <div className="timeline-section">{a.target_name}</div>
                    {a.details && <div className="timeline-details">{a.details}</div>}
                  </div>
                  <div className="timeline-footer">
                    <span className="timeline-date"><i className="fas fa-calendar" /> {date.toLocaleDateString()} at {date.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length > 0 && (
          <div className="pagination">
            <button className="pagination-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><i className="fas fa-chevron-left" /> Previous</button>
            <span className="pagination-info">Page {page} of {totalPages}</span>
            <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next <i className="fas fa-chevron-right" /></button>
          </div>
        )}
      </div>

      {toast && <div className={cx("ah-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
    </div>
  );
}

function SummaryCard({ icon, variant, value, label }: { icon: string; variant: string; value: number; label: string }) {
  return (
    <div className="summary-card">
      <div className={cx("summary-icon", variant)}><i className={cx("fas", icon)} /></div>
      <div className="summary-content"><div className="summary-value">{value}</div><div className="summary-label">{label}</div></div>
    </div>
  );
}
