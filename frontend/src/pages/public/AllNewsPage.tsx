import { useMemo, useState } from "react";

import { useNews, type NewsArticle } from "@/features/news/news.api";
import { NewsCard } from "@/features/news/NewsCard";
import { NewsModal } from "@/features/news/NewsModal";
import { extractTextPreview } from "@/lib/format";
import { cx } from "@/lib/cx";

import "@/styles/layout/news.css";
import "@/styles/pages/all-news.css";

const ITEMS_PER_PAGE = 9;

const FILTERS = [
  { key: "all", label: "All News" },
  { key: "recent", label: "Recent" },
  { key: "events", label: "Events" },
  { key: "announcements", label: "Announcements" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/** Apply the active category filter, mirroring the old all-news.js logic. */
function applyFilter(articles: NewsArticle[], filter: FilterKey): NewsArticle[] {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  switch (filter) {
    case "recent":
      return articles.filter((a) => new Date(a.created_at) >= oneWeekAgo);
    case "events":
      return articles.filter(
        (a) =>
          a.title.toLowerCase().includes("event") ||
          a.content.toLowerCase().includes("event"),
      );
    case "announcements":
      return articles.filter(
        (a) =>
          a.title.toLowerCase().includes("announcement") ||
          a.content.toLowerCase().includes("announcement"),
      );
    default:
      return articles;
  }
}

export function AllNewsPage() {
  const { articles, status } = useNews();
  const [selected, setSelected] = useState<NewsArticle | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page, setPage] = useState(1);

  // Filter + search, recomputed only when inputs change.
  const filtered = useMemo(() => {
    let result = applyFilter(articles, filter);
    const term = search.toLowerCase().trim();
    if (term) {
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(term) ||
          extractTextPreview(a.content, 500).toLowerCase().includes(term),
      );
    }
    return result;
  }, [articles, filter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const pageItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="all-news-page">
      <div className="all-news-container">
        <div className="page-header">
          <h1>News &amp; Updates</h1>
          <p>
            Stay informed with the latest news and announcements from PUP
            Parañaque Campus
          </p>
        </div>

        <div className="news-controls">
          <div className="search-box">
            <i className="fa fa-search" />
            <input
              type="text"
              placeholder="Search news articles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="filter-buttons">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={cx("filter-btn", filter === f.key && "active")}
                onClick={() => {
                  setFilter(f.key);
                  setPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="all-news-grid">
          {status === "loading" && (
            <div className="news-loading">
              <i className="fa fa-spinner fa-spin" />
              <p>Loading news articles...</p>
            </div>
          )}

          {status === "error" && (
            <div className="news-error">
              <i className="fa fa-exclamation-triangle" />
              <h3>Error Loading News</h3>
              <p>Please refresh the page and try again.</p>
            </div>
          )}

          {status === "ready" && pageItems.length === 0 && (
            <div className="news-empty">
              <i className="fa fa-newspaper" />
              <h3>No News Found</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          )}

          {status === "ready" &&
            pageItems.map((article) => (
              <NewsCard key={article.id} article={article} onOpen={setSelected} />
            ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="fa fa-chevron-left" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                className={cx(num === currentPage && "active")}
                onClick={() => goToPage(num)}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <i className="fa fa-chevron-right" />
            </button>
          </div>
        )}
      </div>

      <NewsModal article={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
