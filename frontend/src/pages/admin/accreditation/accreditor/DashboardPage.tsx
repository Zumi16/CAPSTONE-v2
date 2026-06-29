import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/accreditation-accreditor.css";
import { reviewBadge, useAccreditor, type Section } from "./useAccreditor";

/**
 * Accreditor → Dashboard. Aggregates the sections across every area assigned to
 * this accreditor and lets them review each one (open the Drive folder, set a
 * status + comments). Stats count the accreditor's own reviews. Refreshes
 * sections every 30s.
 *
 * Endpoints: /sections/:cycle/:area (per area), /review/:section (POST).
 */

type Toast = { msg: string; type: "success" | "error" | "info" | "warning" };
type ReviewModal = { section: Section; status: string; comments: string };

export function DashboardPage() {
  const { user, cycle, areas, state } = useAccreditor();
  const [sections, setSections] = useState<Section[]>([]);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [linkFilter, setLinkFilter] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [modal, setModal] = useState<ReviewModal | null>(null);
  const [comments, setComments] = useState<string | null>(null);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadSections = useCallback(async () => {
    if (!cycle || areas.length === 0) return;
    try {
      const results = await Promise.all(areas.map(async (area) => {
        const d = await api.get<{ sections?: Section[] }>(`/api/accreditation/sections/${cycle.id}/${area.area_id}`);
        return (d.sections ?? []).map((s) => ({ ...s, area_number: area.area_number, area_name: area.area_name }));
      }));
      setSections(results.flat());
    } catch { showToast("Failed to load sections", "error"); }
  }, [cycle, areas, showToast]);

  useEffect(() => { if (state === "ready") loadSections(); }, [state, loadSections]);
  useEffect(() => {
    if (state !== "ready") return;
    const id = setInterval(loadSections, 30000);
    return () => clearInterval(id);
  }, [state, loadSections]);

  const stats = useMemo(() => {
    const total = sections.length;
    const reviewed = sections.filter((s) => s.review_status && s.review_status !== "Not Reviewed" && s.accreditor_id === user?.id).length;
    const complete = sections.filter((s) => s.review_status === "Complete" && s.accreditor_id === user?.id).length;
    return { total, reviewed, pending: total - reviewed, complete };
  }, [sections, user]);

  const filtered = useMemo(() => {
    let list = sections;
    if (search) list = list.filter((s) => s.section_name.toLowerCase().includes(search.toLowerCase()));
    if (areaFilter) list = list.filter((s) => String(s.area_number) === areaFilter);
    if (statusFilter === "not_reviewed") list = list.filter((s) => !s.review_status || s.review_status === "Not Reviewed");
    else if (statusFilter === "complete") list = list.filter((s) => s.review_status === "Complete");
    else if (statusFilter === "needs_revision") list = list.filter((s) => s.review_status === "Needs Revision");
    else if (statusFilter === "incomplete") list = list.filter((s) => s.review_status === "Incomplete");
    if (linkFilter === "submitted") list = list.filter((s) => s.google_drive_link);
    else if (linkFilter === "not_submitted") list = list.filter((s) => !s.google_drive_link);
    return list;
  }, [sections, search, areaFilter, statusFilter, linkFilter]);

  function openReview(section: Section) {
    if (!section.google_drive_link) return showToast("No Google Drive link available to review", "warning");
    setModal({ section, status: section.review_status && section.review_status !== "Not Reviewed" ? section.review_status : "", comments: section.comments ?? "" });
  }

  async function submitReview() {
    if (!modal || !user) return;
    if (!modal.status) return showToast("Please select a review status", "error");
    if ((modal.status === "Needs Revision" || modal.status === "Incomplete") && !modal.comments.trim()) {
      if (!window.confirm(`You selected "${modal.status}" but did not add comments. Continue anyway?`)) return;
    }
    try {
      const d = await api.post<{ success?: boolean; error?: string }>(`/api/accreditation/review/${modal.section.section_id}`, {
        review_status: modal.status, comments: modal.comments.trim(), accreditor_id: user.id,
      });
      if (d.success) { showToast("Review submitted successfully", "success"); setModal(null); loadSections(); }
      else showToast(d.error || "Failed to submit review", "error");
    } catch { showToast("Failed to submit review", "error"); }
  }

  if (state === "loading") return <Placeholder spinner title="Loading…" />;
  if (state === "no-cycle") return <Placeholder icon="fa-exclamation-circle" title="No Active Accreditation Cycle" text="There is currently no active accreditation cycle. Please wait for the accreditation period to begin." />;
  if (state === "no-area") return <Placeholder icon="fa-user-slash" title="No Area Assignment" text="You have not been assigned to any areas yet. Please contact AdminLlave for area assignment." />;
  if (state === "no-user") return <Placeholder icon="fa-user-slash" title="Not Signed In" text="Please log in as an Accreditor to view this page." />;

  return (
    <div className="accreditor-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="main-title">Accreditor Dashboard</h1>
          <p className="subtitle">Academic Year {cycle!.academic_year}</p>
        </div>
        <div className="assigned-areas-badge"><i className="fas fa-layer-group" /> Assigned to {areas.length} area{areas.length > 1 ? "s" : ""}</div>
      </div>

      <div className="assigned-areas-section">
        <h2 className="section-title"><i className="fas fa-clipboard-list" /> Your Assigned Areas</h2>
        <div className="areas-grid">
          {areas.map((area) => (
            <div className="area-card-compact" key={area.area_id}>
              <div className="area-header-compact"><div className="area-number">Area {area.area_number}</div><div className="area-sections">{area.total_sections} sections</div></div>
              <div className="area-name-compact">{area.area_name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="fa-list" variant="total" value={stats.total} label="Total Sections" />
        <StatCard icon="fa-check-circle" variant="reviewed" value={stats.reviewed} label="Reviewed" />
        <StatCard icon="fa-clock" variant="pending" value={stats.pending} label="Pending Review" />
        <StatCard icon="fa-star" variant="complete" value={stats.complete} label="Complete" />
      </div>

      <div className="info-card">
        <div className="info-header"><i className="fas fa-info-circle" /><h3>Review Instructions</h3></div>
        <div className="info-content">
          <p>As an Accreditor, you are responsible for reviewing and evaluating section documentation.</p>
          <ul className="instruction-list">
            <li><i className="fas fa-check" /> Click "Open Folder" to access the Google Drive documents</li>
            <li><i className="fas fa-check" /> Review all documents thoroughly</li>
            <li><i className="fas fa-check" /> Select appropriate review status for each section</li>
            <li><i className="fas fa-check" /> Provide clear comments if revisions are needed</li>
          </ul>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-box"><i className="fas fa-search" /><input type="text" placeholder="Search sections..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="filter-group">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="">All Areas</option>
            {areas.map((a) => <option key={a.area_id} value={a.area_number}>Area {a.area_number}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option><option value="not_reviewed">Not Reviewed</option><option value="complete">Complete</option><option value="needs_revision">Needs Revision</option><option value="incomplete">Incomplete</option>
          </select>
          <select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)}>
            <option value="">All Submissions</option><option value="submitted">Has Link</option><option value="not_submitted">No Link</option>
          </select>
        </div>
      </div>

      <div className="sections-card">
        <div className="card-header"><h2 className="card-title"><i className="fas fa-clipboard-check" /> Section Reviews</h2></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Section Name</th><th>Area</th><th>Google Drive Link</th><th>Submitted Date</th><th>Review Status</th><th>My Comments</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="no-data">No sections found</td></tr>
              ) : filtered.map((s) => {
                const hasLink = !!s.google_drive_link;
                const rb = reviewBadge(s.review_status || "Not Reviewed");
                const mine = s.accreditor_id === user?.id;
                return (
                  <tr key={s.section_id}>
                    <td><strong>{s.section_name}</strong></td>
                    <td>Area {s.area_number}</td>
                    <td>{hasLink ? <a href={s.google_drive_link} target="_blank" rel="noreferrer" className="link-preview"><i className="fas fa-external-link-alt" /> Open Folder</a> : <span className="no-link">No link submitted</span>}</td>
                    <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-"}</td>
                    <td><span className={cx("badge", rb.cls)}>{rb.icon && <i className={cx("fas", rb.icon)} />} {rb.label}</span></td>
                    <td>{s.comments && mine ? <button className="btn-icon" title="View Comments" onClick={() => setComments(s.comments!)}><i className="fas fa-comment" /></button> : "-"}</td>
                    <td className="action-buttons">
                      {hasLink ? (
                        <button className="btn-primary btn-sm" onClick={() => openReview(s)}><i className="fas fa-clipboard-check" /> {(!s.review_status || s.review_status === "Not Reviewed") ? "Review" : "Update Review"}</button>
                      ) : <span className="text-muted">Awaiting submission</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h3>Review: {modal.section.section_name}</h3>
              <button className="modal-close" onClick={() => setModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <div className="review-info-box">
                <div className="review-info-item"><strong>Section:</strong><span>{modal.section.section_name}</span></div>
                <div className="review-info-item"><strong>Area:</strong><span>Area {modal.section.area_number}: {modal.section.area_name}</span></div>
                <div className="review-info-item"><strong>Submitted:</strong><span>{modal.section.submitted_at ? new Date(modal.section.submitted_at).toLocaleString() : "Not available"}</span></div>
              </div>
              <div className="form-group">
                <label><i className="fas fa-external-link-alt" /> Google Drive Link</label>
                <div className="link-display-box"><a href={modal.section.google_drive_link} target="_blank" rel="noreferrer" className="drive-link-display"><i className="fas fa-folder" /> Open Google Drive Folder</a></div>
                <small className="form-hint">Click to open and review documents in Google Drive</small>
              </div>
              <div className="form-group">
                <label>Review Status *</label>
                <select value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                  <option value="">Select Status</option>
                  <option value="Complete">✓ Complete - All documents present and acceptable</option>
                  <option value="Needs Revision">⚠ Needs Revision - Documents need corrections</option>
                  <option value="Incomplete">✗ Incomplete - Missing required documents</option>
                </select>
              </div>
              <div className="form-group">
                <label>Comments / Feedback</label>
                <textarea rows={5} placeholder="Add your review comments here..." value={modal.comments} onChange={(e) => setModal({ ...modal, comments: e.target.value })} />
                <small className="form-hint">Provide detailed feedback, especially for revisions or incomplete status</small>
              </div>
              {modal.section.review_status && modal.section.review_status !== "Not Reviewed" && (
                <div className="review-history">
                  <h4><i className="fas fa-history" /> Previous Review</h4>
                  <div className="history-content">
                    <div className="history-item"><strong>Status:</strong> <span>{modal.section.review_status}</span></div>
                    <div className="history-item"><strong>Date:</strong> <span>{modal.section.reviewed_at ? new Date(modal.section.reviewed_at).toLocaleString() : "Unknown"}</span></div>
                    <div className="history-item"><strong>Comments:</strong> <p>{modal.section.comments || "No comments"}</p></div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={submitReview}><i className="fas fa-check" /> Submit Review</button>
            </div>
          </div>
        </div>
      )}

      {comments && (
        <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) setComments(null); }}>
          <div className="modal-content">
            <div className="modal-header"><h3>My Comments</h3><button className="modal-close" onClick={() => setComments(null)}><i className="fas fa-times" /></button></div>
            <div className="modal-body"><div className="comments-display"><div style={{ padding: 15, background: "#f8fafc", borderRadius: 8, whiteSpace: "pre-wrap", color: "#475569", lineHeight: 1.6 }}>{comments}</div></div></div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setComments(null)}>Close</button></div>
          </div>
        </div>
      )}

      {toast && <div className={cx("acc-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
    </div>
  );
}

function StatCard({ icon, variant, value, label }: { icon: string; variant: string; value: number; label: string }) {
  return (
    <div className="stat-card">
      <div className={cx("stat-icon", variant)}><i className={cx("fas", icon)} /></div>
      <div className="stat-content"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
    </div>
  );
}

function Placeholder({ icon, title, text, spinner }: { icon?: string; title: string; text?: string; spinner?: boolean }) {
  return (
    <div className="accreditor-page">
      <div className="no-data-message"><i className={spinner ? "fas fa-spinner fa-spin" : cx("fas", icon)} /><h2>{title}</h2>{text && <p>{text}</p>}</div>
    </div>
  );
}
