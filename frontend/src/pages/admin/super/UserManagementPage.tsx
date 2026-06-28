import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { getStoredAdminId } from "@/lib/adminAuth";
import "@/styles/pages/admin/user-management.css";

/**
 * Shared admin-account management page used by both the superAdmin and
 * secondarySuperAdmin portals (they hit the same `/api/admin-accounts` and
 * `/api/roles` endpoints). The secondary variant additionally audit-logs each
 * mutation to `/api/superadmin-actions`.
 *
 * Endpoints:
 *   GET    /api/roles
 *   GET    /api/admin-accounts                 -> { success, admins[] }
 *   POST   /api/admin-accounts                 { adminid, password, role_id }
 *   PUT    /api/admin-accounts/:id             { role_id, status }
 *   POST   /api/admin-accounts/:id/reset-password -> { adminid, tempPassword }
 *   DELETE /api/admin-accounts/:id
 *   POST   /api/admin-accounts/bulk-delete     { ids }
 */

const PROTECTED = "adminSalao";

const DEFAULT_ROLES: Role[] = [
  { id: 1, name: "Super Administrator", hierarchy_level: 100 },
  { id: 7, name: "Assistant Super Administrator", hierarchy_level: 90 },
  { id: 3, name: "Data Manager", hierarchy_level: 50 },
  { id: 4, name: "Content Manager", hierarchy_level: 50 },
  { id: 5, name: "Student Services Manager", hierarchy_level: 50 },
  { id: 6, name: "Accreditation Manager", hierarchy_level: 50 },
];

type Role = { id: number; name: string; hierarchy_level?: number };
type Admin = { id: number; adminid: string; role_id?: number; role_name?: string; status?: string; created_at?: string };
type Toast = { msg: string; type: "success" | "error" | "warning" | "info" };

const formatDate = (s?: string) => (s ? new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A");
const cap = (s?: string) => { const v = s || "active"; return v.charAt(0).toUpperCase() + v.slice(1); };

function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  let p = "";
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export function UserManagementPage({ variant }: { variant: "super" | "secondary" }) {
  const currentAdminId = getStoredAdminId();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);

  type Modal =
    | { kind: "create" }
    | { kind: "edit"; admin: Admin }
    | { kind: "view"; admin: Admin }
    | { kind: "reset"; admin: Admin }
    | { kind: "tempPass"; adminid: string; tempPassword: string }
    | null;
  const [modal, setModal] = useState<Modal>(null);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  async function logAction(action_type: string, target_user: string, details: string) {
    if (variant !== "secondary") return;
    try {
      await api.post("/api/superadmin-actions", {
        adminid: currentAdminId,
        action_type,
        target_user,
        details,
        ip_address: "Unknown",
      });
    } catch {
      /* non-fatal audit log */
    }
  }

  const loadAdmins = useCallback(async () => {
    try {
      const data = await api.get<{ success?: boolean; admins?: Admin[] }>("/api/admin-accounts");
      setAdmins(data.success && data.admins ? data.admins : []);
    } catch {
      setAdmins([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<Role[]>("/api/roles");
        if (Array.isArray(r) && r.length) setRoles(r);
      } catch {
        /* keep defaults */
      }
      await loadAdmins();
      setLoading(false);
    })();
  }, [loadAdmins]);

  const stats = useMemo(() => ({
    total: admins.length,
    active: admins.filter((a) => a.status === "active").length,
    suspended: admins.filter((a) => a.status === "suspended").length,
  }), [admins]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return admins.filter((a) => {
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesSearch = !q || a.adminid.toLowerCase().includes(q) || (a.role_name?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesSearch;
    });
  }, [admins, search, statusFilter]);

  const selectableIds = useMemo(() => filtered.filter((a) => a.adminid !== PROTECTED).map((a) => a.id), [filtered]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? new Set(selectableIds) : new Set());
  }

  async function refresh() {
    await loadAdmins();
    showToast("Refreshed", "success");
  }

  async function deleteAdmin(a: Admin) {
    if (a.adminid === PROTECTED) { showToast("Cannot delete Super Admin", "error"); return; }
    if (!window.confirm(`Delete "${a.adminid}"?`)) return;
    try {
      await api.delete(`/api/admin-accounts/${a.id}`);
      showToast("Deleted", "success");
      logAction("user_deletion", a.adminid, `Deleted admin ${a.adminid}`);
      await loadAdmins();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  async function bulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) { showToast("No selection", "warning"); return; }
    if (!window.confirm(`Delete ${ids.length} admin(s)?`)) return;
    try {
      const data = await api.post<{ count?: number }>("/api/admin-accounts/bulk-delete", { ids });
      showToast(`Deleted ${data.count ?? ids.length}`, "success");
      logAction("user_deletion", `${ids.length} accounts`, "Bulk delete");
      setSelected(new Set());
      await loadAdmins();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Bulk delete failed", "error");
    }
  }

  async function resetPassword(a: Admin) {
    try {
      const data = await api.post<{ adminid: string; tempPassword: string }>(`/api/admin-accounts/${a.id}/reset-password`);
      setModal({ kind: "tempPass", adminid: data.adminid, tempPassword: data.tempPassword });
      logAction("password_reset", a.adminid, `Reset password for ${a.adminid}`);
    } catch {
      showToast("Reset failed", "error");
    }
  }

  if (loading) {
    return (
      <div className="user-mgmt-page">
        <div className="loading-state"><i className="fas fa-spinner fa-spin fa-3x" /><p>Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="user-mgmt-page">
      <div className="user-management-container">
        <div className="um-header">
          <div className="um-header-right">
            <button className="btn-primary" onClick={() => setModal({ kind: "create" })}><i className="fas fa-user-plus" /> Create Admin</button>
            <button className="btn-primary" onClick={refresh}><i className="fas fa-sync-alt" /> Refresh</button>
          </div>
        </div>

        <div className="um-stats-grid">
          <StatCard icon="fa-users" cls="blue" value={stats.total} label="Total Admins" />
          <StatCard icon="fa-user-check" cls="green" value={stats.active} label="Active" />
          <StatCard icon="fa-user-lock" cls="orange" value={stats.suspended} label="Suspended" />
        </div>

        <div className="um-controls">
          <div className="um-search">
            <i className="fas fa-search" />
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="um-filters">
            {(["all", "active", "suspended"] as const).map((f) => (
              <button key={f} className={cx("filter-btn", statusFilter === f && "active")} onClick={() => setStatusFilter(f)}>{cap(f)}</button>
            ))}
          </div>
        </div>

        <div className="um-table-container">
          <table className="um-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectableIds.length > 0 && selected.size === selectableIds.length} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
                <th>Admin ID</th><th>Role</th><th>Created</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell"><i className="fas fa-inbox" /><p>No admins found</p></td></tr>
              ) : (
                filtered.map((a) => {
                  const isProtected = a.adminid === PROTECTED;
                  return (
                    <tr key={a.id}>
                      <td><input type="checkbox" className="user-checkbox" disabled={isProtected} checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} /></td>
                      <td className="user-id"><span className="user-name"><span className="user-avatar"><i className="fas fa-user-shield" /></span><strong>{a.adminid}</strong></span></td>
                      <td><span className={cx("role-badge", `role-${a.role_id ?? "default"}`)}><i className="fas fa-user-tag" /> {a.role_name}</span></td>
                      <td>{formatDate(a.created_at)}</td>
                      <td><span className={cx("status-badge", `status-${a.status || "active"}`)}>{cap(a.status)}</span></td>
                      <td className="actions-cell">
                        <button className="btn-action btn-view" title="View" onClick={() => setModal({ kind: "view", admin: a })}><i className="fas fa-eye" /></button>
                        {!isProtected && (
                          <>
                            <button className="btn-action btn-edit" title="Edit" onClick={() => setModal({ kind: "edit", admin: a })}><i className="fas fa-edit" /></button>
                            <button className="btn-action btn-edit" title="Reset" onClick={() => setModal({ kind: "reset", admin: a })}><i className="fas fa-key" /></button>
                            <button className="btn-action btn-delete" title="Delete" onClick={() => deleteAdmin(a)}><i className="fas fa-trash" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selected.size > 0 && (
          <div className="bulk-actions-bar">
            <span className="selected-count">{selected.size} selected</span>
            <button className="bulk-btn danger" onClick={bulkDelete}><i className="fas fa-trash" /> Delete</button>
          </div>
        )}
      </div>

      {modal?.kind === "create" && (
        <CreateModal
          roles={roles}
          onClose={() => setModal(null)}
          onCreated={async (adminid) => { setModal(null); showToast(`Created ${adminid}`, "success"); logAction("user_creation", adminid, `Created admin ${adminid}`); await loadAdmins(); }}
          onError={(m) => showToast(m, "error")}
        />
      )}
      {modal?.kind === "edit" && (
        <EditModal
          admin={modal.admin}
          roles={roles}
          onClose={() => setModal(null)}
          onSaved={async () => { const id = modal.admin.adminid; setModal(null); showToast("Updated successfully", "success"); logAction("user_status_change", id, `Updated ${id}`); await loadAdmins(); }}
          onError={(m) => showToast(m, "error")}
        />
      )}
      {modal?.kind === "view" && (
        <ViewModal
          admin={modal.admin}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ kind: "edit", admin: modal.admin })}
          onReset={() => setModal({ kind: "reset", admin: modal.admin })}
        />
      )}
      {modal?.kind === "reset" && (
        <ConfirmResetModal admin={modal.admin} onClose={() => setModal(null)} onConfirm={() => resetPassword(modal.admin)} />
      )}
      {modal?.kind === "tempPass" && (
        <TempPassModal adminid={modal.adminid} tempPassword={modal.tempPassword} onClose={() => setModal(null)} onCopied={() => showToast("Copied", "success")} />
      )}

      {toast && (
        <div className={cx("toast", `toast-${toast.type}`, "show")}>
          <i className={cx("fas", toast.type === "success" ? "fa-check-circle" : toast.type === "error" ? "fa-exclamation-circle" : toast.type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle")} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, cls, value, label }: { icon: string; cls: string; value: number; label: string }) {
  return (
    <div className="stat-card">
      <div className={cx("stat-icon", cls)}><i className={cx("fas", icon)} /></div>
      <div className="stat-content"><h3>{value}</h3><p>{label}</p></div>
    </div>
  );
}

function Overlay({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={cx("modal-content", className)} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-input-group">
      <input type={show ? "text" : "password"} value={value} placeholder={placeholder} required onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="toggle-password" onClick={() => setShow((s) => !s)}><i className={cx("fas", show ? "fa-eye-slash" : "fa-eye")} /></button>
    </div>
  );
}

function CreateModal({ roles, onClose, onCreated, onError }: { roles: Role[]; onClose: () => void; onCreated: (adminid: string) => void; onError: (m: string) => void }) {
  const [adminid, setAdminid] = useState("");
  const [roleId, setRoleId] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pass !== confirm) return onError("Passwords do not match");
    if (pass.length < 8) return onError("Password must be 8+ characters");
    setBusy(true);
    try {
      await api.post("/api/admin-accounts", { adminid: adminid.trim(), password: pass, role_id: parseInt(roleId) });
      onCreated(adminid.trim());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="modal-header"><h3><i className="fas fa-user-plus" /> Create Admin</h3><button className="modal-close" onClick={onClose}>×</button></div>
      <form className="modal-body" onSubmit={submit}>
        <div className="form-group"><label>Admin ID *</label><input type="text" required value={adminid} onChange={(e) => setAdminid(e.target.value)} /></div>
        <div className="form-group">
          <label>Role *</label>
          <select required value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Select...</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Password *</label><PasswordField value={pass} onChange={setPass} /></div>
        <div className="form-group"><label>Confirm *</label><PasswordField value={confirm} onChange={setConfirm} /></div>
        <button type="button" className="btn-link" onClick={() => { const p = genPassword(); setPass(p); setConfirm(p); }}><i className="fas fa-random" /> Generate</button>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Creating…" : "Create"}</button>
        </div>
      </form>
    </Overlay>
  );
}

function EditModal({ admin, roles, onClose, onSaved, onError }: { admin: Admin; roles: Role[]; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [roleId, setRoleId] = useState(String(admin.role_id ?? ""));
  const [status, setStatus] = useState(admin.status ?? "active");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/api/admin-accounts/${admin.id}`, { role_id: parseInt(roleId), status });
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="modal-header"><h3><i className="fas fa-edit" /> Edit Admin: {admin.adminid}</h3><button className="modal-close" onClick={onClose}>×</button></div>
      <form className="modal-body" onSubmit={submit}>
        <div className="form-group"><label>Admin ID</label><input type="text" value={admin.adminid} disabled /></div>
        <div className="form-group">
          <label>Role *</label>
          <select required value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Status *</label>
          <select required value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
        </div>
      </form>
    </Overlay>
  );
}

function ViewModal({ admin, onClose, onEdit, onReset }: { admin: Admin; onClose: () => void; onEdit: () => void; onReset: () => void }) {
  return (
    <Overlay onClose={onClose} className="details-modal">
      <div className="modal-header"><h3><i className="fas fa-id-card" /> Admin Details</h3><button className="modal-close" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <div className="details-card">
          <div className="details-header">
            <div className="user-avatar-large"><i className="fas fa-user-shield" /></div>
            <div className="user-header-info">
              <h2>{admin.adminid}</h2>
              <p>{admin.role_name}</p>
              <span className={cx("status-badge", `status-${admin.status || "active"}`)}>{cap(admin.status)}</span>
            </div>
          </div>
          <div className="details-grid">
            <Detail label="Admin ID" value={admin.adminid} />
            <Detail label="Role" value={<span className={cx("role-badge", `role-${admin.role_id}`)}>{admin.role_name}</span>} />
            <Detail label="Created" value={formatDate(admin.created_at)} />
            <Detail label="Status" value={<span className={cx("status-badge", `status-${admin.status || "active"}`)}>{cap(admin.status)}</span>} />
          </div>
        </div>
        {admin.adminid !== PROTECTED && (
          <div className="details-actions">
            <button className="btn-secondary" onClick={onEdit}><i className="fas fa-edit" /> Edit Role/Status</button>
            <button className="btn-secondary" onClick={onReset}><i className="fas fa-key" /> Reset Password</button>
          </div>
        )}
      </div>
    </Overlay>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="detail-item"><div className="detail-label">{label}</div><div className="detail-value">{value}</div></div>;
}

function ConfirmResetModal({ admin, onClose, onConfirm }: { admin: Admin; onClose: () => void; onConfirm: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="modal-header"><h3><i className="fas fa-key" /> Reset Password</h3><button className="modal-close" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <p>Reset password for <strong>{admin.adminid}</strong>?</p>
        <p style={{ color: "#6b7280", fontSize: 14 }}>A temp password will be generated.</p>
      </div>
      <div className="modal-footer">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={onConfirm}>Reset</button>
      </div>
    </Overlay>
  );
}

function TempPassModal({ adminid, tempPassword, onClose, onCopied }: { adminid: string; tempPassword: string; onClose: () => void; onCopied: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="modal-header success"><i className="fas fa-check-circle" /><h3>Password Reset</h3></div>
      <div className="modal-body">
        <p>Temp password for <strong>{adminid}</strong>:</p>
        <div className="temp-password-display">
          <code>{tempPassword}</code>
          <button className="btn-copy" onClick={() => navigator.clipboard.writeText(tempPassword).then(onCopied)}><i className="fas fa-copy" /> Copy</button>
        </div>
        <p className="info-text"><i className="fas fa-info-circle" /> Share securely. Change on first login.</p>
      </div>
      <div className="modal-footer"><button className="btn-primary" onClick={onClose}>Done</button></div>
    </Overlay>
  );
}
