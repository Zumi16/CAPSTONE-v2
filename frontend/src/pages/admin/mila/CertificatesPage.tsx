import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/certificates.css";

/**
 * adminMila → Digital Certificates (request management).
 *
 * Migration of the legacy certificates.js + the inline e-signature script.
 * Stats cards, a collapsible E-Signature manager, status/type/search filters,
 * a requests table with the pending→generated→printed→released workflow, a
 * request-details modal, and a printable certificate preview with three
 * templates (No ID / Recommendation – Scholarship / Recommendation – Abroad).
 *
 * Endpoints (`/api/certificate-requests/admin`):
 *   GET    /stats
 *   GET    /requests?status&certificateType&search
 *   GET    /request/:id            -> { request, activityLogs }
 *   POST   /generate/:id           { adminId, adminName }
 *   POST   /print/:id              { adminId, adminName }
 *   POST   /release/:id            { adminId, adminName, remarks }
 *   DELETE /delete/:id
 *   GET    /signature/:adminId
 *   POST   /signature/upload       (FormData)
 *   DELETE /signature/:adminId
 */

type Status = "pending" | "generated" | "printed" | "released";

type CertRequest = {
  id: number;
  request_number: string;
  full_name: string;
  student_number: string;
  certificate_type: string;
  course: string;
  year_level: string;
  section?: string;
  campus?: string;
  contact_email?: string;
  contact_number?: string;
  reason: string;
  admin_remarks?: string;
  certificate_issued_date?: string;
  created_at: string;
  status: Status;
};
type ActivityLog = { action: string; performed_by: string; remarks?: string; created_at: string };
type Stats = { pending_count: number; generated_count: number; printed_count: number; released_count: number };

type AdminData = { id: number | null; adminid: string };
function getAdminData(): AdminData {
  const raw = localStorage.getItem("adminData");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { id: parsed.id ?? null, adminid: parsed.adminid ?? "Unknown" };
    } catch {
      /* ignore */
    }
  }
  return { id: null, adminid: localStorage.getItem("adminid") || "Unknown" };
}

const CERT_TYPES: Record<string, string> = {
  no_id: "Certificate of No ID",
  clearance: "Clearance from Admin",
  gres_form: "GRES Form",
  no_pending_obligation: "Certificate of No Pending Obligation",
};
const STATUS_ICON: Record<Status, string> = {
  pending: "clock",
  generated: "file-circle-check",
  printed: "print",
  released: "check-double",
};
const COURSE_NAMES: Record<string, string> = {
  BSIT: "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY",
  BSCE: "BACHELOR OF SCIENCE IN COMPUTER ENGINEERING",
  BSOA: "BACHELOR OF SCIENCE IN OFFICE ADMINISTRATION",
  BSHM: "BACHELOR OF SCIENCE IN HOSPITALITY MANAGEMENT",
};

const fmtType = (t: string) => CERT_TYPES[t] || t;
const fmtDate = (d?: string | Date) =>
  !d ? "N/A" : new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const fmtDateTime = (d?: string) =>
  !d ? "N/A" : new Date(d).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_TABS: ("all" | Status)[] = ["all", "pending", "generated", "printed", "released"];

export function CertificatesPage() {
  const admin = getAdminData();

  const [stats, setStats] = useState<Stats>({ pending_count: 0, generated_count: 0, printed_count: 0, released_count: 0 });
  const [requests, setRequests] = useState<CertRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState<{ request: CertRequest; logs: ActivityLog[] } | null>(null);
  const [preview, setPreview] = useState<CertRequest | null>(null);
  const [sigOpen, setSigOpen] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get<{ success?: boolean; stats?: Stats }>("/api/certificate-requests/admin/stats");
      if (data.success && data.stats) setStats(data.stats);
    } catch {
      /* ignore */
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: statusFilter, certificateType: typeFilter, search });
      const data = await api.get<{ success?: boolean; requests?: CertRequest[] }>(
        `/api/certificate-requests/admin/requests?${params.toString()}`,
      );
      if (data.success) setRequests(data.requests ?? []);
    } catch {
      window.alert("Failed to load requests");
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Debounce request reloads (covers the search box).
  useEffect(() => {
    const id = setTimeout(loadRequests, 300);
    return () => clearTimeout(id);
  }, [loadRequests]);

  async function refresh() {
    await Promise.all([loadStats(), loadRequests()]);
  }

  async function openDetails(id: number) {
    try {
      const data = await api.get<{ success?: boolean; request?: CertRequest; activityLogs?: ActivityLog[] }>(
        `/api/certificate-requests/admin/request/${id}`,
      );
      if (data.success && data.request) setDetail({ request: data.request, logs: data.activityLogs ?? [] });
    } catch {
      window.alert("Failed to load request details");
    }
  }

  async function generate(id: number) {
    if (!window.confirm("Generate certificate for this request?")) return;
    try {
      const data = await api.post<{ success?: boolean; message?: string }>(`/api/certificate-requests/admin/generate/${id}`, {
        adminId: admin.id, adminName: admin.adminid,
      });
      if (data.success) { setDetail(null); refresh(); }
      else window.alert(data.message || "Failed to generate certificate");
    } catch {
      window.alert("Failed to generate certificate");
    }
  }

  async function openPreview(id: number) {
    try {
      const data = await api.get<{ success?: boolean; request?: CertRequest }>(`/api/certificate-requests/admin/request/${id}`);
      if (data.success && data.request) { setDetail(null); setPreview(data.request); }
    } catch {
      window.alert("Failed to load certificate preview");
    }
  }

  async function markPrinted(id: number) {
    try {
      const data = await api.post<{ success?: boolean; message?: string }>(`/api/certificate-requests/admin/print/${id}`, {
        adminId: admin.id, adminName: admin.adminid,
      });
      if (data.success) { setPreview(null); refresh(); }
      else window.alert(data.message || "Failed to mark as printed");
    } catch {
      window.alert("Failed to mark as printed");
    }
  }

  async function release(id: number) {
    const remarks = window.prompt("Enter any remarks about the certificate release (optional):", "Certificate released to student");
    if (remarks === null) return;
    try {
      const data = await api.post<{ success?: boolean; message?: string }>(`/api/certificate-requests/admin/release/${id}`, {
        adminId: admin.id, adminName: admin.adminid, remarks: remarks || "Certificate released to student",
      });
      if (data.success) { setDetail(null); refresh(); }
      else window.alert(data.message || "Failed to mark as released");
    } catch {
      window.alert("Failed to mark as released");
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Are you sure you want to delete this certificate request? This action cannot be undone.")) return;
    try {
      const data = await api.delete<{ success?: boolean; message?: string }>(`/api/certificate-requests/admin/delete/${id}`);
      if (data.success) { setDetail(null); refresh(); }
      else window.alert(data.message || "Failed to delete request");
    } catch {
      window.alert("Failed to delete request");
    }
  }

  const statBadge = (s: Status) => (
    <span className={cx("status-badge", s)}><i className={cx("fa-solid", `fa-${STATUS_ICON[s]}`)} /> {s}</span>
  );

  function actionButton(req: CertRequest) {
    switch (req.status) {
      case "pending":
        return <button className="btn-action btn-generate" onClick={() => generate(req.id)}><i className="fa-solid fa-file-circle-plus" /> Generate</button>;
      case "generated":
        return <button className="btn-action btn-print" onClick={() => openPreview(req.id)}><i className="fa-solid fa-print" /> Print</button>;
      case "printed":
        return <button className="btn-action btn-success" onClick={() => release(req.id)}><i className="fa-solid fa-check-double" /> Release</button>;
      case "released":
        return <span className="status-badge released" style={{ padding: "8px 14px" }}><i className="fa-solid fa-check-circle" /> Completed</span>;
    }
  }

  const STAT_CARDS = [
    { key: "pending_count", cls: "pending", icon: "fa-clock", label: "Pending Requests" },
    { key: "generated_count", cls: "generated", icon: "fa-file-circle-check", label: "Generated" },
    { key: "printed_count", cls: "printed", icon: "fa-print", label: "Printed" },
    { key: "released_count", cls: "released", icon: "fa-check-double", label: "Released" },
  ] as const;

  return (
    <div className="certificates-page">
      {/* E-Signature management */}
      <div className="signature-management-section">
        <div className="sig-head">
          <h3><i className="fa-solid fa-signature" /> E-Signature Management</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setSigOpen((o) => !o)}>
            <i className={cx("fa-solid", sigOpen ? "fa-chevron-up" : "fa-chevron-down")} /> {sigOpen ? "Collapse" : "Expand"}
          </button>
        </div>
        {sigOpen && <SignatureManager adminId={admin.id} />}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {STAT_CARDS.map((c) => (
          <div className={cx("stat-card", c.cls)} key={c.key}>
            <div className="stat-icon"><i className={cx("fa-solid", c.icon)} /></div>
            <div className="stat-info">
              <h3>{stats[c.key]}</h3>
              <p>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-tabs">
            {STATUS_TABS.map((s) => (
              <button key={s} className={cx("filter-tab", statusFilter === s && "active")} onClick={() => setStatusFilter(s)}>
                <i className={cx("fa-solid", s === "all" ? "fa-list" : `fa-${STATUS_ICON[s as Status]}`)} /> {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="filter-controls">
            <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Certificate Types</option>
              {Object.entries(CERT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className="search-box">
              <i className="fa-solid fa-search" />
              <input type="text" placeholder="Search by name or student number..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="requests-container">
        <div className="requests-table-wrapper">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request #</th><th>Student Name</th><th>Student Number</th><th>Certificate Type</th>
                <th>Course</th><th>Date Submitted</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr className="no-data">
                  <td colSpan={8}>
                    <div className="empty-state"><i className="fa-solid fa-certificate" /><p>No certificate requests found</p></div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td><strong>{req.request_number}</strong></td>
                    <td>{req.full_name}</td>
                    <td>{req.student_number}</td>
                    <td className="cert-type">{fmtType(req.certificate_type)}</td>
                    <td>{req.course} {req.year_level}</td>
                    <td>{fmtDate(req.created_at)}</td>
                    <td>{statBadge(req.status)}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-action btn-view" onClick={() => openDetails(req.id)}><i className="fa-solid fa-eye" /> View</button>
                        {actionButton(req)}
                        <button className="btn-action btn-delete" onClick={() => remove(req.id)}><i className="fa-solid fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details modal */}
      {detail && (
        <div className="modal show" onClick={() => setDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Certificate Request Details</h2>
              <button className="close-modal" onClick={() => setDetail(null)}><i className="fa-solid fa-times" /></button>
            </div>
            <div className="modal-body">
              <DetailGrid request={detail.request} statBadge={statBadge} />
              {detail.logs.length > 0 && (
                <div className="activity-logs">
                  <h3><i className="fa-solid fa-clock-rotate-left" /> Activity Logs</h3>
                  {detail.logs.map((log, i) => (
                    <div className="log-item" key={i}>
                      <div className="log-action">{log.action.toUpperCase()}</div>
                      <div className="log-details">By: {log.performed_by}{log.remarks ? ` - ${log.remarks}` : ""}</div>
                      <div className="log-time">{fmtDateTime(log.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-actions">
                {detail.request.status === "pending" && (
                  <button className="btn btn-primary" onClick={() => generate(detail.request.id)}><i className="fa-solid fa-file-circle-plus" /> Generate Certificate</button>
                )}
                {(detail.request.status === "generated" || detail.request.status === "printed" || detail.request.status === "released") && (
                  <button className="btn btn-primary" onClick={() => openPreview(detail.request.id)}><i className="fa-solid fa-eye" /> View Certificate</button>
                )}
                {detail.request.status === "printed" && (
                  <button className="btn btn-success" onClick={() => release(detail.request.id)}><i className="fa-solid fa-check-double" /> Mark as Released</button>
                )}
                <button className="btn btn-danger" onClick={() => remove(detail.request.id)}><i className="fa-solid fa-trash" /> Delete Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate preview modal */}
      {preview && (
        <div className="modal show" onClick={() => setPreview(null)}>
          <div className="modal-content certificate-preview" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Certificate Preview</h2>
              <button className="close-modal" onClick={() => setPreview(null)}><i className="fa-solid fa-times" /></button>
            </div>
            <div className="modal-body">
              <div className="certificate-template" dangerouslySetInnerHTML={{ __html: buildCertificateHtml(preview) }} />
              <div className="certificate-actions">
                <button className="btn btn-primary" onClick={() => window.print()}><i className="fa-solid fa-print" /> Print Certificate</button>
                {preview.status === "generated" && (
                  <button className="btn btn-success" onClick={() => markPrinted(preview.id)}><i className="fa-solid fa-check" /> Mark as Printed</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailGrid({ request, statBadge }: { request: CertRequest; statBadge: (s: Status) => React.ReactNode }) {
  const Item = ({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) => (
    <div className={cx("detail-item", full && "detail-full")}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
  return (
    <div className="detail-grid">
      <Item label="Request Number" value={<strong>{request.request_number}</strong>} />
      <div className="detail-item"><span className="detail-label">Status</span>{statBadge(request.status)}</div>
      <Item label="Student Name" value={request.full_name} />
      <Item label="Student Number" value={request.student_number} />
      <Item label="Course" value={request.course} />
      <Item label="Year & Section" value={`${request.year_level} ${request.section || ""}`} />
      <Item label="Campus" value={request.campus || "N/A"} />
      <Item label="Certificate Type" value={fmtType(request.certificate_type)} />
      <Item label="Contact Email" value={request.contact_email || "N/A"} />
      <Item label="Contact Number" value={request.contact_number || "N/A"} />
      <Item label="Date Submitted" value={fmtDateTime(request.created_at)} />
      <Item label="Certificate Issued" value={request.certificate_issued_date ? fmtDate(request.certificate_issued_date) : "Not yet"} />
      <div className="detail-item detail-full">
        <span className="detail-label">Reason for Request</span>
        <span className="detail-value reason">{request.reason}</span>
      </div>
      {request.admin_remarks && <Item label="Admin Remarks" value={request.admin_remarks} full />}
    </div>
  );
}

/** Collapsible signature uploader. Mirrors the legacy inline script. */
function SignatureManager({ adminId }: { adminId: number | null }) {
  const [sig, setSig] = useState<{ signature_image_path: string; signature_name: string; signature_title: string } | null>(null);
  const [name, setName] = useState("MILA JOY J. MARTINEZ");
  const [title, setTitle] = useState("Head, Student Affairs and Services");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSignature = useCallback(async () => {
    if (adminId == null) return;
    try {
      const data = await api.get<{ success?: boolean; signature?: typeof sig }>(`/api/certificate-requests/admin/signature/${adminId}`);
      if (data.success && data.signature) {
        setSig(data.signature);
        setName(data.signature.signature_name);
        setTitle(data.signature.signature_title);
      } else {
        setSig(null);
      }
    } catch {
      /* ignore */
    }
  }, [adminId]);

  useEffect(() => {
    loadSignature();
  }, [loadSignature]);

  async function upload() {
    if (!file) { window.alert("Please select a signature image first"); return; }
    const fd = new FormData();
    fd.append("signature", file);
    fd.append("adminId", String(adminId ?? ""));
    fd.append("signatureName", name);
    fd.append("signatureTitle", title);
    setBusy(true);
    try {
      const data = await api.post<{ success?: boolean; message?: string }>("/api/certificate-requests/admin/signature/upload", fd);
      if (data.success) { setFile(null); loadSignature(); }
      else window.alert(data.message || "Failed to upload signature");
    } catch {
      window.alert("Failed to upload signature");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (adminId == null) return;
    if (!window.confirm("Are you sure you want to delete your e-signature? It will be removed from all future certificates.")) return;
    try {
      const data = await api.delete<{ success?: boolean; message?: string }>(`/api/certificate-requests/admin/signature/${adminId}`);
      if (data.success) loadSignature();
      else window.alert(data.message || "Failed to delete signature");
    } catch {
      window.alert("Failed to delete signature");
    }
  }

  return (
    <div className="signature-content">
      <div className="signature-upload">
        <label className="sig-upload-title"><i className="fa-solid fa-upload" /> Upload Your E-Signature</label>
        <label className="btn btn-primary sig-select-btn">
          <i className="fa-solid fa-image" /> Select Signature Image
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {file && <p className="sig-selected">Selected: {file.name}</p>}
        <div className="sig-fields">
          <div>
            <label>Signature Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., MILA JOY J. MARTINEZ" />
          </div>
          <div>
            <label>Signature Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Head, Student Affairs and Services" />
          </div>
        </div>
        <button className="btn btn-success sig-save-btn" disabled={!file || busy} onClick={upload}>
          <i className="fa-solid fa-check" /> {busy ? "Uploading…" : "Save Signature"}
        </button>
        <p className="sig-hint"><i className="fa-solid fa-info-circle" /> Recommended: PNG with transparent background. Max size: 2MB</p>
      </div>

      <div className="signature-preview-col">
        <label className="sig-upload-title"><i className="fa-solid fa-eye" /> Current Signature</label>
        <div className="signature-preview-box">
          {sig ? (
            <>
              <img src={sig.signature_image_path} alt="Signature" />
              <p className="sig-name">{sig.signature_name}</p>
              <p className="sig-title">{sig.signature_title}</p>
              <button className="btn btn-danger btn-sm sig-delete-btn" onClick={remove}><i className="fa-solid fa-trash" /> Delete Signature</button>
            </>
          ) : (
            <div className="sig-empty"><i className="fa-solid fa-image" /><p>No signature uploaded yet</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- certificate HTML templates (ported verbatim from certificates.js) -------

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function buildCertificateHtml(request: CertRequest): string {
  const currentDate = fmtDate(new Date());
  const courseName = COURSE_NAMES[request.course] || request.course;
  const name = escapeHtml(request.full_name);
  const studentNumber = escapeHtml(request.student_number);
  const yearLevel = escapeHtml(request.year_level);
  const reason = escapeHtml(request.reason);
  const refNo = escapeHtml(request.request_number);

  const header = `
    <div class="cert-header">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <img src="/assets/images/PUPLogo.webp" alt="PUP Logo" style="width: 80px; height: 80px;">
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 14px; font-weight: normal;">Republic of the Philippines</div>
          <div style="font-size: 16px; font-weight: bold; margin: 5px 0;">POLYTECHNIC UNIVERSITY OF THE PHILIPPINES</div>
          <div style="font-size: 13px; font-weight: normal;">Office of the Vice President for Campuses</div>
          <div style="font-size: 18px; font-weight: bold; margin-top: 5px;">PARAÑAQUE CITY CAMPUS</div>
        </div>
        <img src="/assets/images/bagong-pilipinas-logo.png" alt="Bagong Pilipinas" style="width: 80px; height: 80px;" onerror="this.style.display='none'">
      </div>
    </div>
    <div style="text-align: right; margin: 20px 40px 40px; font-size: 14px;">${currentDate}</div>`;

  const signatureAndFooter = `
    <div style="margin-top: 60px; text-align: center;">
      <div style="display: inline-block; text-align: center;">
        <div style="width: 250px; border-top: 2px solid #000; margin: 0 auto 5px;"></div>
        <div style="font-weight: bold; font-size: 14px;">MILA JOY J. MARTINEZ</div>
        <div style="font-size: 13px; color: #333;">Head, Student Affairs and Services</div>
      </div>
    </div>
    <div style="margin-top: 40px; text-align: left; margin-left: 40px; font-size: 12px; font-style: italic;">Not Valid without School Seal</div>
    <div class="cert-footer" style="margin-top: 40px; border-top: 2px solid #000; padding-top: 15px;">
      <div style="font-size: 11px; text-align: center; line-height: 1.6;">
        PUP Parañaque Campus, Col. E de Leon St. Wawa, Brgy. Sto. Nino, Parañaque city<br/>
        Direct line: (02) 8553 8623 | Website: www.pup.edu.ph | Email: paranaque@pup.edu.ph<br/>
        Inquiries: <a href="https://bit.ly/PUPSINTA" style="color: #822020;">https://bit.ly/PUPSINTA</a>
      </div>
      <div style="text-align: center; margin-top: 10px; font-size: 13px; font-weight: bold;">THE COUNTRY'S 1<sup>st</sup> POLYTECHNICU</div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #999;">Reference No: ${refNo}</div>`;

  if (request.certificate_type === "no_id") {
    return `${header}
      <div class="cert-body" style="text-align: center;">
        <div style="font-size: 22px; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">CERTIFICATION OF NO ID</div>
        <div style="text-align: justify; margin: 30px 60px; line-height: 2; font-size: 15px;">
          <p style="text-indent: 50px; margin-bottom: 20px;">
            This is to certify that the school ID of <strong>${name}</strong>, a <strong>${courseName}</strong> student,
            this first semester of Academic Year 2025-2026 is not yet released.
          </p>
          <p style="text-indent: 50px;">
            This certification is issued upon the request of the school, <strong>${name}</strong>, or any legal purpose this may serve.
          </p>
        </div>
      </div>
      ${signatureAndFooter}`;
  }

  if (request.certificate_type === "recommendation_scholarship") {
    return `${header}
      <div class="cert-body">
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 30px; text-align: center;">LETTER OF RECOMMENDATION</div>
        <div style="margin: 30px 40px; line-height: 1.8; font-size: 14px;">
          <p style="margin-bottom: 20px;">To Whom It May Concern:</p>
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            This is to certify that <strong>${name}</strong>, Student Number <strong>${studentNumber}</strong>,
            is a bonafide student of Polytechnic University of the Philippines - Parañaque Campus,
            currently enrolled in <strong>${courseName}</strong>, <strong>${yearLevel}</strong>.
          </p>
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            ${name} has demonstrated commendable academic performance and exemplary conduct throughout their studies at our institution.
            Based on their academic record and character, we recommend this student for scholarship consideration.
          </p>
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">Purpose: ${reason}</p>
          <p style="text-align: justify; text-indent: 40px;">This letter is issued upon the student's request for scholarship application purposes.</p>
        </div>
      </div>
      ${signatureAndFooter}`;
  }

  if (request.certificate_type === "recommendation_abroad") {
    return `${header}
      <div class="cert-body">
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 30px; text-align: center;">LETTER OF RECOMMENDATION</div>
        <div style="margin: 30px 40px; line-height: 1.8; font-size: 14px;">
          <p style="margin-bottom: 20px;">To Whom It May Concern:</p>
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            This letter serves to certify that <strong>${name}</strong>, Student Number <strong>${studentNumber}</strong>,
            is a bonafide student in good standing at Polytechnic University of the Philippines - Parañaque Campus,
            pursuing a degree in <strong>${courseName}</strong>, currently in <strong>${yearLevel}</strong>.
          </p>
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">
            Throughout their academic journey at our institution, ${name} has consistently demonstrated strong academic performance,
            dedication to their studies, and exemplary character. They have shown the maturity, responsibility, and adaptability
            that would serve them well in an international educational or professional setting.
          </p>
          <p style="text-align: justify; text-indent: 40px; margin-bottom: 15px;">Purpose: ${reason}</p>
          <p style="text-align: justify; text-indent: 40px;">
            This letter of recommendation is issued in support of the student's application for international opportunities.
            We believe they would be an excellent representative of our institution and country.
          </p>
        </div>
      </div>
      ${signatureAndFooter}`;
  }

  // Fallback for clearance / gres_form / no_pending_obligation (no legacy template).
  return `${header}
    <div class="cert-body" style="text-align: center;">
      <div style="font-size: 22px; font-weight: bold; margin-bottom: 30px; text-decoration: underline;">${escapeHtml(fmtType(request.certificate_type)).toUpperCase()}</div>
      <div style="text-align: justify; margin: 30px 60px; line-height: 2; font-size: 15px;">
        <p style="text-indent: 50px; margin-bottom: 20px;">
          This is to certify that <strong>${name}</strong>, Student Number <strong>${studentNumber}</strong>,
          a <strong>${courseName}</strong> student, ${yearLevel}, has requested a ${escapeHtml(fmtType(request.certificate_type))}.
        </p>
        <p style="text-indent: 50px;">Purpose: ${reason}</p>
      </div>
    </div>
    ${signatureAndFooter}`;
}
