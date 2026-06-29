import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/llave-dashboard.css";

/**
 * adminLlave (Accreditation) dashboard. Manages the active accreditation cycle:
 * quick stats, submission open/close control, per-area progress, recent
 * activity, plus create / archive / restore cycles and Excel export of archived
 * cycle data. Faithful port of adminLlave.js.
 *
 * Endpoints (all under `/api/accreditation`):
 *   GET  /cycle/active, /cycles, /dashboard/stats/:id, /submission-control/:id,
 *        /areas/:id, /area/:cycle/:area/accreditors, /activity/:id?limit=,
 *        /sections/:cycle/:area, /sections/all/:id
 *   POST /cycle
 *   PUT  /cycle/:id/archive, /cycle/:id/restore,
 *        /submission-control/:id/open, /submission-control/:id/close
 */

const ADMIN_ID = 6;

type Cycle = { id: number; academic_year: string; status: string; created_at?: string; archived_at?: string };
type Stats = { total_sections?: number | string; submitted_count?: number | string; reviewed_count?: number | string; complete_count?: number | string };
type Area = { area_id: number; area_number: number; area_name: string; area_head_name?: string; total_sections?: number | string; submitted_sections?: number | string; reviewed_sections?: number | string; complete_sections?: number | string };
type Activity = { user_name: string; user_role: string; action_type: string; target_name: string; created_at: string };
type Section = { section_name: string; google_drive_link?: string; submitted_by_name?: string; submitted_at?: string; review_status?: string; comments?: string; area_number?: number; area_head_name?: string; reviewed_by_name?: string };
type Toast = { msg: string; type: "success" | "error" | "info" | "warning" };

const num = (v?: number | string) => parseInt(String(v ?? 0)) || 0;
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, sec] of intervals) { const i = Math.floor(s / sec); if (i >= 1) return `${i} ${u}${i > 1 ? "s" : ""} ago`; }
  return "Just now";
}
const ACTION_ICON: Record<string, string> = { Created: "fa-plus", Updated: "fa-edit", Deleted: "fa-trash", Assigned: "fa-user-plus", Removed: "fa-user-minus", Opened: "fa-lock-open", Closed: "fa-lock", Submitted: "fa-upload", Reviewed: "fa-check", Archived: "fa-archive" };
function reviewBadge(status?: string) {
  if (!status || status === "Not Reviewed") return <span className="badge badge-gray">Not Reviewed</span>;
  if (status === "Complete") return <span className="badge badge-green">Complete</span>;
  if (status === "Needs Revision") return <span className="badge badge-yellow">Needs Revision</span>;
  if (status === "Incomplete") return <span className="badge badge-red">Incomplete</span>;
  return <span className="badge badge-gray">-</span>;
}

export function LlaveDashboardPage() {
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [isOpen, setIsOpen] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [accreditors, setAccreditors] = useState<Record<number, string>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [areaDetail, setAreaDetail] = useState<{ name: string; sections: Section[] } | null>(null);
  const [archived, setArchived] = useState<Cycle[] | null>(null);
  const [archivedDetail, setArchivedDetail] = useState<{ cycle: Cycle; stats: Stats; areas: Area[] } | null>(null);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadStats = useCallback(async (cycleId: number) => {
    try { const d = await api.get<{ stats?: Stats }>(`/api/accreditation/dashboard/stats/${cycleId}`); setStats(d.stats ?? {}); } catch { /* */ }
  }, []);
  const loadControl = useCallback(async (cycleId: number) => {
    try { const d = await api.get<{ control?: { is_open: boolean } }>(`/api/accreditation/submission-control/${cycleId}`); setIsOpen(!!d.control?.is_open); } catch { /* */ }
  }, []);
  const loadActivity = useCallback(async (cycleId: number) => {
    try { const d = await api.get<{ activities?: Activity[] }>(`/api/accreditation/activity/${cycleId}?limit=15`); setActivities(d.activities ?? []); } catch { /* */ }
  }, []);
  const loadAreas = useCallback(async (cycleId: number) => {
    try {
      const d = await api.get<{ areas?: Area[] }>(`/api/accreditation/areas/${cycleId}`);
      const list = d.areas ?? [];
      setAreas(list);
      list.forEach(async (a) => {
        try {
          const r = await api.get<{ accreditors?: { accreditor_name: string }[] }>(`/api/accreditation/area/${cycleId}/${a.area_id}/accreditors`);
          setAccreditors((prev) => ({ ...prev, [a.area_id]: r.accreditors && r.accreditors.length ? r.accreditors.map((x) => x.accreditor_name).join(", ") : "None assigned" }));
        } catch {
          setAccreditors((prev) => ({ ...prev, [a.area_id]: "Error loading" }));
        }
      });
    } catch { /* */ }
  }, []);

  const loadActive = useCallback(async () => {
    try {
      const d = await api.get<{ cycle?: Cycle }>("/api/accreditation/cycle/active");
      if (d.cycle) {
        setCycle(d.cycle);
        await Promise.all([loadStats(d.cycle.id), loadControl(d.cycle.id), loadAreas(d.cycle.id), loadActivity(d.cycle.id)]);
      } else {
        setCycle(null);
      }
    } catch {
      showToast("Failed to load cycle information", "error");
    }
  }, [loadStats, loadControl, loadAreas, loadActivity, showToast]);

  useEffect(() => { loadActive(); }, [loadActive]);

  async function createCycle() {
    const y = academicYear.trim();
    if (!y) return showToast("Please enter academic year", "error");
    if (!/^\d{4}-\d{4}$/.test(y)) return showToast("Invalid format. Use YYYY-YYYY (e.g., 2025-2026)", "error");
    try {
      const d = await api.post<{ success?: boolean; error?: string }>("/api/accreditation/cycle", { academic_year: y, created_by: ADMIN_ID });
      if (d.success) { showToast("Cycle created successfully", "success"); setShowCreate(false); setAcademicYear(""); loadActive(); }
      else showToast(d.error || "Failed to create cycle", "error");
    } catch { showToast("Failed to create cycle", "error"); }
  }

  async function archiveCycle() {
    if (!cycle || !window.confirm("Are you sure you want to archive this cycle? This action cannot be undone.")) return;
    try {
      const d = await api.put<{ success?: boolean; error?: string }>(`/api/accreditation/cycle/${cycle.id}/archive`, { archived_by: ADMIN_ID });
      if (d.success) { showToast("Cycle archived successfully", "success"); setCycle(null); setAreas([]); setActivities([]); }
      else showToast(d.error || "Failed to archive cycle", "error");
    } catch { showToast("Failed to archive cycle", "error"); }
  }

  async function toggleSubmissions(open: boolean) {
    if (!cycle) return;
    const ok = open
      ? window.confirm("Open submissions? Area Heads will be able to add/edit Google Drive links.")
      : window.confirm("Close submissions? All Google Drive links will be locked and accreditors can begin reviewing.");
    if (!ok) return;
    try {
      const d = await api.put<{ success?: boolean; error?: string }>(`/api/accreditation/submission-control/${cycle.id}/${open ? "open" : "close"}`, open ? { opened_by: ADMIN_ID } : { closed_by: ADMIN_ID });
      if (d.success) { showToast(open ? "Submissions opened successfully" : "Submissions closed and all links locked", "success"); loadControl(cycle.id); loadActivity(cycle.id); }
      else showToast(d.error || "Failed", "error");
    } catch { showToast("Failed to update submissions", "error"); }
  }

  async function viewAreaDetails(area: Area) {
    if (!cycle) return;
    try {
      const d = await api.get<{ sections?: Section[] }>(`/api/accreditation/sections/${cycle.id}/${area.area_id}`);
      setAreaDetail({ name: `Area ${area.area_number}: ${area.area_name}`, sections: d.sections ?? [] });
    } catch { showToast("Failed to load area details", "error"); }
  }

  async function openArchived() {
    try {
      const d = await api.get<{ cycles?: Cycle[] }>("/api/accreditation/cycles");
      const list = (d.cycles ?? []).filter((c) => c.status === "Archived");
      if (list.length === 0) return showToast("No archived cycles found", "info");
      setArchived(list);
    } catch { showToast("Failed to load archived cycles", "error"); }
  }

  async function viewArchivedDetails(c: Cycle) {
    try {
      const [s, a] = await Promise.all([
        api.get<{ stats?: Stats }>(`/api/accreditation/dashboard/stats/${c.id}`),
        api.get<{ areas?: Area[] }>(`/api/accreditation/areas/${c.id}`),
      ]);
      setArchived(null);
      setArchivedDetail({ cycle: c, stats: s.stats ?? {}, areas: a.areas ?? [] });
    } catch { showToast("Failed to load cycle details", "error"); }
  }

  async function restoreCycle(c: Cycle) {
    if (!window.confirm("Restore this cycle? It will become the active cycle again.")) return;
    try {
      const active = await api.get<{ cycle?: Cycle }>("/api/accreditation/cycle/active");
      if (active.cycle) return showToast("Cannot restore: Another cycle is currently active. Archive it first.", "error");
      const d = await api.put<{ success?: boolean; error?: string }>(`/api/accreditation/cycle/${c.id}/restore`, { restored_by: ADMIN_ID });
      if (d.success) { showToast("Cycle restored successfully", "success"); setArchived(null); setArchivedDetail(null); loadActive(); }
      else showToast(d.error || "Failed to restore cycle", "error");
    } catch { showToast("Failed to restore cycle", "error"); }
  }

  async function exportArchived(c: Cycle, type: "sections" | "reviews" | "complete") {
    try {
      showToast("Generating export...", "info");
      const d = await api.get<{ sections?: Section[] }>(`/api/accreditation/sections/all/${c.id}`);
      const sections = d.sections ?? [];
      if (sections.length === 0) return showToast("No data to export", "warning");
      const wb = XLSX.utils.book_new();
      if (type === "sections" || type === "complete") {
        const rows: (string | number)[][] = [[`Sections Export - ${c.academic_year}`], [`Generated: ${new Date().toLocaleDateString()}`], [], ["Section Name", "Area", "Google Drive Link", "Submitted By", "Date Submitted", "Review Status"]];
        sections.forEach((s) => rows.push([s.section_name, `Area ${s.area_number}`, s.google_drive_link || "Not Submitted", s.area_head_name || "-", s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-", s.review_status || "Not Reviewed"]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Sections");
      }
      if (type === "reviews" || type === "complete") {
        const reviewData = sections.filter((s) => s.review_status && s.review_status !== "Not Reviewed");
        const rows: (string | number)[][] = [[`Reviews Export - ${c.academic_year}`], [`Generated: ${new Date().toLocaleDateString()}`], [], ["Section", "Area", "Status", "Reviewed By", "Date"]];
        reviewData.forEach((s) => rows.push([s.section_name, `Area ${s.area_number}`, s.review_status || "", s.reviewed_by_name || "-", s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-"]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Reviews");
      }
      XLSX.writeFile(wb, `Archived_Cycle_${c.academic_year}_${type}.xlsx`);
      showToast("Export complete", "success");
    } catch { showToast("Failed to export data", "error"); }
  }

  const total = num(stats.total_sections);
  const submitted = num(stats.submitted_count);
  const reviewed = num(stats.reviewed_count);
  const complete = num(stats.complete_count);

  return (
    <div className="llave-dashboard">
      {/* Cycle info */}
      <div className="cycle-info-card">
        <div className="cycle-header">
          <div className="cycle-details">
            <h2 className="cycle-title">{cycle ? `Academic Year ${cycle.academic_year}` : "No Active Cycle"}</h2>
            <p className="cycle-status">{cycle ? `Status: ${cycle.status}` : "Create a new cycle to begin"}</p>
          </div>
          <div className="cycle-actions">
            <button className="btn-secondary" onClick={openArchived}><i className="fas fa-archive" /> View Archived Cycles</button>
            {cycle ? (
              <button className="btn-secondary" onClick={archiveCycle}><i className="fas fa-archive" /> Archive Cycle</button>
            ) : (
              <button className="btn-primary" onClick={() => { setAcademicYear(""); setShowCreate(true); }}><i className="fas fa-plus" /> Create New Cycle</button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard cls="blue" icon="fa-list" value={total} label="Total Items" />
        <StatCard cls="green" icon="fa-link" value={submitted} label="Submitted Links" percentage={`${pct(submitted, total)}%`} />
        <StatCard cls="orange" icon="fa-eye" value={reviewed} label="Reviewed" percentage={`${pct(reviewed, total)}%`} />
        <StatCard cls="purple" icon="fa-check-circle" value={complete} label="Complete" percentage={`${pct(complete, total)}%`} />
      </div>

      {/* Submission control */}
      <div className="submission-control-card">
        <div className="control-header"><h3>Submission Control</h3></div>
        <div className="control-body">
          <div className="status-indicator">
            <span className={cx("status-badge", isOpen ? "open" : "closed")}>
              <i className={cx("fas", isOpen ? "fa-lock-open" : "fa-lock")} /> {isOpen ? "OPEN" : "CLOSED"}
            </span>
            <p className="status-text">{isOpen ? "Submissions are currently open" : "Submissions are currently closed"}</p>
          </div>
          {cycle && (
            <div className="control-actions">
              {isOpen
                ? <button className="btn-control btn-close" onClick={() => toggleSubmissions(false)}><i className="fas fa-lock" /> Close Submissions</button>
                : <button className="btn-control btn-open" onClick={() => toggleSubmissions(true)}><i className="fas fa-lock-open" /> Open Submissions</button>}
            </div>
          )}
        </div>
      </div>

      {/* Areas */}
      <div className="areas-section">
        <div className="section-header"><h3>Accreditation Areas</h3></div>
        <div className="areas-grid">
          {areas.length === 0 ? <p className="no-data">No areas to display</p> : areas.map((area) => {
            const t = num(area.total_sections), sub = num(area.submitted_sections), rev = num(area.reviewed_sections), comp = num(area.complete_sections);
            let statusClass = "status-pending", statusText = "In Progress";
            if (comp === t && t > 0) { statusClass = "status-complete"; statusText = "Complete"; }
            else if (sub === 0) { statusClass = "status-empty"; statusText = "Not Started"; }
            return (
              <div className="area-card" key={area.area_id}>
                <div className="area-header">
                  <h4 className="area-title">Area {area.area_number}: {area.area_name}</h4>
                  <span className={cx("area-status", statusClass)}>{statusText}</span>
                </div>
                <div className="area-info">
                  <div className="info-row">
                    <span className="info-label">Area Head:</span>
                    <span className="info-value">{area.area_head_name || "Not Assigned"}</span>
                    <button className="btn-icon" onClick={() => showToast("Area Head assignment is on the Management page", "info")}><i className="fas fa-edit" /></button>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Accreditors:</span>
                    <span className="info-value">{accreditors[area.area_id] ?? "Loading..."}</span>
                    <button className="btn-icon" onClick={() => showToast("Accreditor management is on the Management page", "info")}><i className="fas fa-users-cog" /></button>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Accreditation Items:</span>
                    <span className="info-value">{t}</span>
                  </div>
                </div>
                <div className="area-progress">
                  <ProgressItem label="Submissions" done={sub} total={t} />
                  <ProgressItem label="Reviews" done={rev} total={t} />
                </div>
                <button className="btn-view-details" onClick={() => viewAreaDetails(area)}><i className="fas fa-eye" /> View Details</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity */}
      <div className="activity-section">
        <div className="section-header"><h3>Recent Activity</h3></div>
        <div className="activity-feed">
          {activities.length === 0 ? <p className="no-activity">No recent activity</p> : activities.map((a, i) => (
            <div className="activity-item" key={i}>
              <div className={cx("activity-icon", a.user_role.toLowerCase().replace(/\s+/g, "-"))}><i className={cx("fas", ACTION_ICON[a.action_type] ?? "fa-circle")} /></div>
              <div className="activity-content">
                <p className="activity-text"><strong>{a.user_name}</strong> {a.action_type.toLowerCase()} <strong>{a.target_name}</strong></p>
                <p className="activity-time">{timeAgo(new Date(a.created_at))}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create cycle modal */}
      {showCreate && (
        <Modal title="Create New Accreditation Cycle" onClose={() => setShowCreate(false)}
          footer={<><button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn-primary" onClick={createCycle}>Create Cycle</button></>}>
          <div className="form-group">
            <label>Academic Year</label>
            <input type="text" placeholder="e.g., 2025-2026" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
            <small className="form-hint">Format: YYYY-YYYY (e.g., 2025-2026)</small>
          </div>
        </Modal>
      )}

      {/* Area details modal */}
      {areaDetail && (
        <Modal large title={areaDetail.name} onClose={() => setAreaDetail(null)}>
          {areaDetail.sections.length === 0 ? <p className="no-data">No sections found for this area</p> : (
            <table className="data-table">
              <thead><tr><th>Accreditation Item</th><th>Google Drive Link</th><th>Submitted By</th><th>Date</th><th>Review Status</th><th>Actions</th></tr></thead>
              <tbody>
                {areaDetail.sections.map((s, i) => (
                  <tr key={i}>
                    <td>{s.section_name}</td>
                    <td>{s.google_drive_link ? <a href={s.google_drive_link} target="_blank" rel="noreferrer" className="link-button"><i className="fas fa-external-link-alt" /> Open</a> : <span className="text-muted">Not submitted</span>}</td>
                    <td>{s.submitted_by_name || "-"}</td>
                    <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-"}</td>
                    <td>{reviewBadge(s.review_status)}</td>
                    <td>{s.comments ? <button className="btn-icon" onClick={() => showToast(s.comments!, "warning")}><i className="fas fa-comment" /></button> : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {/* Archived cycles modal */}
      {archived && (
        <Modal title="Archived Cycles" onClose={() => setArchived(null)} footer={<button className="btn-primary" onClick={() => setArchived(null)}>Close</button>}>
          <div className="archived-cycles-container">
            {archived.map((c) => (
              <div className="archived-cycle-item" key={c.id}>
                <div className="cycle-info">
                  <h4 className="cycle-name">{c.academic_year}</h4>
                  <div className="cycle-dates">
                    <span><strong>Created:</strong> {c.created_at ? new Date(c.created_at).toLocaleDateString() : "-"}</span>
                    <span><strong>Archived:</strong> {c.archived_at ? new Date(c.archived_at).toLocaleDateString() : "-"}</span>
                  </div>
                </div>
                <div className="cycle-actions">
                  <button className="btn-primary btn-sm" onClick={() => viewArchivedDetails(c)}><i className="fas fa-eye" /> View Details</button>
                  <button className="btn-secondary btn-sm" onClick={() => restoreCycle(c)}><i className="fas fa-undo" /> Restore</button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Archived cycle details modal */}
      {archivedDetail && (() => {
        const t = num(archivedDetail.stats.total_sections), sub = num(archivedDetail.stats.submitted_count), rev = num(archivedDetail.stats.reviewed_count), comp = num(archivedDetail.stats.complete_count);
        const c = archivedDetail.cycle;
        return (
          <Modal title="Archived Cycle Details" onClose={() => setArchivedDetail(null)} footer={<button className="btn-primary" onClick={() => setArchivedDetail(null)}>Close</button>}>
            <div className="archived-cycle-details">
              <div className="detail-section">
                <h4>Summary Statistics</h4>
                <div className="stats-grid-small">
                  <div className="stat-item-small"><span className="stat-label">Total Items:</span><span className="stat-value">{t}</span></div>
                  <div className="stat-item-small"><span className="stat-label">Submitted:</span><span className="stat-value">{sub} ({pct(sub, t)}%)</span></div>
                  <div className="stat-item-small"><span className="stat-label">Reviewed:</span><span className="stat-value">{rev} ({pct(rev, t)}%)</span></div>
                  <div className="stat-item-small"><span className="stat-label">Complete:</span><span className="stat-value">{comp} ({pct(comp, t)}%)</span></div>
                </div>
              </div>
              <div className="detail-section">
                <h4>Area Breakdown</h4>
                <div className="area-list-compact">
                  {archivedDetail.areas.map((a) => (
                    <div className="area-row-compact" key={a.area_id}>
                      <span className="area-name">Area {a.area_number}: {a.area_name}</span>
                      <span className="area-progress">{num(a.complete_sections)}/{num(a.total_sections)} Complete</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="detail-section">
                <h4>Export Data</h4>
                <div className="export-buttons">
                  <button className="btn-secondary" onClick={() => exportArchived(c, "sections")}><i className="fas fa-download" /> Export Accreditation Items</button>
                  <button className="btn-secondary" onClick={() => exportArchived(c, "reviews")}><i className="fas fa-download" /> Export Reviews</button>
                  <button className="btn-secondary" onClick={() => exportArchived(c, "complete")}><i className="fas fa-download" /> Complete Report</button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {toast && <div className={cx("llave-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
    </div>
  );
}

function StatCard({ cls, icon, value, label, percentage }: { cls: string; icon: string; value: number; label: string; percentage?: string }) {
  return (
    <div className="stat-card">
      <div className={cx("stat-icon", cls)}><i className={cx("fas", icon)} /></div>
      <div className="stat-info">
        <h3 className="stat-value">{value}</h3>
        <p className="stat-label">{label}</p>
        {percentage && <p className="stat-percentage">{percentage}</p>}
      </div>
    </div>
  );
}

function ProgressItem({ label, done, total }: { label: string; done: number; total: number }) {
  const p = pct(done, total);
  return (
    <div className="progress-item">
      <div className="progress-header"><span>{label}</span><span>{done}/{total} ({p}%)</span></div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${p}%` }} /></div>
    </div>
  );
}

function Modal({ title, large, onClose, footer, children }: { title: string; large?: boolean; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="modal" style={{ display: "flex" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx("modal-content", large && "modal-large")}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
