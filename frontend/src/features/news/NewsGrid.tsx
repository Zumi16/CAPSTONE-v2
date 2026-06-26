import { useState } from "react";

import { useNews, type NewsArticle } from "./news.api";
import { NewsCard } from "./NewsCard";
import { NewsModal } from "./NewsModal";

type NewsGridProps = {
  /** Show only the first N articles (the homepage passes 3). */
  limit?: number;
};

/** Centered status message (loading / empty / error). */
function StatusBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full py-12 text-center text-gray-500">{children}</div>
  );
}

/**
 * Loads news from the backend and shows them as a responsive grid of cards
 * (1 column on phones, 2 on tablets, 3 on desktop). Clicking a card opens the
 * full article in a modal.
 */
export function NewsGrid({ limit }: NewsGridProps) {
  const { articles, status } = useNews(limit);
  const [selected, setSelected] = useState<NewsArticle | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {status === "loading" && (
          <StatusBox>
            <i className="fa fa-spinner fa-spin text-3xl text-maroon" />
          </StatusBox>
        )}

        {status === "error" && (
          <StatusBox>
            <i className="fa fa-exclamation-triangle mb-3 text-4xl text-red-500" />
            <h3 className="text-lg font-semibold text-gray-700">Error Loading News</h3>
            <p>Please refresh the page and try again.</p>
          </StatusBox>
        )}

        {status === "ready" && articles.length === 0 && (
          <StatusBox>
            <i className="fa fa-newspaper mb-3 text-4xl text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700">No News Yet</h3>
            <p>Check back soon for the latest updates from PUP Parañaque Campus.</p>
          </StatusBox>
        )}

        {status === "ready" &&
          articles.map((article) => (
            <NewsCard key={article.id} article={article} onOpen={setSelected} />
          ))}
      </div>

      <NewsModal article={selected} onClose={() => setSelected(null)} />
    </>
  );
}
