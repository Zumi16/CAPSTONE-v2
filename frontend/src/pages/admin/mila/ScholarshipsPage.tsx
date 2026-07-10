import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/scholarships.css";

/**
 * adminMila → Scholarship Opportunities.
 *
 * Faithful migration of the legacy scholarships.js: filter tabs
 * (all/open/upcoming/closed), a two-column create/edit form with an
 * "eligible programs" checkbox group, up-to-3 file attachments, automatic
 * status→closed when a deadline has passed, and hard delete (no trash).
 *
 * Endpoints (`/api/scholarships`):
 *   GET    /all                 list
 *   POST   /create              create (FormData)
 *   PUT    /update/:id          edit  (FormData + keepFiles JSON)
 *   PATCH  /update-status/:id   { status }
 *   DELETE /delete/:id          delete
 */

const PROGRAMS = ["BSIT", "BSCpE", "BSOA", "BSHM"] as const;
const FILTERS = ["all", "open", "upcoming", "closed"] as const;
type Filter = (typeof FILTERS)[number];
type Status = "open" | "upcoming" | "closed";

type SchFile = { id?: number; file_name: string; file_path: string; file_size: number; file_type?: string };
type Scholarship = {
  id: number;
  title: string;
  provider: string;
  amount: string;
  slots?: number | string | null;
  open_date: string;
  deadline: string;
  status: Status;
  description: string;
  eligibility: string;
  benefits: string;
  required_documents?: string;
  application_process?: string;
  external_links?: string;
  contact_info?: string;
  eligible_courses?: string;
  created_at: string;
  files?: SchFile[];
};

const EMPTY_FORM = {
  title: "", provider: "", amount: "", slots: "", open_date: "", deadline: "",
  status: "upcoming" as Status, description: "", eligibility: "", benefits: "",
  required_documents: "", application_process: "", external_links: "", contact_info: "",
};
type FormState = typeof EMPTY_FORM;

function getFileIcon(mime?: string): string {
  if (!mime) return "fa-file";
  if (mime.includes("pdf")) return "fa-file-pdf";
  if (mime.includes("word")) return "fa-file-word";
  if (mime.includes("image")) return "fa-file-image";
  return "fa-file";
}
function formatFileSize(bytes: number): string {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

const FILTER_META: Record<Filter, { icon: string; label: string }> = {
  all: { icon: "fa-list", label: "All Scholarships" },
  open: { icon: "fa-door-open", label: "Open" },
  upcoming: { icon: "fa-clock", label: "Upcoming" },
  closed: { icon: "fa-door-closed", label: "Closed" },
};

export function ScholarshipsPage() {
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [allPrograms, setAllPrograms] = useState(true);
  const [programs, setPrograms] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<SchFile[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoaded(false);
    setError(false);
    try {
      const data = await api.get<{ success?: boolean; scholarships?: Scholarship[] }>("/api/scholarships/all");
      const list = data.success ? data.scholarships ?? [] : [];

      // Auto-close any scholarship whose deadline has passed.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await Promise.all(
        list.map(async (s) => {
          const dl = new Date(s.deadline);
          dl.setHours(0, 0, 0, 0);
          if (dl < today && s.status !== "closed") {
            try {
              await api.patch(`/api/scholarships/update-status/${s.id}`, { status: "closed" });
              s.status = "closed";
            } catch {
              /* ignore */
            }
          }
        }),
      );
      setItems(list);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const visible = filter === "all" ? items : items.filter((s) => s.status === filter);

  function resetForm() {
    setForm(EMPTY_FORM);
    setAllPrograms(true);
    setPrograms([]);
    setExistingFiles([]);
    setNewFiles([]);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(s: Scholarship) {
    setEditingId(s.id);
    setForm({
      title: s.title, provider: s.provider, amount: s.amount, slots: s.slots != null ? String(s.slots) : "",
      open_date: s.open_date?.slice(0, 10) ?? "", deadline: s.deadline?.slice(0, 10) ?? "",
      status: s.status, description: s.description, eligibility: s.eligibility, benefits: s.benefits,
      required_documents: s.required_documents ?? "", application_process: s.application_process ?? "",
      external_links: s.external_links ?? "", contact_info: s.contact_info ?? "",
    });
    if (s.eligible_courses === "All Programs" || !s.eligible_courses) {
      setAllPrograms(true);
      setPrograms([]);
    } else {
      setAllPrograms(false);
      setPrograms(s.eligible_courses.split(",").map((c) => c.trim()));
    }
    setExistingFiles(s.files ?? []);
    setNewFiles([]);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleProgram(p: string) {
    setAllPrograms(false);
    setPrograms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (existingFiles.length + newFiles.length + picked.length > 3) {
      window.alert("You can only upload up to 3 files per scholarship.");
      e.target.value = "";
      return;
    }
    setNewFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  }

  const eligibleCourses = allPrograms ? "All Programs" : programs.join(",");

  async function submit() {
    const required = [form.title, form.provider, form.amount, form.open_date, form.deadline, form.description, form.eligibility, form.benefits];
    if (required.some((v) => !v.trim())) {
      window.alert("Please fill in all required fields.");
      return;
    }
    if (!allPrograms && programs.length === 0) {
      window.alert('Please select at least one eligible program or choose "All Programs".');
      return;
    }

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("provider", form.provider.trim());
    fd.append("amount", form.amount.trim());
    fd.append("slots", form.slots || "");
    fd.append("open_date", form.open_date);
    fd.append("deadline", form.deadline);
    fd.append("status", form.status);
    fd.append("description", form.description.trim());
    fd.append("eligibility", form.eligibility.trim());
    fd.append("benefits", form.benefits.trim());
    fd.append("required_documents", form.required_documents.trim());
    fd.append("application_process", form.application_process.trim());
    fd.append("external_links", form.external_links.trim());
    fd.append("contact_info", form.contact_info.trim());
    fd.append("eligible_courses", eligibleCourses);
    fd.append("adminid", "adminmila");
    newFiles.forEach((f) => fd.append("files", f));
    if (editingId) fd.append("keepFiles", JSON.stringify(existingFiles.map((f) => f.id)));

    setSubmitting(true);
    try {
      const path = editingId ? `/api/scholarships/update/${editingId}` : "/api/scholarships/create";
      const data = editingId
        ? await api.put<{ success?: boolean }>(path, fd)
        : await api.post<{ success?: boolean }>(path, fd);
      if (data.success) {
        closeModal();
        load();
      } else {
        window.alert("Something went wrong while saving the scholarship.");
      }
    } catch {
      window.alert("Error submitting scholarship. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Are you sure you want to delete this scholarship and all its files?")) return;
    try {
      const data = await api.delete<{ success?: boolean }>(`/api/scholarships/delete/${id}`);
      if (data.success) load();
      else window.alert("Failed to delete scholarship");
    } catch {
      window.alert("Error deleting scholarship");
    }
  }

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : "");

  return (
    <div className="scholarships-admin-page">
      <div className="scholarship-filters">
        {FILTERS.map((f) => (
          <button key={f} className={cx("filter-tab", filter === f && "active")} onClick={() => setFilter(f)}>
            <i className={cx("fa-solid", FILTER_META[f].icon)} /> {FILTER_META[f].label}
          </button>
        ))}
      </div>

      <div className="post-container">
        <div className="post-feed">
          {!loaded ? (
            <div className="loading">Loading scholarships...</div>
          ) : error ? (
            <div className="post-placeholder">
              <i className="fa-solid fa-exclamation-triangle" />
              <h2>Error loading scholarships</h2>
              <p>Please refresh the page and try again.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="post-placeholder">
              <i className="fa-solid fa-graduation-cap" />
              <h2>{filter === "all" ? "No scholarships yet" : `No ${filter} scholarships`}</h2>
              <p>{filter === "all" ? "Create scholarship opportunities to inform students." : "Try selecting a different filter."}</p>
            </div>
          ) : (
            visible.map((s) => (
              <div className="scholarship-post" key={s.id}>
                <div className="scholarship-actions">
                  <button
                    className="post-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId((c) => (c === s.id ? null : s.id)); }}
                  >
                    <i className="fa-solid fa-ellipsis-v" />
                  </button>
                  {openMenuId === s.id && (
                    <div className="post-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                      <button className="post-edit" onClick={() => { setOpenMenuId(null); openEdit(s); }}>
                        <i className="fa-solid fa-pen" /> Edit
                      </button>
                      <button className="post-delete" onClick={() => { setOpenMenuId(null); remove(s.id); }}>
                        <i className="fa-solid fa-trash" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <span className={cx("scholarship-status", s.status)}>{s.status}</span>

                <div className="scholarship-header">
                  <h1>{s.title}</h1>
                  <div className="scholarship-provider"><i className="fa-solid fa-building" /> {s.provider}</div>
                </div>

                <div className="scholarship-info-grid">
                  <div className="info-item">
                    <i className="fa-solid fa-money-bill-wave" />
                    <div><div className="info-label">Amount</div><div className="info-value">{s.amount}</div></div>
                  </div>
                  {s.slots ? (
                    <div className="info-item">
                      <i className="fa-solid fa-users" />
                      <div><div className="info-label">Available Slots</div><div className="info-value">{s.slots}</div></div>
                    </div>
                  ) : null}
                  <div className="info-item">
                    <i className="fa-solid fa-calendar-check" />
                    <div><div className="info-label">Opening Date</div><div className="info-value">{fmtDate(s.open_date)}</div></div>
                  </div>
                  <div className="info-item">
                    <i className="fa-solid fa-calendar-times" />
                    <div><div className="info-label">Deadline</div><div className="info-value">{fmtDate(s.deadline)}</div></div>
                  </div>
                </div>

                <Section icon="fa-align-left" title="Description">{s.description}</Section>
                <Section icon="fa-clipboard-check" title="Eligibility Requirements">{s.eligibility}</Section>
                <Section icon="fa-gift" title="Benefits & Coverage">{s.benefits}</Section>

                {s.eligible_courses && (
                  <div className="scholarship-section">
                    <h3><i className="fa-solid fa-user-graduate" /> Eligible Programs</h3>
                    <div className="course-badges-container">
                      {s.eligible_courses.split(",").map((c) => (
                        <span className="course-badge" key={c}>{c.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {s.required_documents && <Section icon="fa-file-alt" title="Required Documents">{s.required_documents}</Section>}
                {s.application_process && <Section icon="fa-list-ol" title="Application Process">{s.application_process}</Section>}
                {s.external_links && <Section icon="fa-link" title="External Links">{s.external_links}</Section>}
                {s.contact_info && <Section icon="fa-address-book" title="Contact Information">{s.contact_info}</Section>}

                {s.files && s.files.length > 0 && (
                  <div className="post-files">
                    {s.files.map((file, i) => (
                      <div className="post-file-item document" key={i}>
                        <i className={cx("fa", getFileIcon(file.file_type), "file-icon")} />
                        <div className="file-details">
                          <a href={assetUrl(file.file_path)} target="_blank" rel="noreferrer" download={file.file_name}>{file.file_name}</a>
                          <span className="file-size">{formatFileSize(file.file_size)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="post-divider"><span>Posted on {fmtDate(s.created_at)}</span></div>
              </div>
            ))
          )}
        </div>

        <button className="post-btn" onClick={openCreate}>
          <i className="fa-solid fa-plus" /> Create Scholarship
        </button>
      </div>

      {showModal && (
        <div className="post-modal show" onClick={closeModal}>
          <div className="post-modal-content scholarship-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit Scholarship Opportunity" : "Create Scholarship Opportunity"}</h2>

            <div className="form-grid">
              <div className="form-columns-wrapper">
                {/* Left column */}
                <div className="form-column">
                  <Field label="Scholarship Title *">
                    <input type="text" value={form.title} placeholder="e.g., CHED Merit Scholarship" onChange={(e) => setField("title", e.target.value)} />
                  </Field>
                  <Field label="Provider/Organization *">
                    <input type="text" value={form.provider} placeholder="e.g., Commission on Higher Education" onChange={(e) => setField("provider", e.target.value)} />
                  </Field>
                  <div className="form-row">
                    <Field label="Scholarship Amount *">
                      <input type="text" value={form.amount} placeholder="e.g., ₱50,000 per semester" onChange={(e) => setField("amount", e.target.value)} />
                    </Field>
                    <Field label="Available Slots">
                      <input type="number" min={1} value={form.slots} placeholder="e.g., 20" onChange={(e) => setField("slots", e.target.value)} />
                    </Field>
                  </div>
                  <div className="form-row">
                    <Field label="Opening Date *">
                      <input type="date" value={form.open_date} onChange={(e) => setField("open_date", e.target.value)} />
                    </Field>
                    <Field label="Deadline *">
                      <input type="date" value={form.deadline} onChange={(e) => setField("deadline", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Status *">
                    <select value={form.status} onChange={(e) => setField("status", e.target.value as Status)}>
                      <option value="upcoming">Upcoming</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </Field>
                  <Field label="Eligible Programs/Courses *">
                    <div className="courses-container">
                      <div className="course-options">
                        <label className="course-checkbox">
                          <input
                            type="checkbox"
                            checked={allPrograms}
                            onChange={(e) => { setAllPrograms(e.target.checked); if (e.target.checked) setPrograms([]); }}
                          />
                          <span>All Programs</span>
                        </label>
                        {PROGRAMS.map((p) => (
                          <label className="course-checkbox" key={p}>
                            <input type="checkbox" checked={programs.includes(p)} disabled={allPrograms} onChange={() => toggleProgram(p)} />
                            <span>{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </Field>
                  <Field label="Description *">
                    <textarea rows={4} value={form.description} placeholder="Brief description of the scholarship..." onChange={(e) => setField("description", e.target.value)} />
                  </Field>
                </div>

                {/* Right column */}
                <div className="form-column">
                  <Field label="Eligibility Requirements *">
                    <textarea rows={3} value={form.eligibility} placeholder={"One requirement per line\nMust be a Filipino citizen\nEnrolled in PUP Parañaque"} onChange={(e) => setField("eligibility", e.target.value)} />
                  </Field>
                  <Field label="Benefits/Coverage *">
                    <textarea rows={3} value={form.benefits} placeholder={"One benefit per line\nFull tuition coverage\nBook allowance"} onChange={(e) => setField("benefits", e.target.value)} />
                  </Field>
                  <Field label="Required Documents">
                    <textarea rows={3} value={form.required_documents} placeholder={"One document per line\nCertificate of Enrollment\nTranscript of Records"} onChange={(e) => setField("required_documents", e.target.value)} />
                  </Field>
                  <Field label="Application Process">
                    <textarea rows={3} value={form.application_process} placeholder={"One step per line\nSubmit documents to Student Affairs\nAttend interview"} onChange={(e) => setField("application_process", e.target.value)} />
                  </Field>
                  <Field label="External Links/URLs (Optional)">
                    <textarea rows={2} value={form.external_links} placeholder={"One URL per line\nhttps://example.com/scholarship"} onChange={(e) => setField("external_links", e.target.value)} />
                  </Field>
                  <Field label="Contact Information (Optional)">
                    <textarea rows={2} value={form.contact_info} placeholder="Email, phone, or office details..." onChange={(e) => setField("contact_info", e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="file-upload-section">
              <label htmlFor="sch-file-upload" className="file-upload-label">
                <i className="fa fa-paperclip" /> Attach Files (Guidelines, Forms, Images) - Max 3
              </label>
              <input id="sch-file-upload" ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp" onChange={onPickFiles} />
              <div className="file-list">
                {[
                  ...existingFiles.map((f) => ({ kind: "existing" as const, file: f })),
                  ...newFiles.map((f) => ({ kind: "new" as const, file: f })),
                ].map((item, i) => {
                  const name = item.kind === "existing" ? item.file.file_name : item.file.name;
                  const size = item.kind === "existing" ? item.file.file_size : item.file.size;
                  const type = item.kind === "existing" ? item.file.file_type : item.file.type;
                  return (
                    <div className="file-item" key={`${item.kind}-${i}`}>
                      <i className={cx("fa", getFileIcon(type))} />
                      <span className="file-name">{name}</span>
                      <span className="file-size">{formatFileSize(size)}</span>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={() =>
                          item.kind === "existing"
                            ? setExistingFiles((p) => p.filter((f) => f !== item.file))
                            : setNewFiles((p) => p.filter((f) => f !== item.file))
                        }
                      >
                        <i className="fa fa-times" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="post-modal-actions">
              <button id="cancelPost" onClick={closeModal} disabled={submitting}>Cancel</button>
              <button id="submitPost" onClick={submit} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Update Scholarship" : "Create Scholarship"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="scholarship-section">
      <h3><i className={cx("fa-solid", icon)} /> {title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
    </div>
  );
}
