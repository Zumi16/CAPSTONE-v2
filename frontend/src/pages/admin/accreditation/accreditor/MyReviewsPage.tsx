import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { getStoredAccreditationUser } from "@/lib/adminAuth";
import "@/styles/pages/admin/accreditation-accreditor.css";
import { reviewBadge, type Review } from "./useAccreditor";

/**
 * Accreditor → My Reviews. The accreditor's own review history for the active
 * cycle (filtered from /reviews/all): summary cards, search + status + area
 * filters + sort, a comments-viewer modal and an update-review modal.
 */

type Toast = { msg: string; type: "success" | "error" };
type SortKey = "recent" | "oldest" | "section" | "area";

export function MyReviewsPage() {
  const [user] = useState(() => getStoredAccreditationUser());
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [toast, setToast] = useState<Toast | null>(null);
  const [comments, setComments] = useState<Review | null>(null);
  const [modal, setModal] = useState<{ review: Review; status: string; comments: string } | null>(null);

  const showToast = (msg: string, type: Toast["type"] = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadReviews(cid: number) {
    try {
      const d = await api.get<{ reviews?: Review[] }>(`/api/accreditation/reviews/all/${cid}`);
      setReviews((d.reviews ?? []).filter((r) => r.accreditor_id === user?.id));
    } catch { showToast("Failed to load reviews"); }
  }

  useEffect(() => {
    (async () => {
      if (!user) { setLoaded(true); return; }
      try {
        const c = await api.get<{ cycle?: { id: number } }>("/api/accreditation/cycle/active");
        if (c.cycle) { setCycleId(c.cycle.id); await loadReviews(c.cycle.id); }
      } catch { /* */ } finally { setLoaded(true); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => ({
    total: reviews.length,
    complete: reviews.filter((r) => r.review_status === "Complete").length,
    needsRevision: reviews.filter((r) => r.review_status === "Needs Revision").length,
    incomplete: reviews.filter((r) => r.review_status === "Incomplete").length,
  }), [reviews]);

  const areaOptions = useMemo(() => [...new Set(reviews.map((r) => r.area_number))].sort((a, b) => a - b), [reviews]);

  const visible = useMemo(() => {
    let list = reviews.filter((r) =>
      r.section_name.toLowerCase().includes(search.toLowerCase()) &&
      (!statusFilter || r.review_status === statusFilter) &&
      (!areaFilter || String(r.area_number) === areaFilter),
    );
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "recent": return new Date(b.reviewed_at ?? 0).getTime() - new Date(a.reviewed_at ?? 0).getTime();
        case "oldest": return new Date(a.reviewed_at ?? 0).getTime() - new Date(b.reviewed_at ?? 0).getTime();
        case "section": return a.section_name.localeCompare(b.section_name);
        case "area": return a.area_number - b.area_number;
        default: return 0;
      }
    });
    return list;
  }, [reviews, search, statusFilter, areaFilter, sortBy]);

  async function submitUpdate() {
    if (!modal || !user) return;
    if (!modal.status) return showToast("Please select a review status");
    try {
      const d = await api.post<{ success?: boolean; error?: string }>(`/api/accreditation/review/${modal.review.section_id}`, {
        review_status: modal.status, comments: modal.comments.trim(), accreditor_id: user.id,
      });
      if (d.success) { setToast({ msg: "Review updated successfully", type: "success" }); setTimeout(() => setToast(null), 3000); setModal(null); if (cycleId) loadReviews(cycleId); }
      else showToast(d.error || "Failed to update review");
    } catch { showToast("Failed to update review"); }
  }

  if (!loaded) return <div className="accreditor-page"><div className="no-data-message"><i className="fas fa-spinner fa-spin" /><h2>Loading…</h2></div></div>;
  if (!user) return <div className="accreditor-page"><div className="no-data-message"><i className="fas fa-user-slash" /><h2>Not Signed In</h2><p>Please log in as an Accreditor to view this page.</p></div></div>;

  return (
    <div className="accreditor-page">
      <div className="page-header">
        <div className="header-content"><h1 className="main-title">My Reviews</h1><p className="subtitle">Review history and submitted evaluations</p></div>
      </div>

      <div className="stats-grid">
        <StatCard icon="fa-clipboard-list" variant="total" value={summary.total} label="Total Reviewed" />
        <StatCard icon="fa-check-circle" variant="complete" value={summary.complete} label="Complete" />
        <StatCard icon="fa-exclamation-triangle" variant="pending" value={summary.needsRevision} label="Needs Revision" />
        <StatCard icon="fa-times-circle" variant="reviewed" value={summary.incomplete} label="Incomplete" />
      </div>

      <div className="search-filter-bar">
        <div className="search-box"><i className="fas fa-search" /><input type="text" placeholder="Search by section name..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option><option value="Complete">Complete</option><option value="Needs Revision">Needs Revision</option><option value="Incomplete">Incomplete</option>
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="">All Areas</option>
            {areaOptions.map((n) => <option key={n} value={n}>Area {n}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
            <option value="recent">Most Recent</option><option value="oldest">Oldest First</option><option value="section">Section Name</option><option value="area">Area Number</option>
          </select>
        </div>
      </div>

      <div className="sections-card">
        <div className="card-header"><h2 className="card-title"><i className="fas fa-history" /> Review History</h2></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Section Name</th><th>Area</th><th>Review Status</th><th>Google Drive Link</th><th>Reviewed Date</th><th>My Comments</th><th>Actions</th></tr></thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={7} className="no-data">No reviews found</td></tr>
              ) : visible.map((r) => {
                const rb = reviewBadge(r.review_status);
                return (
                  <tr key={r.section_id}>
                    <td><strong>{r.section_name}</strong></td>
                    <td>Area {r.area_number}</td>
                    <td><span className={cx("badge", rb.cls)}>{rb.icon && <i className={cx("fas", rb.icon)} />} {rb.label}</span></td>
                    <td>{r.google_drive_link ? <a href={r.google_drive_link} target="_blank" rel="noreferrer" className="link-preview"><i className="fas fa-external-link-alt" /> Open Folder</a> : <span className="no-link">No link</span>}</td>
                    <td>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "-"}</td>
                    <td>{r.comments ? <button className="btn-icon" title="View Full Comments" onClick={() => setComments(r)}><i className="fas fa-comment-dots" /></button> : <span className="text-muted">No comments</span>}</td>
                    <td className="action-buttons"><button className="btn-primary btn-sm" onClick={() => setModal({ review: r, status: r.review_status ?? "", comments: r.comments ?? "" })}><i className="fas fa-edit" /> Update</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {comments && (
        <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) setComments(null); }}>
          <div className="modal-content">
            <div className="modal-header"><h3>Review Comments</h3><button className="modal-close" onClick={() => setComments(null)}><i className="fas fa-times" /></button></div>
            <div className="modal-body">
              <div className="review-info-box">
                <div className="review-info-item"><strong>Section:</strong><span>{comments.section_name}</span></div>
                <div className="review-info-item"><strong>Status:</strong><span>{reviewBadge(comments.review_status).label}</span></div>
                <div className="review-info-item"><strong>Reviewed:</strong><span>{comments.reviewed_at ? new Date(comments.reviewed_at).toLocaleString() : "Unknown"}</span></div>
              </div>
              <div className="comments-display"><label><strong>Comments:</strong></label>
                <div style={{ marginTop: 10, padding: 15, background: "#f8fafc", borderRadius: 8, whiteSpace: "pre-wrap", color: "#475569", lineHeight: 1.6 }}>{comments.comments || "No comments provided"}</div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-secondary" onClick={() => setComments(null)}>Close</button></div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-content modal-large">
            <div className="modal-header"><h3>Update Review: {modal.review.section_name}</h3><button className="modal-close" onClick={() => setModal(null)}><i className="fas fa-times" /></button></div>
            <div className="modal-body">
              <div className="review-info-box">
                <div className="review-info-item"><strong>Section:</strong><span>{modal.review.section_name}</span></div>
                <div className="review-info-item"><strong>Area:</strong><span>Area {modal.review.area_number}{modal.review.area_name ? `: ${modal.review.area_name}` : ""}</span></div>
              </div>
              <div className="form-group">
                <label><i className="fas fa-external-link-alt" /> Google Drive Link</label>
                <div className="link-display-box"><a href={modal.review.google_drive_link || "#"} target="_blank" rel="noreferrer" className="drive-link-display"><i className="fas fa-folder" /> Open Google Drive Folder</a></div>
              </div>
              <div className="form-group">
                <label>Review Status *</label>
                <select value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                  <option value="">Select Status</option><option value="Complete">✓ Complete</option><option value="Needs Revision">⚠ Needs Revision</option><option value="Incomplete">✗ Incomplete</option>
                </select>
              </div>
              <div className="form-group">
                <label>Comments / Feedback</label>
                <textarea rows={5} placeholder="Update your review comments..." value={modal.comments} onChange={(e) => setModal({ ...modal, comments: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={submitUpdate}><i className="fas fa-save" /> Update Review</button>
            </div>
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
