import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { getStoredAdminId } from "@/lib/adminAuth";
import "@/styles/pages/admin/role-management.css";

/**
 * Shared Role Management page (superAdmin + secondarySuperAdmin). Card grid of
 * roles with create/edit (permission checkboxes grouped by module),
 * duplicate, delete, a details modal (assigned users + permissions + history),
 * a global history modal, plus search & sort and summary cards.
 *
 * Endpoints: GET /api/roles, /api/permissions, /api/users, /api/role-history;
 * POST/PUT/DELETE /api/roles[/:id]; POST /api/roles/:id/duplicate.
 */

type Role = {
  id: number;
  name: string;
  description?: string;
  user_count?: number;
  permissions?: string[];
  permission_ids?: number[];
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
};
type PermModule = { module: string; icon: string; permissions: { id: number; name: string }[] };
type RoleUser = { id: number; name: string; email: string; role_id: number };
type History = { id: number; role_id: number; role_name: string; action: string; details: string; user_name: string; timestamp: string };
type Toast = { msg: string; type: "success" | "error" | "warning" | "info" };

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, sec] of intervals) { const i = Math.floor(s / sec); if (i >= 1) return `${i} ${u}${i > 1 ? "s" : ""} ago`; }
  return "just now";
}

export function RoleManagementPage({ variant }: { variant: "super" | "secondary" }) {
  const currentAdminId = getStoredAdminId();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermModule[]>([]);
  const [users, setUsers] = useState<RoleUser[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  type Modal = { kind: "form"; role: Role | null } | { kind: "details"; role: Role } | { kind: "history" } | null;
  const [modal, setModal] = useState<Modal>(null);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  async function logAction(action_type: string, target: string, details: string) {
    if (variant !== "secondary") return;
    try {
      await api.post("/api/superadmin-actions", { adminid: currentAdminId, action_type, target_user: target, details, ip_address: "Unknown" });
    } catch { /* non-fatal */ }
  }

  const fetchRoles = useCallback(async () => {
    try { const r = await api.get<Role[]>("/api/roles"); setRoles(Array.isArray(r) ? r : []); } catch { setRoles([]); }
  }, []);
  const fetchHistory = useCallback(async () => {
    try { const h = await api.get<History[]>("/api/role-history"); setHistory(Array.isArray(h) ? h : []); } catch { setHistory([]); }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([
        fetchRoles(),
        api.get<PermModule[]>("/api/permissions").then((p) => setPermissions(Array.isArray(p) ? p : [])).catch(() => setPermissions([])),
        api.get<RoleUser[]>("/api/users").then((u) => setUsers(Array.isArray(u) ? u : [])).catch(() => setUsers([])),
        fetchHistory(),
      ]);
      setLoading(false);
    })();
  }, [fetchRoles, fetchHistory]);

  const totalPermissions = useMemo(() => permissions.reduce((s, m) => s + m.permissions.length, 0), [permissions]);
  const recentChanges = useMemo(() => history.filter((h) => (Date.now() - new Date(h.timestamp).getTime()) / 86400000 <= 7).length, [history]);

  const visibleRoles = useMemo(() => {
    let list = roles.filter((r) => {
      const q = search.toLowerCase();
      return !q || r.name.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false);
    });
    const by = (a: Role, b: Role) => {
      switch (sort) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "users-desc": return (b.user_count || 0) - (a.user_count || 0);
        case "users-asc": return (a.user_count || 0) - (b.user_count || 0);
        case "recent": return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
        default: return 0;
      }
    };
    return sort ? [...list].sort(by) : list;
  }, [roles, search, sort]);

  async function reload() {
    await Promise.all([fetchRoles(), fetchHistory()]);
  }

  async function duplicate(role: Role) {
    try {
      await api.post(`/api/roles/${role.id}/duplicate`);
      showToast(`Role "${role.name}" duplicated successfully`, "success");
      logAction("role_duplicate", role.name, `Duplicated role ${role.name}`);
      await reload();
    } catch {
      showToast("Failed to duplicate role. Please try again.", "error");
    }
  }

  async function remove(role: Role) {
    if (role.is_system) { showToast("Cannot delete system roles", "error"); return; }
    const msg = (role.user_count ?? 0) > 0
      ? `Delete Role with Users\n\nThis role has ${role.user_count} user(s) assigned. Deleting it will remove their access. Are you sure?`
      : `Delete Role\n\nAre you sure you want to delete the role "${role.name}"? This action cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/api/roles/${role.id}`);
      showToast(`Role "${role.name}" deleted successfully`, "success");
      logAction("role_deletion", role.name, `Deleted role ${role.name}`);
      await reload();
    } catch {
      showToast("Failed to delete role. Please try again.", "error");
    }
  }

  if (loading) {
    return (
      <div className="role-mgmt-page">
        <div className="roles-grid"><div className="empty-state"><i className="fas fa-spinner fa-spin" /><h3>Loading roles...</h3></div></div>
      </div>
    );
  }

  return (
    <div className="role-mgmt-page">
      <div className="roles-header">
        <div className="header-info">
          <h2>Role Management</h2>
          <p className="header-subtitle">Define roles and configure their permissions</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => setModal({ kind: "history" })}><i className="fas fa-history" /> History</button>
          <button className="btn-create-role" onClick={() => setModal({ kind: "form", role: null })}><i className="fas fa-plus" /> Create Role</button>
        </div>
      </div>

      <div className="role-summary-cards">
        <SummaryCard grad="gradient-blue" icon="fa-user-tag" value={roles.length} label="Total Roles" />
        <SummaryCard grad="gradient-green" icon="fa-users" value={users.length} label="Total Users" />
        <SummaryCard grad="gradient-purple" icon="fa-shield-alt" value={totalPermissions} label="Permissions" />
        <SummaryCard grad="gradient-orange" icon="fa-clock-rotate-left" value={recentChanges} label="Recent Changes" />
      </div>

      <div className="roles-toolbar">
        <div className="search-box">
          <i className="fas fa-search" />
          <input className="search-input" placeholder="Search roles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-controls">
          <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="">Sort by...</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="users-desc">Most Users</option>
            <option value="users-asc">Fewest Users</option>
            <option value="recent">Recently Modified</option>
          </select>
        </div>
      </div>

      <div className="roles-grid">
        {visibleRoles.length === 0 ? (
          <div className="empty-state"><i className="fas fa-user-tag" /><h3>No roles found</h3><p>Create your first role to get started</p></div>
        ) : (
          visibleRoles.map((role) => (
            <div className="role-card" key={role.id} onClick={() => setModal({ kind: "details", role })}>
              <div className="role-card-header">
                <div className="role-info">
                  <h3>{role.name}</h3>
                  <p className="role-description">{role.description || "No description"}</p>
                </div>
                <div className="role-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="role-action-btn" title="Edit Role" onClick={() => setModal({ kind: "form", role })}><i className="fas fa-edit" /></button>
                  <button className="role-action-btn" title="Duplicate Role" onClick={() => duplicate(role)}><i className="fas fa-copy" /></button>
                  {!role.is_system && <button className="role-action-btn danger" title="Delete Role" onClick={() => remove(role)}><i className="fas fa-trash" /></button>}
                </div>
              </div>
              <div className="role-stats">
                <div className="stat-box"><span className="stat-number">{role.user_count || 0}</span><span className="stat-label">Users</span></div>
                <div className="stat-box"><span className="stat-number">{role.permissions?.length || 0}</span><span className="stat-label">Permissions</span></div>
              </div>
              <div className="role-permissions-preview">
                <h4>Permissions Preview</h4>
                <div className="permissions-tags">
                  {(role.permissions?.slice(0, 4) ?? []).map((p, i) => <span className="permission-tag" key={i}>{p}</span>)}
                  {(!role.permissions || role.permissions.length === 0) && <span className="permission-tag">No permissions</span>}
                  {role.permissions && role.permissions.length > 4 && <span className="view-more-tag">+{role.permissions.length - 4} more</span>}
                </div>
              </div>
              <div className="role-footer">
                <span className="role-modified">Modified {timeAgo(new Date(role.updated_at || role.created_at || Date.now()))}</span>
                <span className={cx("role-status-badge", role.is_system ? "system" : "active")}>{role.is_system ? "System" : "Active"}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {modal?.kind === "form" && (
        <RoleFormModal
          role={modal.role}
          permissions={permissions}
          onClose={() => setModal(null)}
          onSaved={async (name, isEdit) => {
            setModal(null);
            showToast(`Role "${name}" ${isEdit ? "updated" : "created"} successfully`, "success");
            logAction(isEdit ? "role_update" : "role_creation", name, `${isEdit ? "Updated" : "Created"} role ${name}`);
            await reload();
          }}
          onError={(m) => showToast(m, "error")}
        />
      )}
      {modal?.kind === "details" && (
        <RoleDetailsModal role={modal.role} users={users} history={history} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "history" && (
        <HistoryModal history={history} onClose={() => setModal(null)} />
      )}

      {toast && (
        <div className="toast-container">
          <div className={cx("toast", toast.type, "show")}>
            <div className="toast-icon"><i className={cx("fas", toast.type === "success" ? "fa-check-circle" : toast.type === "error" ? "fa-exclamation-circle" : toast.type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle")} /></div>
            <div className="toast-content"><div className="toast-message">{toast.msg}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ grad, icon, value, label }: { grad: string; icon: string; value: number; label: string }) {
  return (
    <div className={cx("summary-card", grad)}>
      <div className="summary-icon"><i className={cx("fas", icon)} /></div>
      <div className="summary-content"><h3>{value}</h3><p>{label}</p></div>
    </div>
  );
}

function ModalShell({ title, large, onClose, children }: { title: string; large?: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose} />
      <div className={cx("modal-container", large && "large")}>
        <div className="modal-header"><h3>{title}</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function RoleFormModal({ role, permissions, onClose, onSaved, onError }: { role: Role | null; permissions: PermModule[]; onClose: () => void; onSaved: (name: string, isEdit: boolean) => void; onError: (m: string) => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set(role?.permission_ids ?? []));
  const [busy, setBusy] = useState(false);

  function toggle(id: number) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return onError("Please enter a role name");
    if (selected.size === 0) return onError("Please select at least one permission");
    setBusy(true);
    try {
      const body = { name: name.trim(), description: description.trim(), permission_ids: [...selected] };
      if (role) await api.put(`/api/roles/${role.id}`, body);
      else await api.post("/api/roles", body);
      onSaved(name.trim(), !!role);
    } catch {
      onError("Failed to save role. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container large">
        <div className="modal-header"><h3>{role ? "Edit Role" : "Create New Role"}</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Role Name <span className="required">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Content Manager" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this role can do..." />
            </div>
            <div className="form-group">
              <label>Permissions <span className="required">*</span></label>
              <div className="permissions-container">
                {permissions.length === 0 ? (
                  <p style={{ color: "#a0aec0" }}>No permissions available.</p>
                ) : (
                  permissions.map((mod) => (
                    <div className="permission-module" key={mod.module}>
                      <div className="module-header"><i className={mod.icon} /><h4>{mod.module}</h4></div>
                      <div className="module-permissions">
                        {mod.permissions.map((perm) => (
                          <div className="permission-checkbox" key={perm.id}>
                            <input type="checkbox" id={`perm_${perm.id}`} checked={selected.has(perm.id)} onChange={() => toggle(perm.id)} />
                            <label htmlFor={`perm_${perm.id}`}>{perm.name}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={busy}><i className={cx("fas", busy ? "fa-spinner fa-spin" : "fa-save")} /> {busy ? "Saving..." : "Save Role"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RoleDetailsModal({ role, users, history, onClose }: { role: Role; users: RoleUser[]; history: History[]; onClose: () => void }) {
  const roleUsers = users.filter((u) => u.role_id === role.id);
  const roleHistory = history.filter((h) => h.role_id === role.id).slice(0, 5);
  return (
    <ModalShell title={`${role.name} - Details`} large onClose={onClose}>
      <div className="role-details-content">
        <div className="details-section">
          <h4><i className="fas fa-info-circle" /> Basic Information</h4>
          <div className="details-grid">
            <DetailItem label="Role Name" value={role.name} />
            <DetailItem label="Description" value={role.description || "N/A"} />
            <DetailItem label="Created Date" value={role.created_at ? new Date(role.created_at).toLocaleDateString() : "N/A"} />
            <DetailItem label="Last Modified" value={new Date(role.updated_at || role.created_at || Date.now()).toLocaleDateString()} />
          </div>
        </div>
        <div className="details-section">
          <h4><i className="fas fa-users" /> Assigned Users ({roleUsers.length})</h4>
          {roleUsers.length > 0 ? (
            <div className="users-list">
              {roleUsers.map((u) => (
                <div className="user-item" key={u.id}>
                  <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                  <div className="user-info"><div className="user-name">{u.name}</div><div className="user-email">{u.email}</div></div>
                </div>
              ))}
            </div>
          ) : <p>No users assigned to this role yet.</p>}
        </div>
        <div className="details-section">
          <h4><i className="fas fa-shield-alt" /> Permissions ({role.permissions?.length || 0})</h4>
          {role.permissions && role.permissions.length > 0 ? (
            <div className="permissions-list">
              {role.permissions.map((p, i) => <div className="permission-item" key={i}><i className="fas fa-check-circle" /><span>{p}</span></div>)}
            </div>
          ) : <p>No permissions assigned to this role.</p>}
        </div>
        <div className="details-section">
          <h4><i className="fas fa-history" /> Recent Changes</h4>
          {roleHistory.length > 0 ? <Timeline items={roleHistory} /> : <p>No history available for this role.</p>}
        </div>
      </div>
    </ModalShell>
  );
}

function HistoryModal({ history, onClose }: { history: History[]; onClose: () => void }) {
  return (
    <ModalShell title="Role Change History" onClose={onClose}>
      <div className="history-content">
        {history.length === 0 ? <p className="no-data">No history available yet.</p> : <Timeline items={history.slice(0, 20)} showRole />}
      </div>
    </ModalShell>
  );
}

function Timeline({ items, showRole }: { items: History[]; showRole?: boolean }) {
  return (
    <div className="history-timeline">
      {items.map((h) => (
        <div className="history-item" key={h.id}>
          <div className="history-header"><span className="history-action">{h.action}</span><span className="history-timestamp">{timeAgo(new Date(h.timestamp))}</span></div>
          <div className="history-details">{h.details}</div>
          <div className="history-user">By: {h.user_name}{showRole ? ` | Role: ${h.role_name}` : ""}</div>
        </div>
      ))}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="detail-item"><div className="label">{label}</div><div className="value">{value}</div></div>;
}
