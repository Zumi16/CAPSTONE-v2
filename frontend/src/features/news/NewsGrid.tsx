import { useState } from "react";

import "@/styles/layout/news.css";
import { useNews, type NewsArticle } from "./news.api";
import { NewsCard } from "./NewsCard";
import { NewsModal } from "./NewsModal";
import { newsClasses as c } from "./news.classes";

type NewsGridProps = {
  /** Show only the first N articles (the homepage passes 3). */
  limit?: number;
};

/**
 * Loads news from the backend and shows them as a grid of cards. Clicking a
 * card opens the full article in a modal. Handles loading / empty / error
 * states the same way the old `news.js` did.
 */
export function NewsGrid({ limit }: NewsGridProps) {
  const { articles, status } = useNews(limit);
  const [selected, setSelected] = useState<NewsArticle | null>(null);

  if (status === "loading") {
    return (
      <div className={c.grid}>
        <div className={c.loading}>
          <i className="fa fa-spinner fa-spin" />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={c.grid}>
        <div className={c.error}>
          <i className="fa fa-exclamation-triangle" />
          <h3>Error Loading News</h3>
          <p>Please refresh the page and try again.</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={c.grid}>
        <div className={c.empty}>
          <i className="fa fa-newspaper" />
          <h3>No News Yet</h3>
          <p>Check back soon for the latest updates from PUP Parañaque Campus.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={c.grid}>
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} onOpen={setSelected} />
        ))}
      </div>
      <NewsModal article={selected} onClose={() => setSelected(null)} />
    </>
  );
}
