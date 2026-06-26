import { useEffect } from "react";

import { assetUrl } from "@/lib/config";
import { formatLongDate } from "@/lib/format";
import type { NewsArticle } from "./news.api";
import { newsClasses as c } from "./news.classes";

type NewsModalProps = {
  article: NewsArticle | null;
  onClose: () => void;
};

/** Full-article popup. Renders nothing when `article` is null. */
export function NewsModal({ article, onClose }: NewsModalProps) {
  // Close on Escape, and lock background scrolling while open.
  useEffect(() => {
    if (!article) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "auto";
    };
  }, [article, onClose]);

  if (!article) return null;

  return (
    <div
      className={c.modal}
      style={{ display: "block" }}
      onClick={(e) => {
        // Click on the dark backdrop (not the content) closes the modal.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={c.modalContent}>
        <span className={c.close} onClick={onClose}>
          &times;
        </span>

        <div className={c.fullHeader}>
          <h1 className={c.fullTitle}>{article.title}</h1>
          <div className={c.fullMeta}>
            <span>
              <i className="fa fa-calendar" /> {formatLongDate(article.created_at)}
            </span>
            <span>
              <i className="fa fa-building" /> PUP Parañaque
            </span>
          </div>
        </div>

        {article.thumbnail_path && (
          <div className={c.fullImage}>
            <img src={assetUrl(article.thumbnail_path)} alt={article.title} />
          </div>
        )}

        {/* Article body is trusted HTML coming from the admin CMS. */}
        <div
          className={c.fullBody}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>
    </div>
  );
}
