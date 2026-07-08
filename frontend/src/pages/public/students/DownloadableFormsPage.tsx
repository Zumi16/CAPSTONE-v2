import { useEffect, useMemo, useState } from "react";

import { Hero } from "@/components/Hero";
import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import {
  formatFileSize,
  getFileIcon,
} from "@/features/announcements/announcements.api";
import "@/styles/pages/downloadable-forms.css";

/**
 * Public "Downloadable Forms" page.
 *
 * Shows every form adminAve has uploaded to the forms repository as a flat,
 * downloadable list, with chips to filter by the top-level category folder
 * (OJT Forms / Proposal Forms / Other Student Forms). It reads the repository
 * through the public `/api/forms/public` endpoint and resolves each file's
 * category from its folder's root ancestor.
 */

/** The fixed public categories, in display order. */
const CATEGORIES = ["OJT Forms", "Proposal Forms", "Other Student Forms"] as const;
const UNCATEGORIZED = "Other Forms";

type Folder = { id: number; name: string; parent_id: number | null };
type RepoFile = {
  id: number;
  folder_id: number | null;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size: number;
  description?: string | null;
  created_at?: string;
};
type PublicResponse = { success?: boolean; folders?: Folder[]; files?: RepoFile[] };

type FormItem = RepoFile & { category: string };

export function DownloadableFormsPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api
      .get<PublicResponse>("/api/forms/public")
      .then((data) => {
        if (cancelled) return;
        setFolders(data.folders ?? []);
        setFiles(data.files ?? []);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error loading downloadable forms:", err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve each file's category by walking its folder up to the root folder.
  const items: FormItem[] = useMemo(() => {
    const folderMap = new Map<number, Folder>();
    folders.forEach((f) => folderMap.set(f.id, f));

    const rootName = (folderId: number | null): string => {
      let cursor = folderId != null ? folderMap.get(folderId) : undefined;
      while (cursor && cursor.parent_id != null) {
        cursor = folderMap.get(cursor.parent_id);
      }
      return cursor?.name ?? UNCATEGORIZED;
    };

    return files.map((file) => {
      const root = rootName(file.folder_id);
      const category = (CATEGORIES as readonly string[]).includes(root)
        ? root
        : UNCATEGORIZED;
      return { ...file, category };
    });
  }, [folders, files]);

  // Which category chips to show: the fixed 3, plus "Other Forms" only if used.
  const availableCategories = useMemo(() => {
    const list: string[] = [...CATEGORIES];
    if (items.some((it) => it.category === UNCATEGORIZED)) list.push(UNCATEGORIZED);
    return list;
  }, [items]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => map.set(it.category, (map.get(it.category) ?? 0) + 1));
    return map;
  }, [items]);

  const visible =
    activeCategory === "all"
      ? items
      : items.filter((it) => it.category === activeCategory);

  function download(file: RepoFile) {
    const link = document.createElement("a");
    link.href = assetUrl(file.file_path);
    link.download = file.file_name;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="main downloadable-forms-page">
      <Hero
        title="Downloadable Forms"
        text="Download the official forms you need for OJT, research and extension proposals, and other student requirements. All forms are provided by the campus administration."
        background="/assets/images/PUPBg11.jpg"
      />

      <section className="forms-section" data-aos="fade">
        <div className="forms-container">
          <div className="forms-filters">
            <button
              type="button"
              className={cx("forms-filter", activeCategory === "all" && "active")}
              onClick={() => setActiveCategory("all")}
            >
              All Forms
              <span className="forms-filter-count">{items.length}</span>
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={cx("forms-filter", activeCategory === cat && "active")}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                <span className="forms-filter-count">{counts.get(cat) ?? 0}</span>
              </button>
            ))}
          </div>

          {status === "loading" && (
            <div className="forms-state">
              <i className="fas fa-spinner fa-spin" />
              <p>Loading forms…</p>
            </div>
          )}

          {status === "error" && (
            <div className="forms-state">
              <i className="fas fa-exclamation-circle" />
              <h2>Unable to Load Forms</h2>
              <p>Please check your connection and try again.</p>
            </div>
          )}

          {status === "ready" && visible.length === 0 && (
            <div className="forms-state">
              <i className="fas fa-folder-open" />
              <h2>No Forms Available</h2>
              <p>
                {items.length === 0
                  ? "Forms uploaded by the administration will appear here."
                  : "There are no forms in this category yet."}
              </p>
            </div>
          )}

          {status === "ready" && visible.length > 0 && (
            <ul className="forms-list">
              {visible.map((file) => (
                <li className="form-row" key={file.id}>
                  <div className="form-row-icon">
                    <i className={cx("fa", getFileIcon(file.file_type ?? ""))} />
                  </div>
                  <div className="form-row-body">
                    <div className="form-row-heading">
                      <span className="form-row-category">{file.category}</span>
                      <h3 className="form-row-name" title={file.file_name}>
                        {file.file_name}
                      </h3>
                    </div>
                    {file.description && (
                      <p className="form-row-description">{file.description}</p>
                    )}
                  </div>
                  <span className="form-row-size">{formatFileSize(file.file_size)}</span>
                  <button
                    type="button"
                    className="form-row-download"
                    onClick={() => download(file)}
                  >
                    <i className="fa fa-download" /> Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
