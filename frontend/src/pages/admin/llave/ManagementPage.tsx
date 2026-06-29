import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/llave-management.css";

/**
 * adminLlave → Management. Two sub-tabs:
 *  - Accreditation Items: section CRUD, CSV bulk import, search/area/status filters.
 *  - Accounts: Area Head & Accreditor account CRUD, area assignments, password reset.
 *
 * Endpoints (under `/api/accreditation`): /cycle/active, /sections/all/:cycle,
 * /section[/:id], /sections/bulk, /accounts-with-assignments/:cycle,
 * /account/area-head, /account/accreditor, /account/:id[/reset-password],
 * /account/:id/details/:cycle, /areas/:cycle, /assign/area-head[...],
 * /assign/accreditor[...].
 */

const ADMIN_ID = 6;
const AREAS = [
  { num: 1, name: "Mission, Vision, Goals" },
  { num: 2, name: "Faculty" },
  { num: 3, name: "Curriculum and Instruction" },
  { num: 4, name: "Support to Students" },
  { num: 5, name: "Research" },
  { num: 6, name: "Extension and Community" },
  { num: 7, name: "Library" },
  { num: 8, name: "Physical Plant and Facilities" },
  { num: 9, name: "Laboratories" },
  { num: 10, name: "Administration" },
];

type Section = { section_id: number; section_name: string; area_number: number; area_head_name?: string; google_drive_link?: string; submitted_at?: string; review_status?: string };
type Account = { id: number; name: string; email: string; assigned_areas?: string; section_count?: number; review_count?: number; last_login?: string; is_active?: boolean };
type AccountDetail = { username: string; email: string; full_name: string; is_active: boolean; last_login?: string; created_at?: string; assignments?: { area_id: number; area_number: number; area_name: string; section_count?: number; review_count?: number; assigned_at: string }[] };
type Area = { area_id: number; area_number: number; area_name: string; total_sections?: number; area_head_id?: number; area_head_name?: string };
type Toast = { msg: string; type: "success" | "error" | "info" | "warning" };
type Role = "area-head" | "accreditor";

function reviewBadge(status?: string) {
  if (!status || status === "Not Reviewed") return <span className="badge badge-gray">Not Reviewed</span>;
  if (status === "Complete") return <span className="badge badge-green">Complete</span>;
  if (status === "Needs Revision") return <span className="badge badge-yellow">Needs Revision</span>;
  if (status === "Incomplete") return <span className="badge badge-red">Incomplete</span>;
  return <span className="badge badge-gray">-</span>;
}

export function ManagementPage() {
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [tab, setTab] = useState<"sections" | "accounts">("sections");
  const [toast, setToast] = useState<Toast | null>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [areaHeads, setAreaHeads] = useState<Account[]>([]);
  const [accreditors, setAccreditors] = useState<Account[]>([]);

  type Modal =
    | { kind: "addSection" }
    | { kind: "editSection"; section: Section }
    | { kind: "bulkImport" }
    | { kind: "addAccount"; role: Role }
    | { kind: "editAccount"; account: Account; role: Role }
    | { kind: "resetPassword"; accountId: number; label: string }
    | { kind: "viewAccount"; detail: AccountDetail; role: Role }
    | { kind: "assignments"; account: Account; role: Role; areas: Area[]; assignments: { area_id: number }[] }
    | null;
  const [modal, setModal] = useState<Modal>(null);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadSections = useCallback(async (cid: number) => {
    try { const d = await api.get<{ sections?: Section[] }>(`/api/accreditation/sections/all/${cid}`); setSections(d.sections ?? []); } catch { showToast("Failed to load sections", "error"); }
  }, [showToast]);

  const loadAccounts = useCallback(async (cid: number) => {
    try {
      const d = await api.get<{ areaHeads?: Account[]; accreditors?: Account[] }>(`/api/accreditation/accounts-with-assignments/${cid}`);
      setAreaHeads(d.areaHeads ?? []);
      setAccreditors(d.accreditors ?? []);
    } catch { showToast("Failed to load accounts", "error"); }
  }, [showToast]);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get<{ cycle?: { id: number } }>("/api/accreditation/cycle/active");
        if (d.cycle) { setCycleId(d.cycle.id); loadSections(d.cycle.id); }
        else showToast("No active cycle found. Please create a cycle first.", "warning");
      } catch { showToast("Failed to load cycle information", "error"); }
    })();
  }, [loadSections, showToast]);

  useEffect(() => {
    if (tab === "accounts" && cycleId) loadAccounts(cycleId);
  }, [tab, cycleId, loadAccounts]);

  const filteredSections = useMemo(() => {
    const q = search.toLowerCase();
    return sections.filter((s) => {
      if (q && !s.section_name.toLowerCase().includes(q)) return false;
      if (areaFilter && String(s.area_number) !== areaFilter) return false;
      if (statusFilter === "submitted" && !s.google_drive_link) return false;
      if (statusFilter === "not_submitted" && s.google_drive_link) return false;
      return true;
    });
  }, [sections, search, areaFilter, statusFilter]);

  const sectionStats = useMemo(() => {
    const withLinks = sections.filter((s) => s.google_drive_link).length;
    return { total: sections.length, withLinks, without: sections.length - withLinks };
  }, [sections]);

  async function deleteSection(s: Section) {
    if (!window.confirm(`Are you sure you want to delete "${s.section_name}"?\n\nThis action cannot be undone.`)) return;
    try {
      const d = await api.delete<{ success?: boolean; error?: string }>(`/api/accreditation/section/${s.section_id}`, { deleted_by: ADMIN_ID });
      if (d.success && cycleId) { showToast("Section deleted successfully", "success"); loadSections(cycleId); }
      else showToast(d.error || "Failed to delete section", "error");
    } catch { showToast("Failed to delete section", "error"); }
  }

  async function deleteAccount(account: Account, role: Role) {
    const label = role === "area-head" ? "Area Head" : "Accreditor";
    if (!window.confirm(`Are you sure you want to delete ${label} "${account.name}"?\n\nThis action cannot be undone.`)) return;
    try {
      const d = await api.delete<{ success?: boolean; error?: string }>(`/api/accreditation/account/${account.id}`, { deleted_by: ADMIN_ID });
      if (d.success && cycleId) { showToast(`${label} account deleted successfully`, "success"); loadAccounts(cycleId); }
      else showToast(d.error || `Failed to delete ${label} account`, "error");
    } catch { showToast(`Failed to delete ${label} account`, "error"); }
  }

  async function openViewAccount(account: Account, role: Role) {
    if (!cycleId) return;
    try {
      const d = await api.get<{ account?: AccountDetail }>(`/api/accreditation/account/${account.id}/details/${cycleId}`);
      if (d.account) setModal({ kind: "viewAccount", detail: d.account, role });
      else showToast("Failed to load account details", "error");
    } catch { showToast("Failed to load account details", "error"); }
  }

  async function openAssignments(account: Account, role: Role) {
    if (!cycleId) return;
    try {
      const [acc, ar] = await Promise.all([
        api.get<{ account?: AccountDetail }>(`/api/accreditation/account/${account.id}/details/${cycleId}`),
        api.get<{ areas?: Area[] }>(`/api/accreditation/areas/${cycleId}`),
      ]);
      setModal({ kind: "assignments", account, role, areas: ar.areas ?? [], assignments: (acc.account?.assignments ?? []).map((a) => ({ area_id: a.area_id })) });
    } catch { showToast("Failed to load assignments", "error"); }
  }

  return (
    <div className="management-page">
      <div className="sub-tab-toggle">
        <button className={cx("sub-tab-btn", tab === "sections" && "active")} onClick={() => setTab("sections")}><i className="fas fa-list" /> Accreditation Items</button>
        <button className={cx("sub-tab-btn", tab === "accounts" && "active")} onClick={() => setTab("accounts")}><i className="fas fa-users" /> Accounts</button>
      </div>

      {tab === "sections" ? (
        <div className="management-card">
          <div className="card-header">
            <h2 className="card-title">Accreditation Item Management</h2>
            <div className="header-actions">
              <button className="btn-primary" onClick={() => cycleId ? setModal({ kind: "addSection" }) : showToast("No active cycle. Please create a cycle first.", "warning")}><i className="fas fa-plus" /> Add Item</button>
              <button className="btn-secondary" onClick={() => cycleId ? setModal({ kind: "bulkImport" }) : showToast("No active cycle. Please create a cycle first.", "warning")}><i className="fas fa-upload" /> Bulk Import</button>
            </div>
          </div>
          <div className="summary-stats">
            <Stat label="Total Items:" value={sectionStats.total} />
            <Stat label="With Links:" value={sectionStats.withLinks} />
            <Stat label="Without Links:" value={sectionStats.without} />
          </div>
          <div className="search-filter-bar">
            <div className="search-box"><i className="fas fa-search" /><input type="text" placeholder="Search Items..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="filter-group">
              <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                <option value="">All Areas</option>
                {AREAS.map((a) => <option key={a.num} value={a.num}>Area {a.num}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="not_submitted">Not Submitted</option>
              </select>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Item Name</th><th>Area</th><th>Area Head</th><th>Link Status</th><th>Date Submitted</th><th>Review Status</th><th>Actions</th></tr></thead>
              <tbody>
                {!cycleId ? (
                  <tr><td colSpan={7} className="no-data">No active cycle. Please create a cycle first.</td></tr>
                ) : filteredSections.length === 0 ? (
                  <tr><td colSpan={7} className="no-data">{sections.length === 0 ? "No sections found. Add sections to get started." : "No sections match your filters"}</td></tr>
                ) : filteredSections.map((s) => (
                  <tr key={s.section_id}>
                    <td><strong>{s.section_name}</strong></td>
                    <td>Area {s.area_number}</td>
                    <td>{s.area_head_name || "-"}</td>
                    <td>{s.google_drive_link ? <span className="badge badge-green">Submitted</span> : <span className="badge badge-gray">Not Submitted</span>}</td>
                    <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-"}</td>
                    <td>{reviewBadge(s.review_status)}</td>
                    <td className="action-buttons">
                      {s.google_drive_link && <a href={s.google_drive_link} target="_blank" rel="noreferrer" className="btn-icon" title="Open Link"><i className="fas fa-external-link-alt" /></a>}
                      <button className="btn-icon" title="Edit" onClick={() => setModal({ kind: "editSection", section: s })}><i className="fas fa-edit" /></button>
                      <button className="btn-icon btn-danger" title="Delete" onClick={() => deleteSection(s)}><i className="fas fa-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="accounts-container">
          <AccountsTable role="area-head" title="Area Heads" icon="fa-user-tie" countCol="Accreditation Items" accounts={areaHeads}
            onAdd={() => setModal({ kind: "addAccount", role: "area-head" })}
            onAssign={(a) => openAssignments(a, "area-head")} onEdit={(a) => setModal({ kind: "editAccount", account: a, role: "area-head" })}
            onView={(a) => openViewAccount(a, "area-head")} onDelete={(a) => deleteAccount(a, "area-head")} />
          <AccountsTable role="accreditor" title="Accreditors" icon="fa-user-check" countCol="Reviews" accounts={accreditors}
            onAdd={() => setModal({ kind: "addAccount", role: "accreditor" })}
            onAssign={(a) => openAssignments(a, "accreditor")} onEdit={(a) => setModal({ kind: "editAccount", account: a, role: "accreditor" })}
            onView={(a) => openViewAccount(a, "accreditor")} onDelete={(a) => deleteAccount(a, "accreditor")} />
        </div>
      )}

      {/* Modals */}
      {modal?.kind === "addSection" && cycleId && (
        <SectionModal title="Add New Item" onClose={() => setModal(null)}
          onSave={async (name, area) => {
            try {
              const d = await api.post<{ success?: boolean; error?: string }>("/api/accreditation/section", { cycle_id: cycleId, area_id: area, section_name: name, created_by: ADMIN_ID });
              if (d.success) { showToast("Section added successfully", "success"); setModal(null); loadSections(cycleId); }
              else showToast(d.error || "Failed to add section", "error");
            } catch { showToast("Failed to add section", "error"); }
          }} />
      )}
      {modal?.kind === "editSection" && cycleId && (
        <SectionModal title="Edit Section" initialName={modal.section.section_name} initialArea={String(modal.section.area_number)} onClose={() => setModal(null)}
          onSave={async (name, area) => {
            try {
              const d = await api.put<{ success?: boolean; error?: string }>(`/api/accreditation/section/${modal.section.section_id}`, { section_name: name, area_id: area, updated_by: ADMIN_ID });
              if (d.success) { showToast("Section updated successfully", "success"); setModal(null); loadSections(cycleId); }
              else showToast(d.error || "Failed to update section", "error");
            } catch { showToast("Failed to update section", "error"); }
          }} />
      )}
      {modal?.kind === "bulkImport" && cycleId && (
        <BulkImportModal onClose={() => setModal(null)}
          onImport={async (sectionsToImport) => {
            try {
              const d = await api.post<{ success?: boolean; count?: number; error?: string }>("/api/accreditation/sections/bulk", { cycle_id: cycleId, sections: sectionsToImport, created_by: ADMIN_ID });
              if (d.success) { showToast(`Successfully imported ${d.count} sections`, "success"); setModal(null); loadSections(cycleId); }
              else showToast(d.error || "Failed to import sections", "error");
            } catch { showToast("Failed to import sections", "error"); }
          }} onError={(m) => showToast(m, "error")} />
      )}
      {modal?.kind === "addAccount" && (
        <AccountModal mode="add" role={modal.role} onClose={() => setModal(null)} onError={(m) => showToast(m, "error")}
          onSave={async (payload) => {
            try {
              const path = modal.role === "area-head" ? "/api/accreditation/account/area-head" : "/api/accreditation/account/accreditor";
              const d = await api.post<{ success?: boolean; error?: string }>(path, { ...payload, created_by: ADMIN_ID });
              const label = modal.role === "area-head" ? "Area Head" : "Accreditor";
              if (d.success && cycleId) { showToast(`${label} account created successfully`, "success"); setModal(null); loadAccounts(cycleId); }
              else showToast(d.error || `Failed to create ${label} account`, "error");
            } catch { showToast("Failed to create account", "error"); }
          }} />
      )}
      {modal?.kind === "editAccount" && (
        <AccountModal mode="edit" role={modal.role} account={modal.account} onClose={() => setModal(null)} onError={(m) => showToast(m, "error")}
          onResetPassword={() => setModal({ kind: "resetPassword", accountId: modal.account.id, label: modal.role === "area-head" ? "Area Head" : "Accreditor" })}
          onSave={async (payload) => {
            try {
              const d = await api.put<{ success?: boolean; error?: string }>(`/api/accreditation/account/${modal.account.id}`, { full_name: payload.full_name, email: payload.email, is_active: payload.is_active, updated_by: ADMIN_ID });
              if (d.success && cycleId) { showToast("Account updated successfully", "success"); setModal(null); loadAccounts(cycleId); }
              else showToast(d.error || "Failed to update account", "error");
            } catch { showToast("Failed to update account", "error"); }
          }} />
      )}
      {modal?.kind === "resetPassword" && (
        <ResetPasswordModal label={modal.label} onClose={() => setModal(null)} onError={(m) => showToast(m, "error")}
          onSave={async (pw) => {
            try {
              const d = await api.put<{ success?: boolean; error?: string }>(`/api/accreditation/account/${modal.accountId}/reset-password`, { new_password: pw, reset_by: ADMIN_ID });
              if (d.success) { showToast("Password reset successfully", "success"); setModal(null); }
              else showToast(d.error || "Failed to reset password", "error");
            } catch { showToast("Failed to reset password", "error"); }
          }} />
      )}
      {modal?.kind === "viewAccount" && (
        <ViewAccountModal detail={modal.detail} role={modal.role} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "assignments" && cycleId && (
        <AssignmentsModal account={modal.account} role={modal.role} areas={modal.areas} assignments={modal.assignments} cycleId={cycleId}
          onClose={() => { setModal(null); loadAccounts(cycleId); }} onToast={showToast} onReload={() => openAssignments(modal.account, modal.role)} />
      )}

      {toast && <div className={cx("mgmt-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat-item"><span className="stat-label">{label}</span><span className="stat-value">{value}</span></div>;
}

function AccountsTable({ role, title, icon, countCol, accounts, onAdd, onAssign, onEdit, onView, onDelete }: {
  role: Role; title: string; icon: string; countCol: string; accounts: Account[];
  onAdd: () => void; onAssign: (a: Account) => void; onEdit: (a: Account) => void; onView: (a: Account) => void; onDelete: (a: Account) => void;
}) {
  const active = accounts.filter((a) => a.is_active).length;
  return (
    <div className="management-card">
      <div className="card-header">
        <h2 className="card-title"><i className={cx("fas", icon)} /> {title}</h2>
        <button className="btn-primary" onClick={onAdd}><i className="fas fa-plus" /> Add {title.replace(/s$/, "")}</button>
      </div>
      <div className="summary-stats">
        <Stat label={`Total ${title}:`} value={accounts.length} />
        <Stat label="Active:" value={active} />
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Assigned Area(s)</th><th>{countCol}</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr><td colSpan={7} className="no-data">No {title.toLowerCase()} found</td></tr>
            ) : accounts.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.name}</strong></td>
                <td>{a.email}</td>
                <td>{a.assigned_areas || <span style={{ color: "#f59e0b" }}>No areas assigned</span>}</td>
                <td>{(role === "area-head" ? a.section_count : a.review_count) ?? 0}</td>
                <td>{a.last_login ? new Date(a.last_login).toLocaleDateString() : "Never"}</td>
                <td>{a.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                <td className="action-buttons">
                  <button className="btn-icon" title="Manage Assignments" onClick={() => onAssign(a)}><i className="fas fa-tasks" /></button>
                  <button className="btn-icon" title="Edit" onClick={() => onEdit(a)}><i className="fas fa-edit" /></button>
                  <button className="btn-icon" title="View Details" onClick={() => onView(a)}><i className="fas fa-info-circle" /></button>
                  <button className="btn-icon btn-danger" title="Delete" onClick={() => onDelete(a)}><i className="fas fa-trash" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, footer, children }: { title: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="modal" style={{ display: "flex" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header"><h3>{title}</h3><button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function SectionModal({ title, initialName = "", initialArea = "", onClose, onSave }: { title: string; initialName?: string; initialArea?: string; onClose: () => void; onSave: (name: string, area: string) => void }) {
  const [name, setName] = useState(initialName);
  const [area, setArea] = useState(initialArea);
  return (
    <ModalShell title={title} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => onSave(name.trim(), area)}>Confirm</button></>}>
      <div className="form-group"><label>Item Name *</label><input type="text" placeholder="e.g., BSIT 1-1 / Course Syllabus" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="form-group">
        <label>Area *</label>
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Select Area</option>
          {AREAS.map((a) => <option key={a.num} value={a.num}>Area {a.num}: {a.name}</option>)}
        </select>
      </div>
    </ModalShell>
  );
}

function BulkImportModal({ onClose, onImport, onError }: { onClose: () => void; onImport: (s: { section_name: string; area_id: string }[]) => void; onError: (m: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  function submit() {
    if (!file) return onError("Please select a CSV file");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? "");
      const rows = text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [n, a] = l.split(",").map((x) => x.trim()); return { section_name: n, area_id: a }; }).filter((r) => r.section_name && r.area_id);
      if (rows.length === 0) return onError("No valid sections found in CSV");
      onImport(rows);
    };
    reader.readAsText(file);
  }
  return (
    <ModalShell title="Bulk Import Sections" onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Confirm</button></>}>
      <div className="import-instructions">
        <h4>CSV Format Instructions:</h4>
        <ul><li>Column 1: Item Name (e.g., "BSIT 1-1")</li><li>Column 2: Area Number (1-10)</li><li>No header row required</li></ul>
        <p className="example"><strong>Example:</strong>{"\n"}BSIT 1-1,1{"\n"}BSIT 1-2,1{"\n"}BSIT 2-1,2</p>
      </div>
      <div className="form-group"><label>Select CSV File *</label><input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
    </ModalShell>
  );
}

function AccountModal({ mode, role, account, onClose, onSave, onResetPassword, onError }: {
  mode: "add" | "edit"; role: Role; account?: Account; onClose: () => void;
  onSave: (p: { username?: string; full_name: string; email: string; password?: string; is_active?: boolean }) => void;
  onResetPassword?: () => void; onError: (m: string) => void;
}) {
  const label = role === "area-head" ? "Area Head" : "Accreditor";
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [active, setActive] = useState(account?.is_active ?? true);

  function submit() {
    if (mode === "add") {
      if (!username.trim() || !fullName.trim() || !email.trim() || !password || !confirm) return onError("Please fill in all required fields");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return onError("Please enter a valid email address");
      if (password.length < 8) return onError("Password must be at least 8 characters long");
      if (password !== confirm) return onError("Passwords do not match");
      onSave({ username: username.trim(), full_name: fullName.trim(), email: email.trim(), password });
    } else {
      if (!fullName.trim() || !email.trim()) return onError("Please fill in all required fields");
      onSave({ full_name: fullName.trim(), email: email.trim(), is_active: active });
    }
  }

  return (
    <ModalShell title={`${mode === "add" ? "Create" : "Edit"} ${label} Account`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Confirm</button></>}>
      {mode === "add" && (
        <div className="form-group"><label>Username *</label><input type="text" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} /><small className="form-hint">Username must be unique</small></div>
      )}
      <div className="form-group"><label>Full Name *</label><input type="text" placeholder="Enter full name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
      <div className="form-group"><label>Email *</label><input type="email" placeholder="Enter email address" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {mode === "add" ? (
        <>
          <div className="form-group"><label>Password *</label><input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} /><small className="form-hint">Minimum 8 characters</small></div>
          <div className="form-group"><label>Confirm Password *</label><input type="password" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        </>
      ) : (
        <>
          <div className="form-group"><label><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active Account</label></div>
          <div className="form-group"><button className="btn-secondary" style={{ width: "100%" }} onClick={onResetPassword}><i className="fas fa-key" /> Reset Password</button></div>
        </>
      )}
    </ModalShell>
  );
}

function ResetPasswordModal({ label, onClose, onSave, onError }: { label: string; onClose: () => void; onSave: (pw: string) => void; onError: (m: string) => void }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  function submit() {
    if (!pw || !confirm) return onError("Please fill in all fields");
    if (pw.length < 8) return onError("Password must be at least 8 characters long");
    if (pw !== confirm) return onError("Passwords do not match");
    onSave(pw);
  }
  return (
    <ModalShell title={`Reset Password - ${label}`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Confirm</button></>}>
      <div className="form-group"><label>New Password *</label><input type="password" placeholder="Enter new password" value={pw} onChange={(e) => setPw(e.target.value)} /><small className="form-hint">Minimum 8 characters</small></div>
      <div className="form-group"><label>Confirm New Password *</label><input type="password" placeholder="Re-enter new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
    </ModalShell>
  );
}

function ViewAccountModal({ detail, role, onClose }: { detail: AccountDetail; role: Role; onClose: () => void }) {
  const assignments = detail.assignments ?? [];
  return (
    <ModalShell title={`${role === "area-head" ? "Area Head" : "Accreditor"} Details - ${detail.full_name}`} onClose={onClose} footer={<button className="btn-primary" onClick={onClose}>Close</button>}>
      <div className="account-details">
        <div className="detail-row"><strong>Username:</strong> {detail.username}</div>
        <div className="detail-row"><strong>Email:</strong> {detail.email}</div>
        <div className="detail-row"><strong>Status:</strong> {detail.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Inactive</span>}</div>
        <div className="detail-row"><strong>Last Login:</strong> {detail.last_login ? new Date(detail.last_login).toLocaleString() : "Never"}</div>
        <div className="detail-row"><strong>Created:</strong> {detail.created_at ? new Date(detail.created_at).toLocaleDateString() : "-"}</div>
      </div>
      {assignments.length > 0 ? (
        <>
          <h4>Assigned Areas:</h4>
          <div className="assignment-list">
            {assignments.map((a) => (
              <div className="assignment-item" key={a.area_id}>
                <strong>Area {a.area_number}: {a.area_name}</strong>
                <p>{role === "area-head" ? `Sections: ${a.section_count ?? 0}` : `Reviews Completed: ${a.review_count ?? 0}`}</p>
                <p>Assigned: {new Date(a.assigned_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </>
      ) : <p className="no-data">No areas assigned yet</p>}
    </ModalShell>
  );
}

function AssignmentsModal({ account, role, areas, assignments, cycleId, onClose, onToast, onReload }: {
  account: Account; role: Role; areas: Area[]; assignments: { area_id: number }[]; cycleId: number;
  onClose: () => void; onToast: (m: string, t?: Toast["type"]) => void; onReload: () => void;
}) {
  const assignedIds = new Set(assignments.map((a) => a.area_id));

  async function assign(areaId: number) {
    try {
      const path = role === "area-head" ? "/api/accreditation/assign/area-head" : "/api/accreditation/assign/accreditor";
      const body = role === "area-head"
        ? { cycle_id: cycleId, area_id: areaId, area_head_id: account.id, assigned_by: ADMIN_ID }
        : { cycle_id: cycleId, area_id: areaId, accreditor_id: account.id, assigned_by: ADMIN_ID };
      const d = await api.post<{ success?: boolean; error?: string }>(path, body);
      if (d.success) { onToast(`${role === "area-head" ? "Area Head" : "Accreditor"} assigned successfully`, "success"); onReload(); }
      else onToast(d.error || "Failed to assign", "error");
    } catch { onToast("Failed to assign", "error"); }
  }
  async function remove(areaId: number) {
    if (!window.confirm("Are you sure you want to remove this area assignment?")) return;
    try {
      const path = role === "area-head"
        ? `/api/accreditation/assign/area-head/${cycleId}/${areaId}`
        : `/api/accreditation/assign/accreditor/${cycleId}/${areaId}/${account.id}`;
      const d = await api.delete<{ success?: boolean; error?: string }>(path, { removed_by: ADMIN_ID });
      if (d.success) { onToast("Area assignment removed successfully", "success"); onReload(); }
      else onToast(d.error || "Failed to remove area assignment", "error");
    } catch { onToast("Failed to remove area assignment", "error"); }
  }

  return (
    <ModalShell title={`Manage Area Assignments - ${account.name}`} onClose={onClose} footer={<button className="btn-primary" onClick={onClose}>Close</button>}>
      <div className="assignment-manager">
        <p className="info-text">{role === "area-head" ? "Assign this Area Head to specific areas. Each area can only have one Area Head." : "Assign this Accreditor to specific areas. Accreditors can be assigned to multiple areas."}</p>
        <div className="areas-list">
          {areas.map((area) => {
            const isAssigned = assignedIds.has(area.area_id);
            const hasOtherHead = role === "area-head" && area.area_head_id && area.area_head_id !== account.id;
            return (
              <div className="area-assignment-row" key={area.area_id}>
                <div className="area-info"><strong>Area {area.area_number}: {area.area_name}</strong><p className="text-sm">Sections: {area.total_sections ?? 0}</p></div>
                <div className="area-action">
                  {isAssigned ? <button className="btn-danger btn-sm" onClick={() => remove(area.area_id)}><i className="fas fa-times" /> Remove</button>
                    : hasOtherHead ? <span className="text-muted">Assigned to {area.area_head_name}</span>
                    : <button className="btn-primary btn-sm" onClick={() => assign(area.area_id)}><i className="fas fa-plus" /> Assign</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
