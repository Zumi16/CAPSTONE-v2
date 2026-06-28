import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/post-feed.css";

/**
 * Shared CRUD "announcement feed" page used by the adminAve OJT, NSTP and
 * Research & Extension sections. The three legacy pages (ojt.js / nstp.js /
 * research&extension.js) were byte-for-byte identical apart from the API base,
 * the page heading and the empty-state copy, so they collapse into this one
 * component parameterised by `PostFeedConfig`.
 *
 * Backend routes (relative to `apiBase`):
 *   GET    /posts            list active posts
 *   POST   /create           create (FormData: title, content, adminid, files)
 *   PUT    /update/:id       edit  (FormData + keepFiles JSON)
 *   PUT    /trash/:id        move to trash
 *   GET    /trash            list trashed posts
 *   PUT    /restore/:id      restore from trash
 *   DELETE /delete/:id       delete permanently
 *   DELETE /empty-trash      empty trash
 */
export type PostFeedConfig = {
  apiBase: string;
  adminId: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyText: string;
};

type PostFile = {
  id?: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
};

type Post = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  deleted_at?: string;
  files?: PostFile[];
};

type ApiList = { success?: boolean; posts?: Post[] };

const MAX_FILES = 3;

function getFileIcon(mime?: string): string {
  if (!mime) return "fa-file";
  if (mime.includes("pdf")) return "fa-file-pdf";
  if (mime.includes("word")) return "fa-file-word";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "fa-file-powerpoint";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "fa-file-excel";
  if (mime.includes("image")) return "fa-file-image";
  if (mime.includes("text")) return "fa-file-alt";
  return "fa-file";
}

const isImage = (mime?: string) => !!mime && mime.includes("image/");

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/** Images first, then everything else (mirrors the old sortFilesByType). */
function sortFiles<T extends { file_type?: string; type?: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const ai = isImage(a.file_type ?? a.type);
    const bi = isImage(b.file_type ?? b.type);
    if (ai && !bi) return -1;
    if (!ai && bi) return 1;
    return 0;
  });
}

export function PostFeedPage(config: PostFeedConfig) {
  const { apiBase, adminId, emptyIcon, emptyTitle, emptyText } = config;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Compose modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [existingFiles, setExistingFiles] = useState<PostFile[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trash modal state
  const [showTrash, setShowTrash] = useState(false);
  const [trashPosts, setTrashPosts] = useState<Post[]>([]);
  const [trashLoaded, setTrashLoaded] = useState(false);

  async function loadPosts() {
    setLoaded(false);
    setError(false);
    try {
      const data = await api.get<ApiList>(`${apiBase}/posts`);
      setPosts(data.success ? data.posts ?? [] : []);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  // Close any open post menu on outside click.
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setExistingFiles([]);
    setNewFiles([]);
    if (editorRef.current) editorRef.current.innerHTML = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openCompose() {
    resetForm();
    setShowModal(true);
    // Focus the title once the modal has rendered.
    requestAnimationFrame(() => {
      (document.getElementById("pf-title") as HTMLInputElement | null)?.focus();
    });
  }

  function openEdit(post: Post) {
    setEditingId(post.id);
    setTitle(post.title);
    setExistingFiles(post.files ?? []);
    setNewFiles([]);
    setShowModal(true);
    requestAnimationFrame(() => {
      if (editorRef.current) editorRef.current.innerHTML = post.content;
    });
  }

  function closeCompose() {
    setShowModal(false);
    resetForm();
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (existingFiles.length + newFiles.length + picked.length > MAX_FILES) {
      window.alert(`You can only upload up to ${MAX_FILES} files per post.`);
      e.target.value = "";
      return;
    }
    setNewFiles((prev) => [...prev, ...picked]);
    e.target.value = "";
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    if (command === "highlight") {
      document.execCommand("backColor", false, "yellow");
    } else {
      document.execCommand(command, false, value);
    }
  }

  async function submitPost() {
    const content = editorRef.current?.innerHTML.trim() ?? "";
    const trimmedTitle = title.trim();
    if (!trimmedTitle && !content && newFiles.length === 0 && existingFiles.length === 0) {
      window.alert("Please add a title, content, or files before posting.");
      return;
    }

    const formData = new FormData();
    formData.append("title", trimmedTitle);
    formData.append("content", content);
    formData.append("adminid", adminId);
    newFiles.forEach((f) => formData.append("files", f));
    if (editingId) {
      formData.append("keepFiles", JSON.stringify(existingFiles.map((f) => f.id)));
    }

    setSubmitting(true);
    try {
      const path = editingId ? `${apiBase}/update/${editingId}` : `${apiBase}/create`;
      const data = editingId
        ? await api.put<{ success?: boolean }>(path, formData)
        : await api.post<{ success?: boolean }>(path, formData);
      if (data.success) {
        closeCompose();
        loadPosts();
      } else {
        window.alert("Something went wrong while saving your post.");
      }
    } catch {
      window.alert("Error submitting post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function trashPost(id: number) {
    if (!window.confirm("Move this post to trash?")) return;
    try {
      const data = await api.put<{ success?: boolean }>(`${apiBase}/trash/${id}`);
      if (data.success) loadPosts();
      else window.alert("Failed to move post to trash");
    } catch {
      window.alert("Error moving post to trash");
    }
  }

  async function loadTrash() {
    setTrashLoaded(false);
    try {
      const data = await api.get<ApiList>(`${apiBase}/trash`);
      setTrashPosts(data.success ? data.posts ?? [] : []);
    } catch {
      setTrashPosts([]);
    } finally {
      setTrashLoaded(true);
    }
  }

  function openTrashModal() {
    setShowTrash(true);
    loadTrash();
  }

  async function restorePost(id: number) {
    if (!window.confirm("Restore this post?")) return;
    try {
      const data = await api.put<{ success?: boolean }>(`${apiBase}/restore/${id}`);
      if (data.success) {
        loadTrash();
        loadPosts();
      } else {
        window.alert("Failed to restore post");
      }
    } catch {
      window.alert("Error restoring post");
    }
  }

  async function deleteForever(id: number) {
    if (!window.confirm("Permanently delete this post? This action cannot be undone.")) return;
    try {
      const data = await api.delete<{ success?: boolean }>(`${apiBase}/delete/${id}`);
      if (data.success) loadTrash();
      else window.alert("Failed to delete post");
    } catch {
      window.alert("Error deleting post");
    }
  }

  async function emptyTrash() {
    if (!window.confirm("Empty trash? All items will be permanently deleted. This action cannot be undone.")) return;
    try {
      const data = await api.delete<{ success?: boolean }>(`${apiBase}/empty-trash`);
      if (data.success) loadTrash();
      else window.alert("Failed to empty trash");
    } catch {
      window.alert("Error emptying trash");
    }
  }

  return (
    <div className="post-feed-page">
      <div className="post-container">
        <div className="post-feed">
          {!loaded ? (
            <div className="post-placeholder">
              <i className="fa-solid fa-spinner fa-spin" />
              <h2>Loading posts…</h2>
            </div>
          ) : error ? (
            <div className="post-placeholder">
              <i className="fa-solid fa-exclamation-triangle" />
              <h2>Error loading posts</h2>
              <p>Please refresh the page and try again.</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="post-placeholder">
              <i className={cx("fa-solid", emptyIcon)} />
              <h2>{emptyTitle}</h2>
              <p>{emptyText}</p>
            </div>
          ) : (
            posts.map((post) => (
              <article className="feed-post" key={post.id}>
                <div className="feed-actions">
                  <button
                    className="post-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId((cur) => (cur === post.id ? null : post.id));
                    }}
                  >
                    <i className="fa-solid fa-ellipsis-v" />
                  </button>
                  {openMenuId === post.id && (
                    <div className="post-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                      <button className="post-edit" onClick={() => { setOpenMenuId(null); openEdit(post); }}>
                        <i className="fa-solid fa-pen" /> Edit
                      </button>
                      <button className="post-delete" onClick={() => { setOpenMenuId(null); trashPost(post.id); }}>
                        <i className="fa-solid fa-trash" /> Move to Trash
                      </button>
                    </div>
                  )}
                </div>

                <h1>{post.title}</h1>
                <div className="feed-content" dangerouslySetInnerHTML={{ __html: post.content }} />

                {post.files && post.files.length > 0 && (
                  <div className="post-files">
                    {sortFiles(post.files).map((file, i) =>
                      isImage(file.file_type) ? (
                        <div className="post-file-item image" key={i}>
                          <img src={assetUrl(file.file_path)} alt={file.file_name} />
                          <a
                            className="download-icon"
                            href={assetUrl(file.file_path)}
                            target="_blank"
                            rel="noreferrer"
                            download={file.file_name}
                          >
                            <i className="fa fa-download" />
                          </a>
                          <div className="image-overlay">
                            <a href={assetUrl(file.file_path)} target="_blank" rel="noreferrer" download={file.file_name}>
                              {file.file_name}
                            </a>
                            <span className="file-size">{formatFileSize(file.file_size)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="post-file-item document" key={i}>
                          <i className={cx("fa", getFileIcon(file.file_type), "file-icon")} />
                          <div className="file-details">
                            <a href={assetUrl(file.file_path)} target="_blank" rel="noreferrer" download={file.file_name}>
                              {file.file_name}
                            </a>
                            <span className="file-size">{formatFileSize(file.file_size)}</span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                <div className="feed-divider">
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {/* Floating action buttons */}
      <button className="post-btn" onClick={openCompose} title="Create a post">
        <i className="fa-solid fa-plus" />
      </button>
      <button className="trash-btn" onClick={openTrashModal} title="View Trash">
        <i className="fa fa-trash" />
      </button>

      {/* Compose / edit modal */}
      {showModal && (
        <div className="post-modal open" onClick={closeCompose}>
          <div className="post-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Edit Post" : "Create a Post"}</h2>

            <input
              id="pf-title"
              type="text"
              className="post-title"
              placeholder="Enter title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="post-toolbar">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}><i className="fa-solid fa-bold" /></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}><i className="fa-solid fa-italic" /></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}><i className="fa-solid fa-underline" /></button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("highlight")}><i className="fa-solid fa-highlighter" /></button>
              <select defaultValue="3" onChange={(e) => exec("fontSize", e.target.value)}>
                <option value="3">Normal</option>
                <option value="4">Large</option>
                <option value="5">Larger</option>
                <option value="6">Huge</option>
              </select>
            </div>

            <div
              ref={editorRef}
              className="post-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write your post..."
            />

            <div className="file-upload-section">
              <label htmlFor="pf-file-upload" className="file-upload-label">
                <i className="fa fa-paperclip" /> Attach Files (Max {MAX_FILES})
              </label>
              <input
                id="pf-file-upload"
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                onChange={onPickFiles}
              />
              <div className="file-list">
                {[
                  ...existingFiles.map((f) => ({ kind: "existing" as const, file: f })),
                  ...newFiles.map((f) => ({ kind: "new" as const, file: f })),
                ]
                  .sort((a, b) => {
                    const at = a.kind === "existing" ? a.file.file_type : a.file.type;
                    const bt = b.kind === "existing" ? b.file.file_type : b.file.type;
                    if (isImage(at) && !isImage(bt)) return -1;
                    if (!isImage(at) && isImage(bt)) return 1;
                    return 0;
                  })
                  .map((item, i) => {
                  const name = item.kind === "existing" ? item.file.file_name : item.file.name;
                  const size = item.kind === "existing" ? item.file.file_size : item.file.size;
                  const type = item.kind === "existing" ? item.file.file_type : item.file.type;
                  return (
                    <div className="file-item" key={`${item.kind}-${i}`}>
                      <i className={cx("fa", getFileIcon(type))} style={{ color: "#666", fontSize: 18 }} />
                      <span className="file-name">{name}</span>
                      <span className="file-size">{formatFileSize(size)}</span>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={() => {
                          if (item.kind === "existing") {
                            setExistingFiles((prev) => prev.filter((f) => f !== item.file));
                          } else {
                            setNewFiles((prev) => prev.filter((f) => f !== item.file));
                          }
                        }}
                      >
                        <i className="fa fa-times" style={{ color: "#ff4d4d" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="post-modal-actions">
              <button id="cancelPost" onClick={closeCompose} disabled={submitting}>Cancel</button>
              <button id="submitPost" onClick={submitPost} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Update" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash modal */}
      {showTrash && (
        <div className="trash-modal open" onClick={() => setShowTrash(false)}>
          <div className="trash-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="trash-modal-header">
              <h2><i className="fa fa-trash" /> Trash</h2>
              <button className="close-trash-btn" onClick={() => setShowTrash(false)}>
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="trash-modal-body">
              <div className="trash-actions">
                <p className="trash-info">
                  <i className="fa fa-info-circle" /> Items in trash will be kept for 30 days before automatic deletion
                </p>
                <button className="empty-trash-btn" onClick={emptyTrash} disabled={trashPosts.length === 0}>
                  <i className="fa fa-trash-alt" /> Empty Trash
                </button>
              </div>
              <div className="trash-items">
                {!trashLoaded ? (
                  <div className="trash-empty"><i className="fa fa-spinner fa-spin" /><h3>Loading…</h3></div>
                ) : trashPosts.length === 0 ? (
                  <div className="trash-empty">
                    <i className="fa fa-trash" />
                    <h3>Trash is empty</h3>
                    <p>Deleted items will appear here</p>
                  </div>
                ) : (
                  trashPosts.map((post) => (
                    <div className="trash-item" key={post.id}>
                      <div className="trash-item-content">
                        <div className="trash-item-title">{post.title || "Untitled"}</div>
                        <div className="trash-item-meta">
                          <span>
                            <i className="fa fa-calendar" /> Deleted:{" "}
                            {post.deleted_at
                              ? new Date(post.deleted_at).toLocaleDateString("en-US", {
                                  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                                })
                              : "—"}
                          </span>
                          {post.files && post.files.length > 0 && (
                            <span><i className="fa fa-paperclip" /> {post.files.length} file(s)</span>
                          )}
                        </div>
                      </div>
                      <div className="trash-item-actions">
                        <button className="restore-btn" onClick={() => restorePost(post.id)}>
                          <i className="fa fa-undo" /> Restore
                        </button>
                        <button className="delete-permanent-btn" onClick={() => deleteForever(post.id)}>
                          <i className="fa fa-trash-alt" /> Delete Permanently
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
