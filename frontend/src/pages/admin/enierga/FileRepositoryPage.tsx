import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/file-repository.css";

type Filter = "all" | "recent" | "favorites" | "trash";

type FolderItem = {
  id: number;
  name: string;
  parent_id: number | null;
  is_trashed?: boolean;
};

type FileItem = {
  id: number;
  file_name?: string;
  filename?: string;
  file_path: string;
  file_type?: string;
  created_at?: string;
  uploaded_at?: string;
  trashed_at?: string;
  is_trashed?: boolean;
  folder_id?: number | null;
};

const FILTERS: { icon: string; title: string; filter: Filter }[] = [
  { icon: "fa-th", title: "All", filter: "all" },
  { icon: "fa-clock", title: "Recent", filter: "recent" },
  { icon: "fa-star", title: "Favorites", filter: "favorites" },
  { icon: "fa-trash", title: "Trash", filter: "trash" },
];

const fileName = (f: FileItem) => f.file_name || f.filename || "Unknown";

function downloadFile(path: string, name: string) {
  const link = document.createElement("a");
  link.href = assetUrl(path);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function FileRepositoryPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
  );
  const [preview, setPreview] = useState<{ file: FileItem; body: React.ReactNode } | null>(null);

  const folderMap = useRef<Record<number, FolderItem>>({});
  const lastClick = useRef<{ key: string; time: number }>({ key: "", time: 0 });

  const isFav = (id: number, type: "file" | "folder") => favorites.has(`${type}-${id}`);

  const saveFavorites = (next: Set<string>) => {
    setFavorites(next);
    localStorage.setItem("favorites", JSON.stringify([...next]));
  };

  const load = useCallback(async () => {
    try {
      const wantAll = ["favorites", "recent", "trash"].includes(filter);
      const foldersData = await api.get<{ folders: FolderItem[] }>(
        `/api/files/folders${wantAll ? "?all=true" : folderId ? `?parent_id=${folderId}` : ""}`,
      );
      const filesData =
        filter === "trash"
          ? await api.get<{ files: FileItem[] }>("/api/trash")
          : await api.get<{ files: FileItem[] }>(
              `/api/files/files${wantAll ? "?all=true" : folderId ? `?folder_id=${folderId}` : ""}`,
            );

      const allFolders = foldersData.folders || [];
      const allFiles = filesData.files || [];
      allFolders.forEach((f) => {
        if (f?.id !== undefined) folderMap.current[f.id] = f;
      });

      let fFolders = allFolders.filter((f) => !f.is_trashed);
      let fFiles = allFiles.filter((f) => filter === "trash" || !f.is_trashed);

      if (filter === "recent") {
        fFolders = [];
        fFiles = [...fFiles]
          .sort(
            (a, b) =>
              new Date(b.created_at || b.uploaded_at || 0).getTime() -
              new Date(a.created_at || a.uploaded_at || 0).getTime(),
          )
          .slice(0, 10);
      } else if (filter === "favorites") {
        fFolders = fFolders.filter((f) => isFav(f.id, "folder"));
        fFiles = fFiles.filter((f) => isFav(f.id, "file"));
      } else if (filter === "trash") {
        fFolders = [];
      } else if (filter === "all" && folderId) {
        fFolders = fFolders.filter((f) => f.parent_id === folderId);
        fFiles = fFiles.filter((f) => f.folder_id === folderId);
      }

      setFolders(fFolders);
      setFiles(fFiles);
      setSelected(new Set());
    } catch (err) {
      console.error("Error loading repository:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, folderId, favorites]);

  useEffect(() => {
    load();
  }, [load]);

  // Close any open dot menu on outside click.
  useEffect(() => {
    const onClick = () => setOpenMenu(null);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleItemClick = (
    e: React.MouseEvent,
    item: FileItem | FolderItem,
    type: "file" | "folder",
  ) => {
    const key = `${type}-${item.id}`;
    const now = Date.now();
    const isDouble = now - lastClick.current.time < 300 && lastClick.current.key === key;
    lastClick.current = { key, time: now };

    if (isDouble) {
      if (type === "folder") {
        if (filter === "favorites") {
          window.alert("Switch to 'All' view to navigate into folders.");
          return;
        }
        setFolderId(item.id);
        setFilter("all");
      } else {
        openPreview(item as FileItem);
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      toggleSelect(key);
      return;
    }
    setSelected(new Set([key]));
  };

  const toggleFavorite = (id: number, type: "file" | "folder") => {
    const favId = `${type}-${id}`;
    const next = new Set(favorites);
    if (next.has(favId)) next.delete(favId);
    else next.add(favId);
    saveFavorites(next);
  };

  const moveToTrash = async (id: number, name: string) => {
    try {
      await api.post(`/api/trash/move/${id}`);
      window.alert(`"${name}" moved to trash.`);
      load();
    } catch {
      window.alert("Failed to move to trash.");
    }
  };

  const restore = async (id: number, name: string) => {
    try {
      await api.post(`/api/trash/restore/${id}`);
      window.alert(`"${name}" restored.`);
      load();
    } catch {
      window.alert("Failed to restore.");
    }
  };

  const deletePermanent = async (id: number, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/trash/permanent/${id}`);
      const next = new Set(favorites);
      next.delete(`file-${id}`);
      saveFavorites(next);
      load();
    } catch {
      window.alert("Failed to delete permanently.");
    }
  };

  const emptyTrash = async () => {
    if (!window.confirm("Permanently delete all items in trash? This cannot be undone!")) return;
    try {
      const res = await api.delete<{ deletedCount: number }>("/api/trash/empty");
      window.alert(`Trash emptied: ${res.deletedCount} file(s) deleted.`);
      load();
    } catch {
      window.alert("Failed to empty trash.");
    }
  };

  const bulkDownload = () => {
    const fileKeys = [...selected].filter((k) => k.startsWith("file-"));
    fileKeys.forEach((k) => {
      const id = Number(k.split("-")[1]);
      const f = files.find((x) => x.id === id);
      if (f) downloadFile(f.file_path, fileName(f));
    });
    setSelected(new Set());
  };

  const bulkTrash = async () => {
    if (!window.confirm(`Move ${selected.size} item(s) to trash?`)) return;
    for (const k of selected) {
      const [type, id] = k.split("-");
      if (type === "file") {
        try {
          await api.post(`/api/trash/move/${id}`);
        } catch {
          /* skip */
        }
      }
    }
    load();
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Permanently delete ${selected.size} item(s)? This cannot be undone!`)) return;
    for (const k of selected) {
      const [type, id] = k.split("-");
      try {
        if (type === "file") await api.delete(`/api/trash/permanent/${id}`);
        else await api.delete(`/api/files/folders/${id}`);
      } catch {
        /* skip */
      }
    }
    load();
  };

  const openPreview = async (file: FileItem) => {
    setPreview({ file, body: <div>Loading…</div> });
    const ext = fileName(file).split(".").pop()?.toLowerCase();
    try {
      const res = await fetch(assetUrl(file.file_path));
      if (ext === "json" || file.file_type === "application/json") {
        const json = await res.json();
        setPreview({ file, body: <pre>{JSON.stringify(json, null, 2)}</pre> });
      } else if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        const buf = await res.arrayBuffer();
        const wb =
          ext === "csv"
            ? XLSX.read(new TextDecoder().decode(new Uint8Array(buf)), { type: "string" })
            : XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        setPreview({
          file,
          body: (
            <table>
              <tbody>
                {aoa.slice(0, 200).map((row, i) => (
                  <tr key={i}>
                    {(row as unknown[]).map((cell, j) =>
                      i === 0 ? (
                        <th key={j}>{String(cell ?? "")}</th>
                      ) : (
                        <td key={j}>{String(cell ?? "")}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ),
        });
      } else {
        setPreview({ file, body: <p>Preview not available for this file type.</p> });
      }
    } catch {
      setPreview({ file, body: <p style={{ color: "#d32f2f" }}>Error loading file preview.</p> });
    }
  };

  // Build the breadcrumb trail from folderMap.
  const trail: { id: number | null; name: string }[] = (() => {
    if (filter !== "all") {
      const labels: Record<string, string> = {
        recent: "Recent",
        favorites: "Favorites",
        trash: "Trash",
      };
      return [{ id: null, name: labels[filter] ?? "Repository" }];
    }
    const base = [{ id: null as number | null, name: "Repository" }];
    if (!folderId) return base;
    const parts: { id: number; name: string }[] = [];
    let cursor: FolderItem | undefined = folderMap.current[folderId];
    while (cursor) {
      parts.unshift({ id: cursor.id, name: cursor.name });
      cursor = cursor.parent_id ? folderMap.current[cursor.parent_id] : undefined;
    }
    return [...base, ...parts];
  })();

  const matchesSearch = (name: string) => name.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="fr-page">
      <div className="repository-header">
        <div className="header-left-controls">
          {filter === "trash" && (
            <button className="add-btn empty-trash-btn" onClick={emptyTrash}>
              Empty Trash
            </button>
          )}
          {selected.size > 0 && (
            <div className="bulk-actions" style={{ display: "flex" }}>
              <span className="selection-count">
                {selected.size} item{selected.size > 1 ? "s" : ""} selected
              </span>
              {filter === "trash" ? (
                <button className="bulk-btn delete-bulk-btn" onClick={bulkDelete}>
                  <i className="fa fa-trash-alt" /> Delete Permanently
                </button>
              ) : (
                <>
                  <button className="bulk-btn download-bulk-btn" onClick={bulkDownload}>
                    <i className="fa fa-download" /> Download
                  </button>
                  <button className="bulk-btn trash-bulk-btn" onClick={bulkTrash}>
                    <i className="fa fa-trash" /> Move to Trash
                  </button>
                </>
              )}
              <button className="bulk-btn cancel-bulk-btn" onClick={() => setSelected(new Set())}>
                <i className="fa fa-times" />
              </button>
            </div>
          )}
        </div>

        <div className="header-right-controls">
          <input
            className="repository-search"
            placeholder="Search files or folders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="repository-filters">
            {FILTERS.map(({ icon, title, filter: f }) => (
              <i
                key={f}
                className={cx("fa", icon, filter === f && "active")}
                title={title}
                onClick={() => {
                  setFilter(f);
                  if (f !== "all") setFolderId(null);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="breadcrumb-trail">
        {trail.map((part, i) => (
          <span key={`${part.id}-${i}`}>
            <span
              className={cx("breadcrumb-part", i === trail.length - 1 && "breadcrumb-current")}
              onClick={() => {
                if (i === trail.length - 1) return;
                setFolderId(part.id);
                setFilter("all");
              }}
            >
              {part.name}
            </span>
            {i < trail.length - 1 && <span> | </span>}
          </span>
        ))}
      </div>

      {folders.length === 0 && files.length === 0 ? (
        <p className="empty-msg">No items to show.</p>
      ) : (
        <div className="repository-items">
          {folders.filter((f) => matchesSearch(f.name)).map((folder) => {
            const key = `folder-${folder.id}`;
            return (
              <div
                key={key}
                className={cx(
                  "repository-item",
                  selected.has(key) && "selected",
                  isFav(folder.id, "folder") && "is-fav",
                )}
                onClick={(e) => handleItemClick(e, folder, "folder")}
              >
                <i className="fa fa-folder" />
                <span className="item-label" title={folder.name}>
                  {folder.name}
                </span>
                <ItemMenu
                  open={openMenu === key}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setOpenMenu(openMenu === key ? null : key);
                  }}
                >
                  <button onClick={() => toggleFavorite(folder.id, "folder")}>
                    {isFav(folder.id, "folder") ? "Unfavorite" : "Add to Favorites"}
                  </button>
                  {filter === "trash" || folder.is_trashed ? (
                    <button className="delete-perm-btn" onClick={() => deletePermanent(folder.id, folder.name)}>
                      Delete Permanently
                    </button>
                  ) : (
                    <button onClick={() => moveToTrash(folder.id, folder.name)}>Move to Trash</button>
                  )}
                </ItemMenu>
              </div>
            );
          })}

          {files.filter((f) => matchesSearch(fileName(f))).map((file) => {
            const key = `file-${file.id}`;
            const name = fileName(file);
            const trashed = filter === "trash" || file.is_trashed;
            return (
              <div
                key={key}
                className={cx("repository-item", selected.has(key) && "selected")}
                onClick={(e) => handleItemClick(e, file, "file")}
              >
                <i className="fa fa-file" />
                <span className="item-label" title={name}>
                  {name}
                </span>
                <ItemMenu
                  open={openMenu === key}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setOpenMenu(openMenu === key ? null : key);
                  }}
                >
                  <button onClick={() => toggleFavorite(file.id, "file")}>
                    {isFav(file.id, "file") ? "Unfavorite" : "Add to Favorites"}
                  </button>
                  {trashed ? (
                    <>
                      <button onClick={() => restore(file.id, name)}>Restore</button>
                      <button className="delete-perm-btn" onClick={() => deletePermanent(file.id, name)}>
                        Delete Permanently
                      </button>
                    </>
                  ) : (
                    <button onClick={() => moveToTrash(file.id, name)}>Move to Trash</button>
                  )}
                  <button onClick={() => downloadFile(file.file_path, name)}>Download</button>
                </ItemMenu>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div className="fr-modal-overlay" onClick={() => setPreview(null)}>
          <div className="fr-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="fr-modal-header">
              <h3>{fileName(preview.file)}</h3>
              <button className="modal-close" onClick={() => setPreview(null)}>
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="fr-modal-body">{preview.body}</div>
            <div className="fr-modal-footer">
              <button
                className="modal-btn"
                onClick={() => downloadFile(preview.file.file_path, fileName(preview.file))}
              >
                <i className="fa fa-download" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemMenu({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="dot-menu" onClick={onToggle}>
        <i className="fa fa-ellipsis-v" />
      </div>
      <div className={cx("dropdown-menu", !open && "hidden")} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </>
  );
}
