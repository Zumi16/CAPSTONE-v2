import { assetUrl } from "@/lib/config";
import { extractTextPreview, formatShortDate } from "@/lib/format";
import type { NewsArticle } from "./news.api";

type NewsCardProps = {
  article: NewsArticle;
  onOpen: (article: NewsArticle) => void;
};

/** A single clickable news card in the grid. */
export function NewsCard({ article, onOpen }: NewsCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(article)}
      className="flex flex-col overflow-hidden rounded-xl bg-white text-left shadow-md transition hover:-translate-y-1 hover:shadow-lg"
    >
      {article.thumbnail_path ? (
        <div className="h-44 w-full overflow-hidden">
          <img
            src={assetUrl(article.thumbnail_path)}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-gray-100 text-4xl text-gray-300">
          <i className="fa fa-newspaper" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-bold text-gray-900">{article.title}</h2>
        <p className="mt-2 flex-1 text-sm text-gray-600">
          {extractTextPreview(article.content)}
        </p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            <i className="fa fa-calendar" /> {formatShortDate(article.created_at)}
          </span>
          <span className="font-medium text-maroon">
            Read article <i className="fa fa-arrow-right" />
          </span>
        </div>
      </div>
    </button>
  );
}
