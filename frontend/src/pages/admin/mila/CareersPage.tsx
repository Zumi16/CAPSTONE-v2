import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/careers.css";

/**
 * adminMila → Career & Job Placement (partner organization directory).
 *
 * JSON CRUD (no file uploads). Category filter tabs, status badge, logo with
 * graceful fallback, website / careers-page links. Hard delete.
 *
 * Endpoints (`/api/career/organizations`):
 *   GET    /all          list
 *   POST   /create       create (JSON)
 *   PUT    /update/:id   edit  (JSON)
 *   DELETE /delete/:id   delete
 */

const CATEGORIES = ["Government", "University Unit", "Private Company"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_ICON: Record<string, string> = {
  Government: "fa-landmark",
  "University Unit": "fa-university",
  "Private Company": "fa-building",
};

type Org = {
  id: number;
  name: string;
  category: Category;
  description: string;
  website_url: string;
  careers_page_url?: string | null;
  logo_url?: string | null;
  status: "active" | "inactive";
};

const EMPTY = {
  name: "", category: "" as Category | "", description: "", website_url: "",
  careers_page_url: "", logo_url: "", status: "active" as "active" | "inactive",
};
type FormState = typeof EMPTY;

export function CareersPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [badLogos, setBadLogos] = useState<Set<number>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoaded(false);
    setError(false);
    try {
      const data = await api.get<{ success?: boolean; organizations?: Org[] }>("/api/career/organizations/all");
      setOrgs(data.success ? data.organizations ?? [] : []);
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

  const visible = filter === "all" ? orgs : orgs.filter((o) => o.category === filter);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(o: Org) {
    setEditingId(o.id);
    setForm({
      name: o.name, category: o.category, description: o.description || "",
      website_url: o.website_url || "", careers_page_url: o.careers_page_url || "",
      logo_url: o.logo_url || "", status: o.status,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit() {
    if (!form.name.trim() || !form.category || !form.description.trim() || !form.website_url.trim()) {
      window.alert("Please fill in all required fields.");
      return;
    }
    const body = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      website_url: form.website_url.trim(),
      careers_page_url: form.careers_page_url.trim() || null,
      logo_url: form.logo_url.trim() || null,
      status: form.status,
      adminid: "adminmila",
    };
    setSubmitting(true);
    try {
      const path = editingId
        ? `/api/career/organizations/update/${editingId}`
        : "/api/career/organizations/create";
      const data = editingId
        ? await api.put<{ success?: boolean; message?: string }>(path, body)
        : await api.post<{ success?: boolean; message?: string }>(path, body);
      if (data.success) {
        closeModal();
        load();
      } else {
        window.alert(data.message || "Failed to save organization.");
      }
    } catch {
      window.alert("Error submitting organization. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(o: Org) {
    if (!window.confirm(`Delete ${o.name} from the directory?`)) return;
    try {
      const data = await api.delete<{ success?: boolean; message?: string }>(`/api/career/organizations/delete/${o.id}`);
      if (data.success) load();
      else window.alert(data.message || "Failed to delete organization.");
    } catch {
      window.alert("Error deleting organization.");
    }
  }

  return (
    <div className="careers-page">
      <div className="category-filters">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button key={c} className={cx("filter-tab", filter === c && "active")} onClick={() => setFilter(c)}>
            <i className={cx("fa-solid", c === "all" ? "fa-list" : CATEGORY_ICON[c])} />{" "}
            {c === "all" ? "All Organizations" : c}
          </button>
        ))}
      </div>

      <div className="orgs-container">
        <div className="orgs-feed">
          {!loaded ? (
            <div className="loading">Loading organizations...</div>
          ) : error ? (
            <div className="placeholder">
              <i className="fa-solid fa-exclamation-triangle" />
              <h2>Error loading organizations</h2>
              <p>Please refresh the page and try again.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="placeholder">
              <i className="fa-solid fa-building" />
              <h2>{filter === "all" ? "No partner organizations yet" : `No ${filter} organizations`}</h2>
              <p>{filter === "all" ? "Add partner organizations to build your career directory." : "Try selecting a different category."}</p>
            </div>
          ) : (
            visible.map((o) => {
              const icon = CATEGORY_ICON[o.category] || "fa-building";
              const showLogo = o.logo_url && !badLogos.has(o.id);
              return (
                <div className="org-card" key={o.id}>
                  <div className="org-actions">
                    <button
                      className="menu-btn"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId((c) => (c === o.id ? null : o.id)); }}
                    >
                      <i className="fa-solid fa-ellipsis-v" />
                    </button>
                    {openMenuId === o.id && (
                      <div className="menu-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button className="org-edit" onClick={() => { setOpenMenuId(null); openEdit(o); }}>
                          <i className="fa-solid fa-pen" /> Edit
                        </button>
                        <button className="org-delete" onClick={() => { setOpenMenuId(null); remove(o); }}>
                          <i className="fa-solid fa-trash" /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="org-status-row">
                    <span className={cx("org-status", o.status)}>{o.status}</span>
                    <span className="org-category-badge"><i className={cx("fa-solid", icon)} /> {o.category}</span>
                  </div>

                  <div className="org-header">
                    {showLogo ? (
                      <img
                        src={o.logo_url!}
                        alt={o.name}
                        className="org-logo"
                        onError={() => setBadLogos((prev) => new Set(prev).add(o.id))}
                      />
                    ) : (
                      <div className="org-logo-fallback"><i className={cx("fa-solid", icon)} /></div>
                    )}
                    <h3>{o.name}</h3>
                  </div>

                  <div className="org-description"><p>{o.description}</p></div>

                  <div className="org-links">
                    <a href={o.website_url} target="_blank" rel="noopener noreferrer" className="org-link org-link-primary">
                      <i className="fa-solid fa-globe" />
                      <span>Visit Website</span>
                      <i className="fa-solid fa-external-link-alt" />
                    </a>
                    {o.careers_page_url && (
                      <a href={o.careers_page_url} target="_blank" rel="noopener noreferrer" className="org-link org-link-secondary">
                        <i className="fa-solid fa-briefcase" />
                        <span>View Careers Page</span>
                        <i className="fa-solid fa-external-link-alt" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button className="action-btn" onClick={openCreate}>
          <i className="fa-solid fa-plus" /> Add Organization
        </button>
      </div>

      {showModal && (
        <div className="modal show" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit Partner Organization" : "Add Partner Organization"}</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>Organization Name *</label>
                <input type="text" value={form.name} placeholder="e.g., PESO Parañaque" onChange={(e) => setField("name", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select value={form.category} onChange={(e) => setField("category", e.target.value as Category)}>
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea rows={3} value={form.description} placeholder="Brief description of what the organization does..." onChange={(e) => setField("description", e.target.value)} />
                <small>Describe the organization's purpose or industry focus</small>
              </div>
              <div className="form-group">
                <label>Official Website URL *</label>
                <input type="url" value={form.website_url} placeholder="https://organization.com" onChange={(e) => setField("website_url", e.target.value)} />
                <small>Main website of the organization</small>
              </div>
              <div className="form-group">
                <label>Careers Page URL</label>
                <input type="url" value={form.careers_page_url} placeholder="https://organization.com/careers" onChange={(e) => setField("careers_page_url", e.target.value)} />
                <small>Direct link to their careers/jobs page (optional but recommended)</small>
              </div>
              <div className="form-group">
                <label>Logo URL (Optional)</label>
                <input type="url" value={form.logo_url} placeholder="https://organization.com/logo.png" onChange={(e) => setField("logo_url", e.target.value)} />
                <small>URL to organization's logo image</small>
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select value={form.status} onChange={(e) => setField("status", e.target.value as "active" | "inactive")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={closeModal} disabled={submitting}>Cancel</button>
              <button onClick={submit} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Update Organization" : "Add Organization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
