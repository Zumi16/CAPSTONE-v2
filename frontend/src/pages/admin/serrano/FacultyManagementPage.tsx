import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import { getStoredAdminId } from "@/lib/adminAuth";
import "@/styles/pages/admin/faculty-management.css";

/**
 * adminSerrano → Faculty Management.
 *
 * Migration of facultyManagement.js: three tabs (Directory / Add / Deactivated),
 * grid+list view toggle, search/program/employment/degree filters, faculty
 * cards with view/edit/deactivate, an add form with conditional Master's /
 * Doctorate sections and dynamic certification + agency repeaters, a profile
 * view modal and an edit modal, plus the deactivated tab with restore / delete.
 *
 * Endpoints (`/api/faculty`):
 *   GET    /                 list   POST   /                  create (FormData)
 *   GET    /:id              detail PUT    /:id               edit   (FormData)
 *   GET    /deactivated      list   POST   /:id/deactivate
 *   POST   /:id/restore      DELETE /:id
 */

const PROGRAMS = ["BSIT", "BSCpE", "BSHM", "BSOA", "Gen Ed", "Others"];
const EMPLOYMENT = ["Regular", "Part-Time"];
const DEGREES = ["Bachelor", "Master", "Doctorate"];
const AGENCY_TYPES = ["Government Agency", "Private Company", "Educational Institution", "Non-Profit Organization"];
const YEARS = (() => {
  const cy = new Date().getFullYear();
  const years: string[] = ["ongoing"];
  for (let y = cy; y >= 1950; y--) years.push(String(y));
  return years;
})();

type Faculty = {
  id: number;
  first_name?: string;
  middle_initial?: string;
  last_name?: string;
  full_name?: string;
  program?: string;
  employment_type?: string;
  highest_degree?: string;
  contact_number?: string;
  birthdate?: string;
  last_pds_update?: string;
  image_path?: string;
  is_active?: boolean;
  deactivated_at?: string;
  education?: { degree_level: string; degree_title: string; school_name: string; year_graduated: string; field_of_study?: string }[];
  certifications?: { certification_name: string; issuing_organization: string; license_number?: string; issue_date?: string; expiry_date?: string }[];
  government_agencies?: { agency_name: string; agency_type: string; position?: string; employment_status?: string; start_date?: string; end_date?: string }[];
};

const buildFullName = (f: Faculty) =>
  f.full_name ||
  (f.middle_initial?.trim()
    ? `${f.first_name} ${f.middle_initial}. ${f.last_name}`
    : `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim());

function calculateAge(birthdate?: string): number | "N/A" {
  if (!birthdate) return "N/A";
  const b = new Date(birthdate);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

function pdsStatus(lastUpdate?: string): { text: string; cls: string } {
  if (!lastUpdate) return { text: "Never Updated", cls: "text-danger" };
  const cy = new Date().getFullYear();
  const y = parseInt(lastUpdate);
  if (y < cy - 2) return { text: "Severely Outdated (2+ years)", cls: "text-danger" };
  if (y < cy - 1) return { text: "Outdated (1+ year)", cls: "text-warning" };
  return { text: "Up to Date", cls: "text-success" };
}

/** Avatar that falls back to an icon when there's no image or it fails to load. */
function Avatar({ faculty, className }: { faculty: Faculty; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = faculty.image_path ? assetUrl(faculty.image_path) : "";
  if (!src || broken) {
    return (
      <div className={cx("avatar-fallback", className)}>
        <i className="fas fa-user-circle" />
      </div>
    );
  }
  return <img className={className} src={src} alt={buildFullName(faculty)} onError={() => setBroken(true)} />;
}

type Cert = { localId: number; name: string; org: string; number: string; issue: string; expiry: string };
type Agency = { localId: number; type: string; name: string; position: string; status: string; start: string; end: string };

type AddForm = {
  last_name: string; first_name: string; middle_initial: string; birthdate: string; contact_number: string;
  program: string; employment_type: string; highest_degree: string; last_pds_update: string;
  undergradTitle: string; undergradSchool: string; undergradYear: string; undergradField: string;
  hasMasters: boolean; mastersTitle: string; mastersSchool: string; mastersYear: string; mastersField: string;
  hasDoctorate: boolean; doctorateTitle: string; doctorateSchool: string; doctorateYear: string; doctorateField: string;
};
const EMPTY_ADD: AddForm = {
  last_name: "", first_name: "", middle_initial: "", birthdate: "", contact_number: "",
  program: "", employment_type: "", highest_degree: "", last_pds_update: "",
  undergradTitle: "", undergradSchool: "", undergradYear: "", undergradField: "",
  hasMasters: false, mastersTitle: "", mastersSchool: "", mastersYear: "", mastersField: "",
  hasDoctorate: false, doctorateTitle: "", doctorateSchool: "", doctorateYear: "", doctorateField: "",
};

export function FacultyManagementPage() {
  const [searchParams] = useSearchParams();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [deactivated, setDeactivated] = useState<Faculty[]>([]);
  const [tab, setTab] = useState<"directory" | "add" | "deactivated">("directory");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [search, setSearch] = useState("");
  const [fProgram, setFProgram] = useState(searchParams.get("program") ?? "");
  const [fEmployment, setFEmployment] = useState("");
  const [fDegree, setFDegree] = useState("");

  const [viewing, setViewing] = useState<Faculty | null>(null);
  const [editing, setEditing] = useState<Faculty | null>(null);

  const loadFaculty = useCallback(async () => {
    try {
      const data = await api.get<Faculty[]>("/api/faculty");
      setFaculty(Array.isArray(data) ? data : []);
    } catch {
      window.alert("Failed to load faculty data. Check your server connection.");
      setFaculty([]);
    }
  }, []);

  const loadDeactivated = useCallback(async () => {
    try {
      const data = await api.get<Faculty[]>("/api/faculty/deactivated");
      setDeactivated(Array.isArray(data) ? data : []);
    } catch {
      setDeactivated([]);
    }
  }, []);

  useEffect(() => {
    loadFaculty();
  }, [loadFaculty]);

  useEffect(() => {
    if (tab === "deactivated") loadDeactivated();
  }, [tab, loadDeactivated]);

  const active = useMemo(() => faculty.filter((f) => f.is_active), [faculty]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return active.filter((f) => {
      const name = buildFullName(f).toLowerCase();
      return (
        (!q || name.includes(q)) &&
        (!fProgram || f.program === fProgram) &&
        (!fEmployment || f.employment_type === fEmployment) &&
        (!fDegree || f.highest_degree === fDegree)
      );
    });
  }, [active, search, fProgram, fEmployment, fDegree]);

  function clearFilters() {
    setSearch("");
    setFProgram("");
    setFEmployment("");
    setFDegree("");
  }

  async function deactivate(f: Faculty) {
    const name = buildFullName(f);
    if (!window.confirm(`Are you sure you want to deactivate "${name}"?\n\nThey will be excluded from all reports and analytics.`)) return;
    try {
      await api.post(`/api/faculty/${f.id}/deactivate`, {});
      loadFaculty();
    } catch {
      window.alert("Failed to deactivate faculty");
    }
  }

  async function restore(f: Faculty) {
    if (!window.confirm(`Restore "${buildFullName(f)}" to active status?`)) return;
    try {
      await api.post(`/api/faculty/${f.id}/restore`, {});
      loadFaculty();
      loadDeactivated();
    } catch {
      window.alert("Failed to restore faculty");
    }
  }

  async function deleteForever(f: Faculty) {
    if (!window.confirm(`⚠️ WARNING: This will PERMANENTLY DELETE "${buildFullName(f)}" from the database.\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`)) return;
    try {
      await api.delete(`/api/faculty/${f.id}`);
      loadFaculty();
      loadDeactivated();
    } catch {
      window.alert("Failed to delete faculty");
    }
  }

  async function openView(id: number) {
    try {
      const data = await api.get<Faculty>(`/api/faculty/${id}`);
      setViewing(data);
    } catch {
      window.alert("Failed to load faculty profile");
    }
  }

  async function openEdit(id: number) {
    try {
      const data = await api.get<Faculty>(`/api/faculty/${id}`);
      setEditing(data);
    } catch {
      window.alert("Failed to load faculty data for editing");
    }
  }

  const TABS = [
    { key: "directory", icon: "fa-list", label: "Faculty Directory" },
    { key: "add", icon: "fa-user-plus", label: "Add Faculty" },
    { key: "deactivated", icon: "fa-user-slash", label: "Deactivated Faculty" },
  ] as const;

  return (
    <div className="faculty-mgmt-page">
      <div className="tab-navigation">
        {TABS.map((t) => (
          <button key={t.key} className={cx("tab-btn", tab === t.key && "active")} onClick={() => setTab(t.key)}>
            <i className={cx("fas", t.icon)} /> {t.label}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {/* DIRECTORY */}
        {tab === "directory" && (
          <div className="tab-content active">
            <div className="faculty-header">
              <h2><i className="fas fa-users" /> Faculty Directory</h2>
              <div className="header-controls">
                <div className="view-mode-toggle">
                  <button className={cx("view-mode-btn", viewMode === "grid" && "active")} onClick={() => setViewMode("grid")} title="Grid View"><i className="fas fa-th" /></button>
                  <button className={cx("view-mode-btn", viewMode === "list" && "active")} onClick={() => setViewMode("list")} title="List View"><i className="fas fa-list" /></button>
                </div>
                <button className="btn-primary" onClick={() => setTab("add")}><i className="fas fa-user-plus" /> Add New Faculty</button>
              </div>
            </div>

            <div className="faculty-filters">
              <div className="filter-group">
                <label>Search:</label>
                <input type="text" className="search-bar" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>Program:</label>
                <select value={fProgram} onChange={(e) => setFProgram(e.target.value)}>
                  <option value="">All Programs</option>
                  {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Employment:</label>
                <select value={fEmployment} onChange={(e) => setFEmployment(e.target.value)}>
                  <option value="">All Types</option>
                  {EMPLOYMENT.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Degree:</label>
                <select value={fDegree} onChange={(e) => setFDegree(e.target.value)}>
                  <option value="">All Degrees</option>
                  {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="btn-secondary" onClick={clearFilters}><i className="fas fa-redo" /> Clear Filters</button>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-users-slash" />
                <h4>No faculty members found</h4>
                <p>Try adjusting your filters or add new faculty</p>
                <button className="btn-primary" onClick={() => setTab("add")}><i className="fas fa-user-plus" /> Add Faculty</button>
              </div>
            ) : (
              <div className={viewMode === "list" ? "faculty-list" : "faculty-grid"}>
                {filtered.map((f) =>
                  viewMode === "list" ? (
                    <FacultyListCard key={f.id} f={f} onView={openView} onEdit={openEdit} onDeactivate={deactivate} />
                  ) : (
                    <FacultyGridCard key={f.id} f={f} onView={openView} onEdit={openEdit} onDeactivate={deactivate} />
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {/* ADD */}
        {tab === "add" && (
          <div className="tab-content active">
            <h2><i className="fas fa-user-plus" /> Add New Faculty</h2>
            <AddFacultyForm
              onCancel={() => setTab("directory")}
              onSaved={() => { loadFaculty(); setTab("directory"); }}
            />
          </div>
        )}

        {/* DEACTIVATED */}
        {tab === "deactivated" && (
          <div className="tab-content active">
            <h2><i className="fas fa-user-slash" /> Deactivated Faculty</h2>
            <p className="info-text">Faculty members who have been deactivated are listed below. You can restore them to active status.</p>
            {deactivated.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-check-circle" />
                <h4>No deactivated faculty</h4>
                <p>All faculty members are currently active</p>
              </div>
            ) : (
              <div className="faculty-grid">
                {deactivated.map((f) => (
                  <div className="faculty-card" key={f.id}>
                    <div className="faculty-image-container"><Avatar faculty={f} /></div>
                    <h3 className="faculty-name">{buildFullName(f)}</h3>
                    <div className="faculty-info">
                      <span className="faculty-badge badge-program">{f.program}</span>
                      <span className="faculty-badge badge-employment">{f.employment_type}</span>
                    </div>
                    <p className="deactivated-date">Deactivated: {f.deactivated_at ? new Date(f.deactivated_at).toLocaleDateString() : "—"}</p>
                    <div className="faculty-actions">
                      <button className="btn-restore" onClick={() => restore(f)}><i className="fas fa-undo" /> Restore</button>
                      <button className="btn-delete-permanent" onClick={() => deleteForever(f)}><i className="fas fa-trash" /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {viewing && <ViewModal faculty={viewing} onClose={() => setViewing(null)} />}
      {editing && (
        <EditModal
          faculty={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadFaculty(); }}
        />
      )}
    </div>
  );
}

function Badges({ f }: { f: Faculty }) {
  return (
    <>
      <span className="faculty-badge badge-program">{f.program}</span>
      <span className="faculty-badge badge-employment">{f.employment_type}</span>
      <span className="faculty-badge badge-degree">{f.highest_degree}</span>
    </>
  );
}

type CardProps = { f: Faculty; onView: (id: number) => void; onEdit: (id: number) => void; onDeactivate: (f: Faculty) => void };

function FacultyGridCard({ f, onView, onEdit, onDeactivate }: CardProps) {
  const age = calculateAge(f.birthdate);
  return (
    <div className="faculty-card">
      <div className="faculty-image-container"><Avatar faculty={f} /></div>
      <h3 className="faculty-name">{buildFullName(f)}</h3>
      <div className="faculty-info"><Badges f={f} /></div>
      <div className="faculty-meta">
        {f.contact_number && <p><i className="fas fa-phone" /> {f.contact_number}</p>}
        {f.birthdate && <p><i className="fas fa-birthday-cake" /> Age: {age}</p>}
      </div>
      <div className="faculty-actions">
        <button className="btn-view" onClick={() => onView(f.id)}><i className="fas fa-eye" /> View</button>
        <button className="btn-edit" onClick={() => onEdit(f.id)}><i className="fas fa-edit" /> Edit</button>
        <button className="btn-deactivate" onClick={() => onDeactivate(f)}><i className="fas fa-user-slash" /> Deactivate</button>
      </div>
    </div>
  );
}

function FacultyListCard({ f, onView, onEdit, onDeactivate }: CardProps) {
  const age = calculateAge(f.birthdate);
  return (
    <div className="faculty-card-list">
      <div className="faculty-list-image"><Avatar faculty={f} /></div>
      <div className="faculty-list-info">
        <h3 className="faculty-name">{buildFullName(f)}</h3>
        <div className="faculty-badges"><Badges f={f} /></div>
        <div className="faculty-details">
          {f.contact_number && <p><i className="fas fa-phone" /> {f.contact_number}</p>}
          {f.birthdate && <p><i className="fas fa-birthday-cake" /> Age: {age}</p>}
        </div>
      </div>
      <div className="faculty-list-actions">
        <button className="btn-view" onClick={() => onView(f.id)}><i className="fas fa-eye" /> View Profile</button>
        <button className="btn-edit" onClick={() => onEdit(f.id)}><i className="fas fa-edit" /> Edit</button>
        <button className="btn-deactivate" onClick={() => onDeactivate(f)}><i className="fas fa-user-slash" /> Deactivate</button>
      </div>
    </div>
  );
}

/** Read-only profile modal. */
function ViewModal({ faculty, onClose }: { faculty: Faculty; onClose: () => void }) {
  const age = calculateAge(faculty.birthdate);
  const pds = pdsStatus(faculty.last_pds_update);
  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content large">
        <div className="modal-header">
          <h3><i className="fas fa-user" /> Faculty Profile</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="faculty-profile">
            <div className="profile-header">
              <Avatar faculty={faculty} />
              <div>
                <h2>{buildFullName(faculty)}</h2>
                <p className="profile-subtitle">{faculty.program} - {faculty.employment_type}</p>
              </div>
            </div>

            <div className="faculty-profile-section">
              <h3><i className="fas fa-user" /> Basic Information</h3>
              <div className="profile-info-grid">
                {faculty.contact_number && <Info label="Contact" value={faculty.contact_number} />}
                {faculty.birthdate && <Info label="Age" value={`${age} years`} />}
                <Info label="Employment" value={faculty.employment_type ?? ""} />
                <Info label="Highest Degree" value={faculty.highest_degree ?? ""} />
                {faculty.last_pds_update && <Info label="PDS Updated" value={faculty.last_pds_update} />}
                {faculty.last_pds_update && <Info label="PDS Status" value={pds.text} valueCls={pds.cls} />}
              </div>
            </div>

            <div className="faculty-profile-section">
              <h3><i className="fas fa-graduation-cap" /> Educational Background</h3>
              <div className="education-list">
                {faculty.education && faculty.education.length > 0 ? (
                  faculty.education.map((edu, i) => (
                    <div className="education-item" key={i}>
                      <div className="education-header"><h4><i className="fas fa-graduation-cap" /> {edu.degree_level} Degree</h4></div>
                      <p className="degree-title"><strong>{edu.degree_title}</strong></p>
                      <p className="school"><i className="fas fa-university" /> {edu.school_name}</p>
                      <p className="year"><i className="fas fa-calendar" /> Year Graduated: {edu.year_graduated}</p>
                      {edu.field_of_study && <p className="field"><i className="fas fa-book" /> Field: {edu.field_of_study}</p>}
                    </div>
                  ))
                ) : (
                  <p className="no-data">No education records available</p>
                )}
              </div>
            </div>

            <div className="faculty-profile-section">
              <h3><i className="fas fa-certificate" /> Professional Certifications</h3>
              <div className="certification-list">
                {faculty.certifications && faculty.certifications.length > 0 ? (
                  faculty.certifications.map((c, i) => (
                    <div className="certification-card" key={i}>
                      <h4><i className="fas fa-certificate" /> {c.certification_name}</h4>
                      <p className="cert-org"><i className="fas fa-building" /> Issued by: {c.issuing_organization}</p>
                      {c.license_number && <p className="cert-number"><i className="fas fa-id-card" /> License/Certificate #: {c.license_number}</p>}
                      {(c.issue_date || c.expiry_date) && (
                        <p className="cert-dates">
                          {c.issue_date && <><i className="fas fa-calendar-check" /> Issued: {new Date(c.issue_date).toLocaleDateString()} </>}
                          {c.expiry_date && <><i className="fas fa-calendar-times" /> Expires: {new Date(c.expiry_date).toLocaleDateString()}</>}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-data">No certifications available</p>
                )}
              </div>
            </div>

            <div className="faculty-profile-section">
              <h3><i className="fas fa-building" /> Government Agencies & Other Companies</h3>
              <div className="agency-list">
                {faculty.government_agencies && faculty.government_agencies.length > 0 ? (
                  faculty.government_agencies.map((a, i) => (
                    <div className="agency-card" key={i}>
                      <div className="agency-card-header">
                        <h4><i className="fas fa-building" /> {a.agency_name}</h4>
                        <span className={cx("status-badge", a.employment_status === "Active" ? "status-active" : "status-inactive")}>{a.employment_status || "Active"}</span>
                      </div>
                      <p className="agency-type"><i className="fas fa-tag" /> {a.agency_type}</p>
                      {a.position && <p className="agency-position"><i className="fas fa-briefcase" /> Position: {a.position}</p>}
                      {(a.start_date || a.end_date) && (
                        <p className="agency-dates">
                          <i className="fas fa-calendar" /> {a.start_date ? new Date(a.start_date).toLocaleDateString() : "N/A"}
                          {a.end_date ? ` - ${new Date(a.end_date).toLocaleDateString()}` : " - Present"}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-data">No government agencies/companies listed</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, valueCls }: { label: string; value: string; valueCls?: string }) {
  return (
    <div className="profile-info-item">
      <label>{label}</label>
      <div className={cx("value", valueCls)}>{value}</div>
    </div>
  );
}

/** Edit modal — basic + employment fields (+ optional new image), mirrors the legacy edit form. */
function EditModal({ faculty, onClose, onSaved }: { faculty: Faculty; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    last_name: faculty.last_name ?? "", first_name: faculty.first_name ?? "", middle_initial: faculty.middle_initial ?? "",
    birthdate: faculty.birthdate?.slice(0, 10) ?? "", contact_number: faculty.contact_number ?? "",
    program: faculty.program ?? "BSIT", employment_type: faculty.employment_type ?? "Regular",
    highest_degree: faculty.highest_degree ?? "Bachelor", last_pds_update: faculty.last_pds_update ?? "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(faculty.image_path ? assetUrl(faculty.image_path) : "");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("last_name", form.last_name.trim());
    fd.append("first_name", form.first_name.trim());
    fd.append("middle_initial", form.middle_initial.trim());
    fd.append("birthdate", form.birthdate);
    fd.append("contact_number", form.contact_number.trim());
    fd.append("program", form.program);
    fd.append("employment_type", form.employment_type);
    fd.append("highest_degree", form.highest_degree);
    if (form.last_pds_update) fd.append("last_pds_update", String(form.last_pds_update));
    if (image) fd.append("image", image);
    setSaving(true);
    try {
      await api.put(`/api/faculty/${faculty.id}`, fd);
      onSaved();
    } catch {
      window.alert("Failed to update faculty");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content large">
        <div className="modal-header">
          <h3><i className="fas fa-edit" /> Edit Faculty Information</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="form-section">
              <h3 className="section-title"><i className="fas fa-user" /> Basic Information</h3>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Faculty Image</label>
                  <div className="image-upload-container">
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImage(file);
                      if (file) setPreview(URL.createObjectURL(file));
                    }} />
                    <div className="image-preview">
                      {preview ? <img src={preview} alt="Preview" /> : <i className="fas fa-user-circle" />}
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Last Name *</label><input type="text" required value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
                <div className="form-group"><label>First Name *</label><input type="text" required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
                <div className="form-group"><label>Middle Initial</label><input type="text" maxLength={5} value={form.middle_initial} onChange={(e) => set("middle_initial", e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Birthdate *</label><input type="date" required value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} /></div>
                <div className="form-group"><label>Contact Number *</label><input type="tel" required value={form.contact_number} onChange={(e) => set("contact_number", e.target.value)} /></div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title"><i className="fas fa-briefcase" /> Employment Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Program *</label>
                  <select required value={form.program} onChange={(e) => set("program", e.target.value)}>
                    {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Employment Type *</label>
                  <select required value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
                    {EMPLOYMENT.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Highest Degree *</label>
                  <select required value={form.highest_degree} onChange={(e) => set("highest_degree", e.target.value)}>
                    {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Last PDS Update Year</label>
                  <input type="number" min={1990} max={2030} value={form.last_pds_update} onChange={(e) => set("last_pds_update", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}><i className="fas fa-save" /> {saving ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/** The full add-faculty form (basic + employment + education + cert/agency repeaters). */
function AddFacultyForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<AddForm>(EMPTY_ADD);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const nextId = useRef(1);

  const set = <K extends keyof AddForm>(k: K, v: AddForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const addCert = () => setCerts((c) => [...c, { localId: nextId.current++, name: "", org: "", number: "", issue: "", expiry: "" }]);
  const addAgency = () => setAgencies((a) => [...a, { localId: nextId.current++, type: "", name: "", position: "", status: "", start: "", end: "" }]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("last_name", form.last_name.trim());
    fd.append("first_name", form.first_name.trim());
    fd.append("middle_initial", form.middle_initial.trim());
    fd.append("birthdate", form.birthdate);
    fd.append("contact_number", form.contact_number.trim());
    fd.append("program", form.program);
    fd.append("employment_type", form.employment_type);
    fd.append("highest_degree", form.highest_degree);
    if (form.last_pds_update) fd.append("last_pds_update", form.last_pds_update);
    fd.append("created_by", getStoredAdminId() || "adminSerrano");
    if (image) fd.append("image", image);

    if (form.undergradTitle && form.undergradSchool && form.undergradYear) {
      fd.append("undergradTitle", form.undergradTitle.trim());
      fd.append("undergradSchool", form.undergradSchool.trim());
      fd.append("undergradYear", form.undergradYear);
      if (form.undergradField) fd.append("undergradField", form.undergradField.trim());
    }
    if (form.hasMasters && form.mastersTitle && form.mastersSchool && form.mastersYear) {
      fd.append("mastersTitle", form.mastersTitle.trim());
      fd.append("mastersSchool", form.mastersSchool.trim());
      fd.append("mastersYear", form.mastersYear);
      if (form.mastersField) fd.append("mastersField", form.mastersField.trim());
    }
    if (form.hasDoctorate && form.doctorateTitle && form.doctorateSchool && form.doctorateYear) {
      fd.append("doctorateTitle", form.doctorateTitle.trim());
      fd.append("doctorateSchool", form.doctorateSchool.trim());
      fd.append("doctorateYear", form.doctorateYear);
      if (form.doctorateField) fd.append("doctorateField", form.doctorateField.trim());
    }

    certs.filter((c) => c.name && c.org).forEach((c, i) => {
      const n = i + 1;
      fd.append(`cert_name_${n}`, c.name);
      fd.append(`cert_org_${n}`, c.org);
      if (c.number) fd.append(`cert_number_${n}`, c.number);
      if (c.issue) fd.append(`cert_issue_${n}`, c.issue);
      if (c.expiry) fd.append(`cert_expiry_${n}`, c.expiry);
    });
    agencies.filter((a) => a.type && a.name).forEach((a, i) => {
      const n = i + 1;
      fd.append(`agency_type_${n}`, a.type);
      fd.append(`agency_name_${n}`, a.name);
      if (a.position) fd.append(`agency_position_${n}`, a.position);
      if (a.status) fd.append(`agency_status_${n}`, a.status);
      if (a.start) fd.append(`agency_start_${n}`, a.start);
      if (a.end) fd.append(`agency_end_${n}`, a.end);
    });

    setSaving(true);
    try {
      await api.post("/api/faculty", fd);
      onSaved();
    } catch (err) {
      window.alert(`Failed to add faculty: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  const YearSelect = ({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) => (
    <select value={value} required={required} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select Year</option>
      {YEARS.map((y) => <option key={y} value={y}>{y === "ongoing" ? "Ongoing" : y}</option>)}
    </select>
  );

  return (
    <form className="faculty-form" onSubmit={submit}>
      {/* Basic */}
      <div className="form-section">
        <h3 className="section-title"><i className="fas fa-user" /> Basic Information</h3>
        <div className="form-row">
          <div className="form-group full-width">
            <label>Faculty Image *</label>
            <div className="image-upload-container">
              <input type="file" accept="image/*" required onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImage(file);
                if (file) setPreview(URL.createObjectURL(file));
              }} />
              <div className="image-preview">
                {preview ? <img src={preview} alt="Preview" /> : <><i className="fas fa-user-circle" /><p>Upload Photo</p></>}
              </div>
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Last Name *</label><input type="text" required placeholder="Enter last name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
          <div className="form-group"><label>First Name *</label><input type="text" required placeholder="Enter first name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
          <div className="form-group"><label>Middle Initial</label><input type="text" maxLength={5} placeholder="M.I. (optional)" value={form.middle_initial} onChange={(e) => set("middle_initial", e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Birthdate *</label><input type="date" required value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} /></div>
          <div className="form-group"><label>Contact Number *</label><input type="tel" required placeholder="+63-XXX-XXX-XXXX" value={form.contact_number} onChange={(e) => set("contact_number", e.target.value)} /></div>
        </div>
      </div>

      {/* Employment */}
      <div className="form-section">
        <h3 className="section-title"><i className="fas fa-briefcase" /> Employment Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Program *</label>
            <select required value={form.program} onChange={(e) => set("program", e.target.value)}>
              <option value="">Select Program</option>
              {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Employment Type *</label>
            <select required value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
              <option value="">Select Type</option>
              {EMPLOYMENT.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Highest Degree *</label>
            <select required value={form.highest_degree} onChange={(e) => set("highest_degree", e.target.value)}>
              <option value="">Select Degree</option>
              {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Last PDS Update Year</label><input type="number" min={1990} max={2030} placeholder="YYYY" value={form.last_pds_update} onChange={(e) => set("last_pds_update", e.target.value)} /></div>
        </div>
      </div>

      {/* Education */}
      <div className="form-section">
        <h3 className="section-title"><i className="fas fa-graduation-cap" /> Educational Background</h3>

        <div className="education-subsection">
          <h4><i className="fas fa-certificate" /> Undergraduate Degree</h4>
          <div className="form-row">
            <div className="form-group"><label>Degree Title *</label><input type="text" placeholder="e.g., Bachelor of Science in IT" value={form.undergradTitle} onChange={(e) => set("undergradTitle", e.target.value)} /></div>
            <div className="form-group"><label>School/University *</label><input type="text" placeholder="Name of institution" value={form.undergradSchool} onChange={(e) => set("undergradSchool", e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Year Graduated *</label><YearSelect value={form.undergradYear} onChange={(v) => set("undergradYear", v)} /></div>
            <div className="form-group"><label>Field of Study</label><input type="text" placeholder="e.g., Information Technology" value={form.undergradField} onChange={(e) => set("undergradField", e.target.value)} /></div>
          </div>
        </div>

        <div className="education-subsection">
          <div className="subsection-header">
            <h4><i className="fas fa-user-graduate" /> Master's Degree</h4>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.hasMasters} onChange={(e) => set("hasMasters", e.target.checked)} />
              <span>Faculty has Master's Degree</span>
            </label>
          </div>
          {form.hasMasters && (
            <div className="conditional-section">
              <div className="form-row">
                <div className="form-group"><label>Degree Title</label><input type="text" placeholder="e.g., Master of Science in IT" value={form.mastersTitle} onChange={(e) => set("mastersTitle", e.target.value)} /></div>
                <div className="form-group"><label>School/University</label><input type="text" placeholder="Name of institution" value={form.mastersSchool} onChange={(e) => set("mastersSchool", e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Year Graduated</label><YearSelect value={form.mastersYear} onChange={(v) => set("mastersYear", v)} /></div>
                <div className="form-group"><label>Field of Study</label><input type="text" placeholder="e.g., Educational Technology" value={form.mastersField} onChange={(e) => set("mastersField", e.target.value)} /></div>
              </div>
            </div>
          )}
        </div>

        <div className="education-subsection">
          <div className="subsection-header">
            <h4><i className="fas fa-medal" /> Doctorate Degree</h4>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.hasDoctorate} onChange={(e) => set("hasDoctorate", e.target.checked)} />
              <span>Faculty has Doctorate Degree</span>
            </label>
          </div>
          {form.hasDoctorate && (
            <div className="conditional-section">
              <div className="form-row">
                <div className="form-group"><label>Degree Title</label><input type="text" placeholder="e.g., Doctor of Philosophy in CS" value={form.doctorateTitle} onChange={(e) => set("doctorateTitle", e.target.value)} /></div>
                <div className="form-group"><label>School/University</label><input type="text" placeholder="Name of institution" value={form.doctorateSchool} onChange={(e) => set("doctorateSchool", e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Year Graduated</label><YearSelect value={form.doctorateYear} onChange={(v) => set("doctorateYear", v)} /></div>
                <div className="form-group"><label>Field of Study</label><input type="text" placeholder="e.g., Computer Science" value={form.doctorateField} onChange={(e) => set("doctorateField", e.target.value)} /></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Certifications */}
      <div className="form-section">
        <h3 className="section-title"><i className="fas fa-certificate" /> Professional Certifications</h3>
        <p className="info-text"><i className="fas fa-info-circle" /> Add professional licenses, certifications, or credentials from organizations like PRC, CHED, TESDA, etc.</p>
        <div id="certificationsContainer">
          {certs.map((c, i) => (
            <div className="certification-item" key={c.localId}>
              <div className="certification-header">
                <h4><i className="fas fa-certificate" /> Certification #{i + 1}</h4>
                <button type="button" className="btn-remove-cert" onClick={() => setCerts((p) => p.filter((x) => x.localId !== c.localId))}><i className="fas fa-times" /> Remove</button>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Certification Name *</label><input type="text" placeholder="e.g., Professional Teacher License" value={c.name} onChange={(e) => setCerts((p) => p.map((x) => x.localId === c.localId ? { ...x, name: e.target.value } : x))} /></div>
                <div className="form-group"><label>Issuing Organization *</label><input type="text" placeholder="e.g., PRC, CHED, TESDA" value={c.org} onChange={(e) => setCerts((p) => p.map((x) => x.localId === c.localId ? { ...x, org: e.target.value } : x))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>License/Certificate Number</label><input type="text" placeholder="Optional" value={c.number} onChange={(e) => setCerts((p) => p.map((x) => x.localId === c.localId ? { ...x, number: e.target.value } : x))} /></div>
                <div className="form-group"><label>Issue Date</label><input type="date" value={c.issue} onChange={(e) => setCerts((p) => p.map((x) => x.localId === c.localId ? { ...x, issue: e.target.value } : x))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Expiry Date</label><input type="date" value={c.expiry} onChange={(e) => setCerts((p) => p.map((x) => x.localId === c.localId ? { ...x, expiry: e.target.value } : x))} /></div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary" onClick={addCert}><i className="fas fa-plus" /> Add Certification</button>
      </div>

      {/* Agencies */}
      <div className="form-section">
        <h3 className="section-title"><i className="fas fa-building" /> Government Agencies & Other Companies</h3>
        <p className="info-text"><i className="fas fa-info-circle" /> Add any other government agencies, private companies, or organizations where this faculty member works or has worked.</p>
        <div id="agenciesContainer">
          {agencies.map((a, i) => (
            <div className="agency-item" key={a.localId}>
              <div className="agency-header">
                <h4><i className="fas fa-building" /> Government Agency/Company #{i + 1}</h4>
                <button type="button" className="btn-remove-agency" onClick={() => setAgencies((p) => p.filter((x) => x.localId !== a.localId))}><i className="fas fa-times" /> Remove</button>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Agency/Company Type *</label>
                  <select value={a.type} onChange={(e) => setAgencies((p) => p.map((x) => x.localId === a.localId ? { ...x, type: e.target.value } : x))}>
                    <option value="">Select Type</option>
                    {AGENCY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Agency/Company Name *</label><input type="text" placeholder="e.g., Department of Education" value={a.name} onChange={(e) => setAgencies((p) => p.map((x) => x.localId === a.localId ? { ...x, name: e.target.value } : x))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Position/Role</label><input type="text" placeholder="e.g., Consultant, Part-time Instructor" value={a.position} onChange={(e) => setAgencies((p) => p.map((x) => x.localId === a.localId ? { ...x, position: e.target.value } : x))} /></div>
                <div className="form-group">
                  <label>Employment Status</label>
                  <select value={a.status} onChange={(e) => setAgencies((p) => p.map((x) => x.localId === a.localId ? { ...x, status: e.target.value } : x))}>
                    <option value="">Select Status</option>
                    <option value="Active">Currently Working</option>
                    <option value="Inactive">No Longer Working</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Start Date</label><input type="date" value={a.start} onChange={(e) => setAgencies((p) => p.map((x) => x.localId === a.localId ? { ...x, start: e.target.value } : x))} /></div>
                <div className="form-group"><label>End Date (if applicable)</label><input type="date" value={a.end} onChange={(e) => setAgencies((p) => p.map((x) => x.localId === a.localId ? { ...x, end: e.target.value } : x))} /></div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary" onClick={addAgency}><i className="fas fa-plus" /> Add Government Agency / Company</button>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}><i className="fas fa-save" /> {saving ? "Saving…" : "Save Faculty"}</button>
      </div>
    </form>
  );
}
