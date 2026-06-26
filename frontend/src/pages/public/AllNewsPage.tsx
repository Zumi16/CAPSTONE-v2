import { useMemo, useState } from "react";

import { useNews, type NewsArticle } from "@/features/news/news.api";
import { NewsCard } from "@/features/news/NewsCard";
import { NewsModal } from "@/features/news/NewsModal";
import { extractTextPreview } from "@/lib/format";
import { cx } from "@/lib/cx";

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
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-maroon sm:text-4xl">News &amp; Updates</h1>
        <p className="mt-2 text-gray-600">
          Stay informed with the latest news and announcements from PUP Parañaque
          Campus
        </p>
      </div>

      {/* Controls */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <i className="fa fa-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search news articles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={cx(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                filter === f.key
                  ? "bg-maroon text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {status === "loading" && (
          <div className="col-span-full py-12 text-center text-gray-500">
            <i className="fa fa-spinner fa-spin text-3xl text-maroon" />
            <p className="mt-3">Loading news articles...</p>
          </div>
        )}
        {status === "error" && (
          <div className="col-span-full py-12 text-center text-gray-500">
            <i className="fa fa-exclamation-triangle mb-3 text-4xl text-red-500" />
            <h3 className="text-lg font-semibold">Error Loading News</h3>
          </div>
        )}
        {status === "ready" && pageItems.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            <i className="fa fa-newspaper mb-3 text-4xl text-gray-300" />
            <h3 className="text-lg font-semibold">No News Found</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div>
        )}
        {status === "ready" &&
          pageItems.map((article) => (
            <NewsCard key={article.id} article={article} onOpen={setSelected} />
          ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            <i className="fa fa-chevron-left" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => goToPage(num)}
              className={cx(
                "rounded border px-3 py-1.5",
                num === currentPage
                  ? "border-maroon bg-maroon text-white"
                  : "border-gray-300 hover:bg-gray-100",
              )}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            <i className="fa fa-chevron-right" />
          </button>
        </div>
      )}

      <NewsModal article={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
