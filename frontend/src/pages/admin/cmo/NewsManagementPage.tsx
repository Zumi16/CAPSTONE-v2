import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/cmo-news.css";

/**
 * adminCMO → News & Updates. A News-style CMS over `/api/news`: a feed of
 * article cards (thumbnail + title + preview), a floating composer with a
 * required thumbnail upload and a contentEditable rich-text editor (bold /
 * italic / underline / highlight / font-size), a full-article reader modal, and
 * a 30-day trash with restore / permanent-delete / empty.
 *
 * Endpoints: GET /posts, /trash · POST /create · PUT /update/:id, /trash/:id,
 * /restore/:id · DELETE /delete/:id, /empty-trash. Posts carry a single
 * thumbnail (`thumbnail` file on create/update, `keepThumbnail` id on edit).
 */

const API = "/api/news";
const ADMIN_ID = "adminCMO";
const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

type Post = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  deleted_at?: string;
  thumbnail_path?: string;
  thumbnail_id?: number;
};
type ApiList = { success?: boolean; posts?: Post[] };
type Toast = { msg: string; type: "success" | "error" | "warning" };

function extractPreview(html: string, max = 150) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

const longDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

export function NewsManagementPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Composer state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const [existingThumbId, setExistingThumbId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Reader + trash
  const [viewPost, setViewPost] = useState<Post | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trashPosts, setTrashPosts] = useState<Post[]>([]);
  const [trashLoaded, setTrashLoaded] = useState(false);

  const showToast = (msg: string, type: Toast["type"] = "warning") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadPosts() {
    setLoaded(false);
    setError(false);
    try {
      const data = await api.get<ApiList>(`${API}/posts`);
      setPosts(data.success ? data.posts ?? [] : []);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { loadPosts(); }, []);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // Esc closes the reader.
  useEffect(() => {
    if (!viewPost) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setViewPost(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewPost]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setThumbFile(null);
    setThumbPreview("");
    setExistingThumbId(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  }

  function openCompose() {
    resetForm();
    setShowModal(true);
    requestAnimationFrame(() => (document.getElementById("nm-title") as HTMLInputElement | null)?.focus());
  }

  function openEdit(post: Post) {
    setEditingId(post.id);
    setTitle(post.title);
    setThumbFile(null);
    if (post.thumbnail_id && post.thumbnail_path) {
      setExistingThumbId(post.thumbnail_id);
      setThumbPreview(assetUrl(post.thumbnail_path));
    } else {
      setExistingThumbId(null);
      setThumbPreview("");
    }
    setShowModal(true);
    requestAnimationFrame(() => { if (editorRef.current) editorRef.current.innerHTML = post.content; });
  }

  function closeCompose() {
    setShowModal(false);
    resetForm();
  }

  function onPickThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALID_TYPES.includes(file.type)) {
      showToast("Please select a valid image file (JPG, PNG, WEBP, or GIF)");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB");
      e.target.value = "";
      return;
    }
    setThumbFile(file);
    setExistingThumbId(null);
    setThumbPreview(URL.createObjectURL(file));
  }

  function removeThumb() {
    setThumbFile(null);
    setExistingThumbId(null);
    setThumbPreview("");
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    if (command === "highlight") document.execCommand("backColor", false, "yellow");
    else document.execCommand(command, false, value);
  }

  async function submitPost() {
    const content = editorRef.current?.innerHTML.trim() ?? "";
    const trimmed = title.trim();
    if (!trimmed || !content) {
      showToast("Please add both a title and content for your news article.");
      return;
    }
    if (!thumbFile && !existingThumbId) {
      showToast("Please add a thumbnail image for your news article.");
      return;
    }

    const formData = new FormData();
    formData.append("title", trimmed);
    formData.append("content", content);
    formData.append("adminid", ADMIN_ID);
    if (thumbFile) formData.append("thumbnail", thumbFile);
    if (editingId && existingThumbId && !thumbFile) formData.append("keepThumbnail", String(existingThumbId));

    setSubmitting(true);
    try {
      const path = editingId ? `${API}/update/${editingId}` : `${API}/create`;
      const data = editingId
        ? await api.put<{ success?: boolean; message?: string }>(path, formData)
        : await api.post<{ success?: boolean; message?: string }>(path, formData);
      if (data.success) {
        closeCompose();
        loadPosts();
      } else {
        showToast(data.message || "Something went wrong while saving your news article.");
      }
    } catch {
      showToast("Error submitting news. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function trashPost(id: number) {
    if (!window.confirm("Move this news article to trash?")) return;
    try {
      const data = await api.put<{ success?: boolean }>(`${API}/trash/${id}`);
      if (data.success) loadPosts();
      else showToast("Failed to delete news article");
    } catch {
      showToast("Error deleting news article", "error");
    }
  }

  async function loadTrash() {
    setTrashLoaded(false);
    try {
      const data = await api.get<ApiList>(`${API}/trash`);
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
    if (!window.confirm("Restore this news article?")) return;
    try {
      const data = await api.put<{ success?: boolean }>(`${API}/restore/${id}`);
      if (data.success) {
        showToast("News article restored successfully", "success");
        loadTrash();
        loadPosts();
      } else {
        showToast("Failed to restore news article");
      }
    } catch {
      showToast("Error restoring news article", "error");
    }
  }

  async function deleteForever(id: number) {
    if (!window.confirm("Permanently delete this news article? This action cannot be undone.")) return;
    try {
      const data = await api.delete<{ success?: boolean }>(`${API}/delete/${id}`);
      if (data.success) {
        showToast("News article permanently deleted", "success");
        loadTrash();
      } else {
        showToast("Failed to delete news article");
      }
    } catch {
      showToast("Error deleting news article", "error");
    }
  }

  async function emptyTrash() {
    if (!window.confirm("Empty trash? All news articles will be permanently deleted. This action cannot be undone.")) return;
    try {
      const data = await api.delete<{ success?: boolean; message?: string }>(`${API}/empty-trash`);
      if (data.success) {
        showToast(data.message || "Trash emptied", "success");
        loadTrash();
      } else {
        showToast("Failed to empty trash");
      }
    } catch {
      showToast("Error emptying trash", "error");
    }
  }

  const canSubmit = title.trim().length > 0 && (thumbFile !== null || existingThumbId !== null);

  return (
    <div className="news-mgmt-page">
      <div className="post-container">
        <div className="post-feed">
          {!loaded ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : error ? (
            <div className="error-message">
              <i className="fa-solid fa-exclamation-triangle" />
              <h3>Error loading news</h3>
              <p>Please refresh the page and try again.</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="post-placeholder">
              <i className="fa-solid fa-newspaper" />
              <h2>No news yet</h2>
              <p>Start writing your first news article to share updates with the community.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div className="researchextension-post" key={post.id} onClick={() => setViewPost(post)}>
                <div className="researchextension-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="post-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId((c) => (c === post.id ? null : post.id)); }}>
                    <i className="fa-solid fa-ellipsis-v" />
                  </button>
                  {openMenuId === post.id && (
                    <div className="post-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                      <button className="post-edit" onClick={() => { setOpenMenuId(null); openEdit(post); }}><i className="fa-solid fa-pen" /> Edit News</button>
                      <button className="post-delete" onClick={() => { setOpenMenuId(null); trashPost(post.id); }}><i className="fa-solid fa-trash" /> Move to Trash</button>
                    </div>
                  )}
                </div>
                <div className="post-thumbnail">
                  {post.thumbnail_path && <img src={assetUrl(post.thumbnail_path)} alt={post.title} />}
                </div>
                <div className="post-content-area">
                  <h1>{post.title}</h1>
                  <div className="post-content">{extractPreview(post.content, 150)}</div>
                  <div className="post-meta">
                    <div className="post-meta-item"><i className="fa fa-calendar" /><span>{longDate(post.created_at)}</span></div>
                    <div className="post-meta-item"><i className="fa fa-user" /><span>Admin CMO</span></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating buttons */}
      <button className="post-btn" onClick={openCompose} title="Write News"><i className="fa-solid fa-plus" /></button>
      <button className="trash-btn" onClick={openTrashModal} title="View Trash"><i className="fa fa-trash" /></button>

      {/* Composer modal */}
      {showModal && (
        <div className="post-modal open" onClick={closeCompose}>
          <div className="post-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="post-modal-header">
              <h2>{editingId ? "Edit News Article" : "Write News Article"}</h2>
              <button className="close-modal-btn" onClick={closeCompose}><i className="fa-solid fa-times" /></button>
            </div>

            <div className="post-modal-body">
              <input id="nm-title" type="text" className="post-title" placeholder="News Title" value={title} onChange={(e) => setTitle(e.target.value)} />

              <div className="thumbnail-section">
                <label className="thumbnail-label"><i className="fa-solid fa-image" /> Thumbnail Image <span className="required">*</span></label>
                <div className="thumbnail-upload-area" onClick={(e) => { if (!(e.target as HTMLElement).closest(".thumbnail-change-btn, .thumbnail-remove-btn")) thumbInputRef.current?.click(); }}>
                  <input ref={thumbInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={onPickThumb} />
                  {!thumbPreview ? (
                    <div className="thumbnail-placeholder">
                      <i className="fa-solid fa-cloud-upload-alt" />
                      <p>Click to upload thumbnail</p>
                      <span>JPG, PNG, WEBP or GIF (max 5MB)</span>
                    </div>
                  ) : (
                    <div className="thumbnail-preview">
                      <img src={thumbPreview} alt="Thumbnail" />
                      <div className="thumbnail-overlay">
                        <button type="button" className="thumbnail-change-btn" onClick={(e) => { e.stopPropagation(); thumbInputRef.current?.click(); }}><i className="fa-solid fa-camera" /> Change</button>
                        <button type="button" className="thumbnail-remove-btn" onClick={(e) => { e.stopPropagation(); removeThumb(); }}><i className="fa-solid fa-trash" /> Remove</button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="thumbnail-hint">This image will be displayed as the news preview</p>
              </div>

              <div className="editor-section">
                <label className="editor-label"><i className="fa-solid fa-pen" /> News Content</label>
                <div className="post-toolbar">
                  <button type="button" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}><i className="fa-solid fa-bold" /></button>
                  <button type="button" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}><i className="fa-solid fa-italic" /></button>
                  <button type="button" title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}><i className="fa-solid fa-underline" /></button>
                  <button type="button" title="Highlight" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("highlight")}><i className="fa-solid fa-highlighter" /></button>
                  <select defaultValue="3" title="Font Size" onChange={(e) => exec("fontSize", e.target.value)}>
                    <option value="3">Normal</option>
                    <option value="4">Large</option>
                    <option value="5">Larger</option>
                    <option value="6">Huge</option>
                  </select>
                </div>
                <div ref={editorRef} className="post-editor" contentEditable suppressContentEditableWarning data-placeholder="Write your news story..." />
              </div>
            </div>

            <div className="post-modal-footer">
              <button type="button" className="btn-cancel" onClick={closeCompose} disabled={submitting}>Cancel</button>
              <button type="button" className="btn-submit" onClick={submitPost} disabled={submitting || !canSubmit}>
                {submitting ? (editingId ? "Updating..." : "Publishing...") : editingId ? "Update News" : "Publish News"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article reader modal */}
      {viewPost && (
        <div className="article-view-modal open" onClick={(e) => { if (e.target === e.currentTarget) setViewPost(null); }}>
          <div className="article-view-modal-content">
            <span className="article-view-close" onClick={() => setViewPost(null)}>&times;</span>
            <div className="article-full-header">
              <h1 className="article-full-title">{viewPost.title}</h1>
              <div className="article-full-meta">
                <span><i className="fa fa-calendar" /> {longDate(viewPost.created_at)}</span>
                <span><i className="fa fa-user" /> Admin CMO</span>
              </div>
            </div>
            {viewPost.thumbnail_path && (
              <div className="article-full-image"><img src={assetUrl(viewPost.thumbnail_path)} alt={viewPost.title} /></div>
            )}
            <div className="article-full-body" dangerouslySetInnerHTML={{ __html: viewPost.content }} />
          </div>
        </div>
      )}

      {/* Trash modal */}
      {showTrash && (
        <div className="trash-modal open" onClick={() => setShowTrash(false)}>
          <div className="trash-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="trash-modal-header">
              <h2><i className="fa fa-trash" /> Trash</h2>
              <button className="close-trash-btn" onClick={() => setShowTrash(false)}><i className="fa fa-times" /></button>
            </div>
            <div className="trash-modal-body">
              <div className="trash-actions">
                <p className="trash-info"><i className="fa fa-info-circle" /> Items in trash will be kept for 30 days before automatic deletion</p>
                <button className="empty-trash-btn" onClick={emptyTrash} disabled={trashPosts.length === 0}><i className="fa fa-trash-alt" /> Empty Trash</button>
              </div>
              <div className="trash-items">
                {!trashLoaded ? (
                  <div className="trash-empty"><i className="fa fa-spinner fa-spin" /><h3>Loading…</h3></div>
                ) : trashPosts.length === 0 ? (
                  <div className="trash-empty"><i className="fa fa-trash" /><h3>Trash is empty</h3><p>Deleted news articles will appear here</p></div>
                ) : (
                  trashPosts.map((post) => (
                    <div className="trash-item" key={post.id}>
                      <div className="trash-item-content">
                        <div className="trash-item-title">{post.title || "Untitled"}</div>
                        <div className="trash-item-meta">
                          <span><i className="fa fa-calendar" /> Deleted: {post.deleted_at ? new Date(post.deleted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                          {post.thumbnail_path && <span><i className="fa fa-image" /> Has thumbnail</span>}
                        </div>
                      </div>
                      <div className="trash-item-actions">
                        <button className="restore-btn" onClick={() => restorePost(post.id)}><i className="fa fa-undo" /> Restore</button>
                        <button className="delete-permanent-btn" onClick={() => deleteForever(post.id)}><i className="fa fa-trash-alt" /> Delete Permanently</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={cx("nm-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
    </div>
  );
}
