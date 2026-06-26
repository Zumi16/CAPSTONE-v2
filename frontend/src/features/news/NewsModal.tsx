import { assetUrl } from "@/lib/config";
import { formatLongDate } from "@/lib/format";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import type { NewsArticle } from "./news.api";

type NewsModalProps = {
  article: NewsArticle | null;
  onClose: () => void;
};

/** Full-article popup. Renders nothing when `article` is null. */
export function NewsModal({ article, onClose }: NewsModalProps) {
  useEscapeToClose(Boolean(article), onClose);

  if (!article) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="relative p-6 sm:p-8">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 text-3xl leading-none text-gray-400 hover:text-gray-700"
          >
            &times;
          </button>

          <h1 className="pr-8 text-2xl font-bold text-gray-900 sm:text-3xl">
            {article.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
            <span>
              <i className="fa fa-calendar" /> {formatLongDate(article.created_at)}
            </span>
            <span>
              <i className="fa fa-building" /> PUP Parañaque
            </span>
          </div>

          {article.thumbnail_path && (
            <img
              src={assetUrl(article.thumbnail_path)}
              alt={article.title}
              className="mt-5 w-full rounded-lg object-cover"
            />
          )}

          <div
            className="prose mt-5 max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>
    </div>
  );
}
