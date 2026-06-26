import { assetUrl } from "@/lib/config";
import { extractTextPreview, formatShortDate } from "@/lib/format";
import type { NewsArticle } from "./news.api";
import { newsClasses as c } from "./news.classes";

type NewsCardProps = {
  article: NewsArticle;
  onOpen: (article: NewsArticle) => void;
};

/** A single clickable news card in the grid. */
export function NewsCard({ article, onOpen }: NewsCardProps) {
  return (
    <div className={c.card} onClick={() => onOpen(article)}>
      {article.thumbnail_path ? (
        <div className={c.image}>
          <img src={assetUrl(article.thumbnail_path)} alt={article.title} />
        </div>
      ) : (
        <div className={c.noImage}>
          <i className="fa fa-newspaper" />
        </div>
      )}

      <div className={c.content}>
        <h2 className={c.title}>{article.title}</h2>
        <p className={c.excerpt}>{extractTextPreview(article.content)}</p>
        <div className={c.footer}>
          <span className={c.date}>
            <i className="fa fa-calendar" /> {formatShortDate(article.created_at)}
          </span>
          <span className={c.readMore}>
            Read article <i className="fa fa-arrow-right" />
          </span>
        </div>
      </div>
    </div>
  );
}
