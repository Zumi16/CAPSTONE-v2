import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/forms-repository.css";

/**
 * adminAve → Forms Repository.
 *
 * Where the admin stores the forms shown on the public "Downloadable Forms"
 * page. A folder/file browser over the backend `/api/forms` store. Built-in
 * folders (those with no parent — OJT Forms / Proposal Forms / Other Student
 * Forms) are the public categories and cannot be deleted.
 * Favorites and "trash" are kept client-side in localStorage exactly like the
 * legacy page; only *permanent* deletes hit the backend (DELETE /files/:id and
 * DELETE /folders/:id). Files preview in a modal (image / PDF / spreadsheet /
 * JSON / text), and selection supports Ctrl/Cmd-click, Shift-range and
 * double-click to open.
 */

const API_BASE = "/api/forms";
const FAV_KEY = "forms_favorites";
const TRASH_KEY = "forms_trash";

type Folder = { id: number; name: string; parent_id: number | null };
type RepoFile = {
  id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  folder_id: number | null;
  description?: string | null;
  created_at?: string;
  uploaded_at?: string;
};

type Filter = "all" | "recent" | "favorites" | "trash";
type RepoItem =
  | { kind: "folder"; data: Folder }
  | { kind: "file"; data: RepoFile };

function loadSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}

function escapeForView(text: string): string {
  return text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

export function FormsRepositoryPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet(FAV_KEY));
  const [trash, setTrash] = useState<Set<string>>(() => loadSet(TRASH_KEY));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastSelectedIndex = useRef(-1);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [preview, setPreview] = useState<RepoFile | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [editingFile, setEditingFile] = useState<RepoFile | null>(null);

  // ----- data -----
  const folderMap = useMemo(() => {
    const map = new Map<number, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  const builtInIds = useMemo(() => {
    const set = new Set<number>();
    folders.forEach((f) => {
      if (f.parent_id == null) set.add(f.id);
    });
    return set;
  }, [folders]);

  const isBuiltIn = useCallback((id: number) => builtInIds.has(id), [builtInIds]);

  const fetchData = useCallback(async () => {
    try {
      const [fol, fil] = await Promise.all([
        api.get<{ folders?: Folder[] }>(`${API_BASE}/folders?all=true`),
        api.get<{ files?: RepoFile[] }>(`${API_BASE}/files?all=true`),
      ]);
      setFolders(fol.folders ?? []);
      setFiles(fil.files ?? []);
    } catch (err) {
      console.error("Error loading forms repository:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSelected(new Set());
    lastSelectedIndex.current = -1;
  }, [filter, currentFolderId]);

  // Close any open dot-menu on outside click.
  useEffect(() => {
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const persistFavorites = (next: Set<string>) => {
    setFavorites(next);
    localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
  };
  const persistTrash = (next: Set<string>) => {
    setTrash(next);
    localStorage.setItem(TRASH_KEY, JSON.stringify([...next]));
  };

  const isFavorite = (key: string) => favorites.has(key);
  const isTrashed = (key: string) => trash.has(key);

  function toggleFavorite(key: string) {
    const next = new Set(favorites);
    next.has(key) ? next.delete(key) : next.add(key);
    persistFavorites(next);
  }

  function toggleTrash(kind: "folder" | "file", id: number) {
    if (kind === "folder" && isBuiltIn(id)) {
      window.alert("Built-in folders cannot be deleted.");
      return;
    }
    const key = `${kind}-${id}`;
    const next = new Set(trash);
    next.has(key) ? next.delete(key) : next.add(key);
    persistTrash(next);
  }

  // ----- visible items (filter + folder scope + search) -----
  const visibleItems: RepoItem[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (name: string) => !q || name.toLowerCase().includes(q);

    let fld: Folder[] = [];
    let fil: RepoFile[] = [];

    if (filter === "recent") {
      fil = [...files]
        .filter((f) => !isTrashed(`file-${f.id}`))
        .sort((a, b) => {
          const da = new Date(a.created_at || a.uploaded_at || 0).getTime();
          const db = new Date(b.created_at || b.uploaded_at || 0).getTime();
          if (isNaN(da) && isNaN(db)) return b.id - a.id;
          return db - da;
        })
        .slice(0, 10);
    } else if (filter === "favorites") {
      fld = folders.filter((f) => isFavorite(`folder-${f.id}`) && !isTrashed(`folder-${f.id}`));
      fil = files.filter((f) => isFavorite(`file-${f.id}`) && !isTrashed(`file-${f.id}`));
    } else if (filter === "trash") {
      fld = folders.filter((f) => isTrashed(`folder-${f.id}`));
      fil = files.filter((f) => isTrashed(`file-${f.id}`));
    } else {
      // "all" — scope to the current folder (or root built-ins).
      fld = folders.filter(
        (f) => !isTrashed(`folder-${f.id}`) && (f.parent_id ?? null) === currentFolderId,
      );
      fil = files.filter(
        (f) => !isTrashed(`file-${f.id}`) && (f.folder_id ?? null) === currentFolderId,
      );
    }

    return [
      ...fld.filter((f) => matches(f.name)).map((data) => ({ kind: "folder" as const, data })),
      ...fil.filter((f) => matches(f.file_name)).map((data) => ({ kind: "file" as const, data })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, files, filter, currentFolderId, search, favorites, trash]);

  // ----- breadcrumb -----
  const breadcrumb = useMemo(() => {
    if (filter !== "all") {
      const label = { recent: "Recent", favorites: "Favorites", trash: "Trash" }[filter];
      return [{ id: null as number | null, name: label }];
    }
    const trail = [{ id: null as number | null, name: "Forms Repository" }];
    if (currentFolderId == null) return trail;
    const parts: { id: number; name: string }[] = [];
    let cursor: Folder | undefined = folderMap.get(currentFolderId);
    while (cursor) {
      parts.unshift({ id: cursor.id, name: cursor.name });
      cursor = cursor.parent_id != null ? folderMap.get(cursor.parent_id) : undefined;
    }
    return [...trail, ...parts];
  }, [filter, currentFolderId, folderMap]);

  // ----- selection -----
  function onItemClick(e: React.MouseEvent, key: string, index: number) {
    if (e.shiftKey && lastSelectedIndex.current !== -1) {
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);
      const next = new Set(selected);
      for (let i = start; i <= end; i++) {
        const it = visibleItems[i];
        if (it) next.add(`${it.kind}-${it.data.id}`);
      }
      setSelected(next);
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      const next = new Set(selected);
      next.has(key) ? next.delete(key) : next.add(key);
      setSelected(next);
      lastSelectedIndex.current = index;
    }
  }

  function onItemDoubleClick(item: RepoItem) {
    if (item.kind === "folder") {
      if (filter === "favorites") {
        window.alert("Please switch to 'All' view to navigate into folders");
        return;
      }
      setFilter("all");
      setCurrentFolderId(item.data.id);
    } else {
      setPreview(item.data);
    }
  }

  // ----- permanent delete (backend) -----
  async function deleteFilePermanent(id: number): Promise<boolean> {
    try {
      await api.delete(`${API_BASE}/files/${id}`);
      return true;
    } catch (err) {
      console.error(`Error deleting file ${id}:`, err);
      return false;
    }
  }
  async function deleteFolderPermanent(id: number): Promise<boolean> {
    if (isBuiltIn(id)) {
      window.alert("Built-in folders cannot be deleted.");
      return false;
    }
    try {
      await api.delete(`${API_BASE}/folders/${id}`);
      return true;
    } catch (err) {
      console.error(`Error deleting folder ${id}:`, err);
      return false;
    }
  }

  function forgetKeys(keys: string[]) {
    const f = new Set(favorites);
    const t = new Set(trash);
    keys.forEach((k) => {
      f.delete(k);
      t.delete(k);
    });
    persistFavorites(f);
    persistTrash(t);
  }

  async function deleteOnePermanent(kind: "folder" | "file", id: number, name: string) {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    const ok = kind === "file" ? await deleteFilePermanent(id) : await deleteFolderPermanent(id);
    if (ok) forgetKeys([`${kind}-${id}`]);
    await fetchData();
  }

  // ----- upload / edit details -----
  function openUpload() {
    if (currentFolderId == null) {
      window.alert("Open a category folder (OJT Forms, Proposal Forms, or Other Student Forms) first, then upload into it.");
      return;
    }
    setShowUpload(true);
  }

  async function uploadFile(file: File, description: string) {
    if (currentFolderId == null) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder_id", String(currentFolderId));
    if (description.trim()) formData.append("description", description.trim());
    await api.post(`${API_BASE}/files`, formData);
    await fetchData();
  }

  async function saveFileDetails(id: number, file_name: string, description: string) {
    await api.put(`${API_BASE}/files/${id}`, { file_name, description });
    await fetchData();
  }

  // ----- bulk actions -----
  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkDownload() {
    const fileKeys = [...selected].filter((k) => k.startsWith("file-"));
    if (fileKeys.length === 0) {
      window.alert("No files selected for download. Please select files only.");
      return;
    }
    for (const key of fileKeys) {
      const id = Number(key.slice("file-".length));
      const file = files.find((f) => f.id === id);
      if (!file) continue;
      const link = document.createElement("a");
      link.href = assetUrl(file.file_path);
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise((r) => setTimeout(r, 300));
    }
    clearSelection();
  }

  function bulkMoveToTrash() {
    if (selected.size === 0) return;
    const hasBuiltIn = [...selected].some((k) => {
      const [type, id] = k.split("-");
      return type === "folder" && isBuiltIn(Number(id));
    });
    if (hasBuiltIn) {
      window.alert("Category folders (OJT Forms, Proposal Forms, Other Student Forms) cannot be deleted.");
      return;
    }
    if (!window.confirm(`Move ${selected.size} item(s) to trash?`)) return;
    const next = new Set(trash);
    selected.forEach((k) => next.add(k));
    persistTrash(next);
    clearSelection();
  }

  async function bulkDeletePermanently() {
    if (selected.size === 0) return;
    const keys = [...selected];
    const hasBuiltIn = keys.some((k) => {
      const [type, id] = k.split("-");
      return type === "folder" && isBuiltIn(Number(id));
    });
    if (hasBuiltIn) {
      window.alert("Category folders (OJT Forms, Proposal Forms, Other Student Forms) cannot be deleted.");
      return;
    }
    if (!window.confirm(`Permanently delete ${keys.length} item(s)? This action cannot be undone!`)) return;
    const removed: string[] = [];
    for (const key of keys) {
      const [type, idStr] = key.split("-");
      const id = Number(idStr);
      const ok = type === "file" ? await deleteFilePermanent(id) : !isBuiltIn(id) && (await deleteFolderPermanent(id));
      if (ok) removed.push(key);
    }
    forgetKeys(removed);
    clearSelection();
    await fetchData();
  }

  async function emptyTrashAll() {
    if (trash.size === 0) {
      window.alert("Trash is already empty.");
      return;
    }
    if (!window.confirm("Permanently delete everything in Trash? This cannot be undone.")) return;
    const removed: string[] = [];
    for (const key of [...trash]) {
      const [type, idStr] = key.split("-");
      const id = Number(idStr);
      if (type === "file") {
        if (await deleteFilePermanent(id)) removed.push(key);
      } else if (!isBuiltIn(id)) {
        if (await deleteFolderPermanent(id)) removed.push(key);
      } else {
        removed.push(key); // drop built-in folders from trash list
      }
    }
    forgetKeys(removed);
    await fetchData();
  }

  const FILTERS: { icon: string; title: string; value: Filter }[] = [
    { icon: "fa-th", title: "All", value: "all" },
    { icon: "fa-clock", title: "Recent", value: "recent" },
    { icon: "fa-star", title: "Favorites", value: "favorites" },
    { icon: "fa-trash", title: "Trash", value: "trash" },
  ];

  return (
    <div className="forms-repo-page">
      <div className="repository-header-wrapper">
        <div className="repository-header">
          <div className="header-left-controls">
            {filter === "all" && (
              <button className="add-btn upload-btn" type="button" onClick={openUpload}>
                <i className="fa fa-upload" /> Upload Form
              </button>
            )}
            {filter === "trash" && (
              <button className="add-btn empty-trash-btn" type="button" onClick={emptyTrashAll}>
                Empty Trash
              </button>
            )}
            {selected.size > 0 && (
              <div className="bulk-actions">
                <span className="selection-count">
                  {selected.size} item{selected.size > 1 ? "s" : ""} selected
                </span>
                <button className="bulk-btn download-bulk-btn" onClick={bulkDownload}>
                  <i className="fa fa-download" /> Download
                </button>
                <button className="bulk-btn trash-bulk-btn" onClick={bulkMoveToTrash}>
                  <i className="fa fa-trash" /> Move to Trash
                </button>
                <button className="bulk-btn delete-bulk-btn" onClick={bulkDeletePermanently}>
                  <i className="fa fa-trash-alt" /> Delete Permanently
                </button>
                <button className="bulk-btn cancel-bulk-btn" onClick={clearSelection}>
                  <i className="fa fa-times" />
                </button>
              </div>
            )}
          </div>

          <div className="header-right-controls">
            <input
              type="text"
              className="repository-search"
              placeholder="Search files or folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="repository-filters">
              {FILTERS.map(({ icon, title, value }) => (
                <i
                  key={value}
                  className={cx("fa", icon)}
                  title={title}
                  style={{ cursor: "pointer", color: filter === value ? "#a91c1c" : undefined }}
                  onClick={() => {
                    setFilter(value);
                    if (value !== "all") setCurrentFolderId(null);
                    if (value === "all") setCurrentFolderId(null);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="breadcrumb-trail">
        {breadcrumb.map((part, i) => {
          const isLast = i === breadcrumb.length - 1;
          return (
            <span key={`${part.id}-${i}`} style={{ display: "contents" }}>
              <span
                className={cx("breadcrumb-part", isLast && "breadcrumb-current")}
                style={{ cursor: isLast ? undefined : "pointer" }}
                onClick={() => {
                  if (isLast) return;
                  setFilter("all");
                  setCurrentFolderId(part.id);
                }}
              >
                {part.name}
              </span>
              {!isLast && <span className="breadcrumb-separator"> | </span>}
            </span>
          );
        })}
      </div>

      <div className="repository-items">
        {visibleItems.length === 0 ? (
          <div className="repository-empty">
            <i className="fa fa-folder-open" />
            <p>Nothing here yet.</p>
          </div>
        ) : (
          visibleItems.map((item, index) => {
            const id = item.data.id;
            const key = `${item.kind}-${id}`;
            const name = item.kind === "folder" ? item.data.name : item.data.file_name;
            const fav = isFavorite(key);
            return (
              <div
                key={key}
                className={cx("repository-item", selected.has(key) && "selected")}
                style={fav ? { backgroundColor: "rgba(255, 193, 7, 0.15)", border: "1px solid #ffc107" } : undefined}
                onClick={(e) => onItemClick(e, key, index)}
                onDoubleClick={() => onItemDoubleClick(item)}
              >
                <i className={item.kind === "folder" ? "fa fa-folder" : "fa fa-file"} />
                <span
                  className="item-label"
                  title={item.kind === "file" && item.data.description ? `${name}\n${item.data.description}` : name}
                >
                  {name}
                </span>

                <div
                  className="dot-menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu((cur) => (cur === key ? null : key));
                  }}
                >
                  <i className="fa fa-ellipsis-v" />
                </div>

                <div className={cx("dropdown-menu", openMenu !== key && "hidden")} onClick={(e) => e.stopPropagation()}>
                  <button className="favorite-btn" onClick={() => { toggleFavorite(key); setOpenMenu(null); }}>
                    {fav ? "Unfavorite" : "Add to Favorites"}
                  </button>

                  {filter === "trash" ? (
                    <>
                      <button
                        className="restore-btn"
                        onClick={() => {
                          const next = new Set(trash);
                          next.delete(key);
                          persistTrash(next);
                          setOpenMenu(null);
                        }}
                      >
                        Restore
                      </button>
                      {(item.kind === "file" || !isBuiltIn(id)) && (
                        <button
                          className="delete-perm-btn"
                          onClick={() => { setOpenMenu(null); deleteOnePermanent(item.kind, id, name); }}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  ) : (
                    (item.kind === "file" || !isBuiltIn(id)) && (
                      <button
                        className="move-trash-btn"
                        onClick={() => { toggleTrash(item.kind, id); setOpenMenu(null); }}
                      >
                        Move to Trash
                      </button>
                    )
                  )}

                  {item.kind === "file" && (
                    <button
                      className="download-btn"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = assetUrl(item.data.file_path);
                        link.download = item.data.file_name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setOpenMenu(null);
                      }}
                    >
                      Download
                    </button>
                  )}

                  {item.kind === "file" && filter !== "trash" && (
                    <button
                      className="edit-details-btn"
                      onClick={() => { setEditingFile(item.data); setOpenMenu(null); }}
                    >
                      Rename / Edit Details
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}

      {showUpload && currentFolderId != null && (
        <UploadModal
          folderName={folderMap.get(currentFolderId)?.name ?? "this folder"}
          onClose={() => setShowUpload(false)}
          onUpload={uploadFile}
        />
      )}

      {editingFile && (
        <EditDetailsModal
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onSave={saveFileDetails}
        />
      )}
    </div>
  );
}

/** Modal to upload a new form into the currently open folder. */
function UploadModal({
  folderName,
  onClose,
  onUpload,
}: {
  folderName: string;
  onClose: () => void;
  onUpload: (file: File, description: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpload(file, description);
      onClose();
    } catch (err) {
      console.error("Error uploading form:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-root">
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal-container form-modal">
        <div className="modal-header">
          <h3>Upload Form — {folderName}</h3>
          <button className="modal-close" onClick={onClose} disabled={busy}>
            <i className="fa fa-times" />
          </button>
        </div>
        <div className="modal-body form-modal-body">
          <label className="form-field">
            <span>File</span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
          </label>
          <label className="form-field">
            <span>Description (what this form is for)</span>
            <textarea
              rows={4}
              placeholder="e.g. Required waiver for OJT deployment, submit before start of internship."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel-modal-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="modal-btn download-modal-btn" onClick={submit} disabled={busy}>
            <i className="fa fa-upload" /> {busy ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

/** Modal to rename a file and/or edit its description. */
function EditDetailsModal({
  file,
  onClose,
  onSave,
}: {
  file: RepoFile;
  onClose: () => void;
  onSave: (id: number, file_name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState(file.file_name);
  const [description, setDescription] = useState(file.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("File name cannot be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(file.id, name.trim(), description);
      onClose();
    } catch (err) {
      console.error("Error saving file details:", err);
      setError("Save failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-root">
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal-container form-modal">
        <div className="modal-header">
          <h3>Edit Details</h3>
          <button className="modal-close" onClick={onClose} disabled={busy}>
            <i className="fa fa-times" />
          </button>
        </div>
        <div className="modal-body form-modal-body">
          <label className="form-field">
            <span>File name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="form-field">
            <span>Description (what this form is for)</span>
            <textarea
              rows={4}
              placeholder="e.g. Required waiver for OJT deployment, submit before start of internship."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="modal-btn cancel-modal-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="modal-btn download-modal-btn" onClick={submit} disabled={busy}>
            <i className="fa fa-save" /> {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

/** Modal preview for a single file (image / PDF / spreadsheet / JSON / text). */
function FilePreviewModal({ file, onClose }: { file: RepoFile; onClose: () => void }) {
  const [body, setBody] = useState<React.ReactNode>(<div className="loading">Loading...</div>);
  const url = assetUrl(file.file_path);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const download = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = file.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    let cancelled = false;
    const ext = (file.file_name.split(".").pop() || "").toLowerCase();
    const type = file.file_type || "";
    const downloadCard = (icon: string, color: string, label: string, note: string) => (
      <div style={{ padding: 20, textAlign: "center" }}>
        <i className={cx("fa", icon)} style={{ fontSize: 64, color, marginBottom: 20 }} />
        <p style={{ fontSize: "1.1rem", marginBottom: 10 }}>{label}</p>
        <p style={{ color: "#666" }}>{note}</p>
        <button className="modal-btn download-modal-btn" style={{ marginTop: 15 }} onClick={download}>
          <i className="fa fa-download" /> Download to View
        </button>
      </div>
    );

    (async () => {
      try {
        if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext) || type.startsWith("image/")) {
          setBody(
            <div style={{ width: "100%", height: "70vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
              <img src={url} alt={file.file_name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }} />
            </div>,
          );
        } else if (ext === "pdf" || type === "application/pdf") {
          setBody(<iframe title={file.file_name} src={url} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8 }} />);
        } else if (["xlsx", "xls", "csv"].includes(ext) || type.includes("spreadsheet") || type === "text/csv") {
          const buf = await (await fetch(url)).arrayBuffer();
          const wb =
            ext === "csv" || type === "text/csv"
              ? XLSX.read(new TextDecoder().decode(new Uint8Array(buf)), { type: "string" })
              : XLSX.read(buf, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const html = XLSX.utils.sheet_to_html(sheet, { id: "preview-table" });
          if (!cancelled) {
            setBody(
              <div style={{ width: "100%", height: "70vh", overflow: "auto" }}>
                <div className="preview-table-wrap" dangerouslySetInnerHTML={{ __html: html }} />
              </div>,
            );
          }
        } else if (ext === "json" || type === "application/json") {
          const json = await (await fetch(url)).json();
          if (!cancelled) setBody(<pre className="preview-pre">{escapeForView(JSON.stringify(json, null, 2))}</pre>);
        } else if (["txt", "text"].includes(ext) || type.startsWith("text/")) {
          const text = await (await fetch(url)).text();
          if (!cancelled) setBody(<pre className="preview-pre">{escapeForView(text)}</pre>);
        } else if (["doc", "docx"].includes(ext) || type.includes("word") || type.includes("document")) {
          setBody(downloadCard("fa-file-word", "#2b579a", "Word Document", "Preview not available for Word documents."));
        } else if (["ppt", "pptx"].includes(ext) || type.includes("presentation")) {
          setBody(downloadCard("fa-file-powerpoint", "#d24726", "PowerPoint Presentation", "Preview not available for PowerPoint files."));
        } else {
          setBody(downloadCard("fa-file", "#666", file.file_name, "Preview not available for this file type."));
        }
      } catch (err) {
        console.error("Error loading file preview:", err);
        if (!cancelled) {
          setBody(
            <div style={{ padding: 20, textAlign: "center", color: "#d32f2f" }}>
              <i className="fa fa-exclamation-triangle" style={{ fontSize: 48, marginBottom: 15 }} />
              <p>Error loading file preview.</p>
              <button className="modal-btn download-modal-btn" style={{ marginTop: 15 }} onClick={download}>
                <i className="fa fa-download" /> Download Instead
              </button>
            </div>,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div id="filePreviewModal">
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-container">
          <div className="modal-header">
            <h3>{file.file_name}</h3>
            <button className="modal-close" onClick={onClose}>
              <i className="fa fa-times" />
            </button>
          </div>
          <div className="modal-body">{body}</div>
          <div className="modal-footer">
            <button className="modal-btn download-modal-btn" onClick={download}>
              <i className="fa fa-download" /> Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
