import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/accreditation-areahead.css";
import { reviewBadge, useAreaHead, type Section } from "./useAreaHead";

/**
 * Area Head → Dashboard. The area head submits one Google Drive folder link per
 * section in their assigned area while submissions are open; the table shows
 * link + submission + review status and locks when AdminLlave closes the cycle.
 * Refreshes sections + submission control every 30s.
 *
 * Endpoints: /cycle/active, /areas/:cycle, /submission-control/:cycle,
 * /sections/:cycle/:area, /submission/:section (POST/PUT/DELETE).
 */

type Toast = { msg: string; type: "success" | "error" | "info" | "warning" };

export function DashboardPage() {
  const { user, cycle, area, state } = useAreaHead();
  const [sections, setSections] = useState<Section[]>([]);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  // Link modal
  const [modal, setModal] = useState<{ sectionId: number; sectionName: string; link: string; editing: boolean } | null>(null);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadSections = useCallback(async () => {
    if (!cycle || !area) return;
    try {
      const d = await api.get<{ sections?: Section[] }>(`/api/accreditation/sections/${cycle.id}/${area.area_id}`);
      setSections(d.sections ?? []);
    } catch { showToast("Failed to load sections", "error"); }
  }, [cycle, area, showToast]);

  const loadControl = useCallback(async () => {
    if (!cycle) return;
    try {
      const d = await api.get<{ control?: { is_open: boolean } }>(`/api/accreditation/submission-control/${cycle.id}`);
      if (d.control) setIsOpen(d.control.is_open);
    } catch { /* */ }
  }, [cycle]);

  useEffect(() => {
    if (state === "ready") { loadSections(); loadControl(); }
  }, [state, loadSections, loadControl]);

  // 30s auto-refresh.
  useEffect(() => {
    if (state !== "ready") return;
    const id = setInterval(() => { loadSections(); loadControl(); }, 30000);
    return () => clearInterval(id);
  }, [state, loadSections, loadControl]);

  const stats = useMemo(() => {
    const total = sections.length;
    const submitted = sections.filter((s) => s.google_drive_link).length;
    const reviewed = sections.filter((s) => s.review_status && s.review_status !== "Not Reviewed").length;
    return { total, submitted, pending: total - submitted, reviewed };
  }, [sections]);

  const filtered = useMemo(() => {
    let list = sections;
    if (search) list = list.filter((s) => s.section_name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter === "submitted") list = list.filter((s) => s.google_drive_link);
    else if (statusFilter === "not_submitted") list = list.filter((s) => !s.google_drive_link);
    else if (statusFilter === "reviewed") list = list.filter((s) => s.review_status && s.review_status !== "Not Reviewed");
    return list;
  }, [sections, search, statusFilter]);

  function openAdd(section: Section) {
    if (!isOpen) return showToast("Submissions are currently closed", "warning");
    setModal({ sectionId: section.section_id, sectionName: section.section_name, link: "", editing: false });
  }
  function openEdit(section: Section) {
    if (!isOpen) return showToast("Submissions are currently closed", "warning");
    setModal({ sectionId: section.section_id, sectionName: section.section_name, link: section.google_drive_link ?? "", editing: true });
  }

  async function submitLink() {
    if (!modal || !user) return;
    const link = modal.link.trim();
    if (!link) return showToast("Please enter a Google Drive link", "error");
    if (!link.includes("drive.google.com")) return showToast("Please enter a valid Google Drive link", "error");
    try {
      const d = await api[modal.editing ? "put" : "post"]<{ success?: boolean; error?: string }>(
        `/api/accreditation/submission/${modal.sectionId}`,
        { google_drive_link: link, submitted_by: user.id },
      );
      if (d.success) {
        showToast(modal.editing ? "Link updated successfully" : "Link submitted successfully", "success");
        setModal(null);
        loadSections();
      } else {
        showToast(d.error || "Failed to save link", "error");
      }
    } catch { showToast("Failed to save link", "error"); }
  }

  async function removeLink(sectionId: number) {
    if (!isOpen) return showToast("Submissions are currently closed", "warning");
    if (!window.confirm("Are you sure you want to remove this link?")) return;
    try {
      const d = await api.delete<{ success?: boolean; error?: string }>(`/api/accreditation/submission/${sectionId}`);
      if (d.success) { showToast("Link removed successfully", "success"); loadSections(); }
      else showToast(d.error || "Failed to remove link", "error");
    } catch { showToast("Failed to remove link", "error"); }
  }

  if (state === "loading") return <div className="areahead-page"><div className="no-data-message"><i className="fas fa-spinner fa-spin" /><h2>Loading…</h2></div></div>;
  if (state === "no-cycle") return <Placeholder icon="fa-exclamation-circle" title="No Active Accreditation Cycle" text="There is currently no active accreditation cycle. Please wait for AdminLlave to create a new cycle." />;
  if (state === "no-area") return <Placeholder icon="fa-user-slash" title="No Area Assignment" text="You have not been assigned to any area yet. Please contact AdminLlave for area assignment." />;
  if (state === "no-user") return <Placeholder icon="fa-user-slash" title="Not Signed In" text="Please log in as an Area Head to view this page." />;

  return (
    <div className="areahead-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="main-title">Area {area!.area_number}: {area!.area_name}</h1>
          <p className="subtitle">Academic Year {cycle!.academic_year}</p>
        </div>
        <div className={cx("submission-status-badge", isOpen == null ? "unknown" : isOpen ? "open" : "closed")}>
          {isOpen == null ? <><i className="fas fa-question-circle" /> Unknown</> : isOpen ? <><i className="fas fa-lock-open" /> Submissions Open</> : <><i className="fas fa-lock" /> Submissions Closed</>}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="fa-list" variant="total" value={stats.total} label="Total Sections" />
        <StatCard icon="fa-check-circle" variant="submitted" value={stats.submitted} label="Submitted Links" />
        <StatCard icon="fa-clock" variant="pending" value={stats.pending} label="Pending Links" />
        <StatCard icon="fa-clipboard-check" variant="reviewed" value={stats.reviewed} label="Reviewed" />
      </div>

      <div className="info-card">
        <div className="info-header"><i className="fas fa-info-circle" /><h3>Submission Instructions</h3></div>
        <div className="info-content">
          <p>Welcome! You are responsible for submitting Google Drive folder links for all sections in your area.</p>
          <ul className="instruction-list">
            <li><i className="fas fa-check" /> Click "Add Link" to submit a Google Drive folder URL for each section</li>
            <li><i className="fas fa-check" /> Ensure the folder is shared with appropriate permissions</li>
            <li><i className="fas fa-check" /> You can edit links while submissions are open</li>
            <li><i className="fas fa-check" /> Links will be locked when AdminLlave closes submissions</li>
          </ul>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-box">
          <i className="fas fa-search" />
          <input type="text" placeholder="Search sections..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="not_submitted">Not Submitted</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>
      </div>

      <div className="sections-card">
        <div className="card-header"><h2 className="card-title"><i className="fas fa-folder" /> Section Links</h2></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Section Name</th><th>Google Drive Link</th><th>Status</th><th>Date Submitted</th><th>Review Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="no-data">No sections found</td></tr>
              ) : filtered.map((s) => {
                const hasLink = !!s.google_drive_link;
                const locked = s.is_locked || !isOpen;
                const rb = reviewBadge(s.review_status);
                return (
                  <tr key={s.section_id}>
                    <td><strong>{s.section_name}</strong></td>
                    <td>{hasLink ? <a href={s.google_drive_link} target="_blank" rel="noreferrer" className="link-preview"><i className="fas fa-external-link-alt" /> Open Folder</a> : <span className="no-link">No link submitted</span>}</td>
                    <td>{hasLink ? <span className="badge badge-green"><i className="fas fa-check" /> Submitted</span> : <span className="badge badge-gray"><i className="fas fa-times" /> Not Submitted</span>}</td>
                    <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "-"}</td>
                    <td><span className={cx("badge", rb.cls)}>{rb.icon && <i className={cx("fas", rb.icon)} />} {rb.label}</span></td>
                    <td className="action-buttons">
                      {locked ? (
                        <span className="text-muted"><i className="fas fa-lock" /> Locked</span>
                      ) : hasLink ? (
                        <>
                          <button className="btn-icon" title="Edit Link" onClick={() => openEdit(s)}><i className="fas fa-edit" /></button>
                          <button className="btn-icon btn-danger" title="Remove Link" onClick={() => removeLink(s.section_id)}><i className="fas fa-trash" /></button>
                        </>
                      ) : (
                        <button className="btn-primary btn-sm" onClick={() => openAdd(s)}><i className="fas fa-plus" /> Add Link</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{modal.editing ? "Edit Google Drive Link" : "Add Google Drive Link"}</h3>
              <button className="modal-close" onClick={() => setModal(null)}><i className="fas fa-times" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Section Name</label>
                <input type="text" value={modal.sectionName} disabled />
              </div>
              <div className="form-group">
                <label>Google Drive Folder URL *</label>
                <input type="url" placeholder="https://drive.google.com/drive/folders/..." value={modal.link} onChange={(e) => setModal({ ...modal, link: e.target.value })} />
                <small className="form-hint">Paste the full Google Drive folder link here</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={submitLink}><i className="fas fa-save" /> Save Link</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={cx("ah-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
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

function Placeholder({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="areahead-page">
      <div className="no-data-message"><i className={cx("fas", icon)} /><h2>{title}</h2><p>{text}</p></div>
    </div>
  );
}
