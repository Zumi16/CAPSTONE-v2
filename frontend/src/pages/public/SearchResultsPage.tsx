import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatLongDate } from "@/lib/format";

type SearchItem = {
  title?: string;
  name?: string;
  excerpt?: string;
  description?: string;
  meta?: string;
  created_at?: string;
  url?: string;
};

type SearchResults = Record<string, SearchItem[]>;

type SearchResponse = {
  success: boolean;
  results: SearchResults;
  totalResults: number;
  message?: string;
};

const SECTIONS = [
  { key: "pages", title: "Pages", icon: "fa-file" },
  { key: "news", title: "News & Updates", icon: "fa-newspaper" },
  { key: "scholarships", title: "Scholarships", icon: "fa-graduation-cap" },
  { key: "careers", title: "Career Opportunities", icon: "fa-briefcase" },
  { key: "nstp", title: "NSTP Announcements", icon: "fa-users" },
  { key: "ojt", title: "OJT Announcements", icon: "fa-building" },
  { key: "researchExtension", title: "Research & Extension", icon: "fa-flask" },
] as const;

const FILTER_TABS = [
  { key: "all", label: "All Results", icon: "fa-globe" },
  { key: "news", label: "News", icon: "fa-newspaper" },
  { key: "scholarships", label: "Scholarships", icon: "fa-graduation-cap" },
  { key: "careers", label: "Careers", icon: "fa-briefcase" },
  { key: "nstp", label: "NSTP", icon: "fa-users" },
  { key: "ojt", label: "OJT", icon: "fa-building" },
  { key: "researchExtension", label: "Research", icon: "fa-flask" },
  { key: "pages", label: "Pages", icon: "fa-file" },
] as const;

function ResultItem({ item, type }: { item: SearchItem; type: string }) {
  const title = item.title || item.name || "Untitled";
  const excerpt = item.excerpt || item.description || "";
  const meta = item.meta || (item.created_at ? formatLongDate(item.created_at) : "");
  const url = item.url || "#";

  return (
    <a
      href={url}
      className="block rounded-lg border border-gray-200 p-4 transition hover:border-maroon hover:shadow-sm"
    >
      <span className="inline-block rounded bg-rose-50 px-2 py-0.5 text-xs font-medium uppercase text-maroon">
        {type}
      </span>
      <h3 className="mt-2 text-lg font-semibold text-gray-900">{title}</h3>
      {meta && <p className="mt-0.5 text-xs text-gray-500">{meta}</p>}
      {excerpt && <p className="mt-1 text-sm text-gray-600">{excerpt}</p>}
      <span className="mt-2 inline-block text-sm font-medium text-maroon">
        View Details <i className="fa fa-arrow-right" />
      </span>
    </a>
  );
}

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [input, setInput] = useState(query);
  const [results, setResults] = useState<SearchResults>({});
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setInput(query);
    if (!query) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    api
      .get<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`)
      .then((data) => {
        if (data.success) {
          setResults(data.results);
          setTotal(data.totalResults);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch((err) => {
        console.error("Search error:", err);
        setStatus("error");
      });
  }, [query]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = input.trim();
    if (next) setSearchParams({ q: next });
  };

  const visibleSections = SECTIONS.filter(
    (section) => filter === "all" || filter === section.key,
  ).filter((section) => (results[section.key]?.length ?? 0) > 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-maroon">Search Results</h1>
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Search for news, scholarships, announcements..."
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20"
          />
          <button
            type="submit"
            className="rounded-lg bg-maroon px-5 py-2.5 font-semibold text-white hover:bg-brand-light"
          >
            <i className="fa fa-search" /> Search
          </button>
        </form>
        {query && (
          <p className="mt-3 text-gray-600">
            Searching for: <strong>"{query}"</strong>
            {status === "ready" && <span> ({total} results found)</span>}
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cx(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition",
              filter === tab.key
                ? "bg-maroon text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            <i className={cx("fa", tab.icon)} /> {tab.label}
          </button>
        ))}
      </div>

      {status === "loading" && (
        <div className="py-12 text-center text-gray-500">
          <i className="fa fa-spinner fa-spin text-3xl text-maroon" />
          <p className="mt-3">Searching...</p>
        </div>
      )}

      {status === "error" && (
        <div className="py-12 text-center text-gray-500">
          <i className="fa fa-exclamation-circle mb-3 text-4xl text-red-500" />
          <h2 className="text-lg font-semibold">Search Error</h2>
          <p>Failed to connect to search service</p>
        </div>
      )}

      {status === "ready" && (
        <div className="space-y-8">
          {visibleSections.map((section) => (
            <div key={section.key}>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-800">
                <i className={cx("fa", section.icon, "text-maroon")} /> {section.title}
              </h2>
              <div className="space-y-3">
                {results[section.key].map((item, index) => (
                  <ResultItem key={index} item={item} type={section.key} />
                ))}
              </div>
            </div>
          ))}

          {visibleSections.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              <i className="fa fa-search mb-3 text-4xl text-gray-300" />
              <h2 className="text-lg font-semibold">No Results Found</h2>
              <p>Try using different keywords or check your spelling</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
