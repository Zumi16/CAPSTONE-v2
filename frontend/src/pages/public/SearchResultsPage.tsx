import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatLongDate } from "@/lib/format";
import "@/styles/pages/search-results.css";

/** One result row from the search API. Fields vary by section. */
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

/** The sections the API can return, in display order. */
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
    <div className="result-item" onClick={() => (window.location.href = url)}>
      <span className={cx("result-type", type)}>{type}</span>
      <h3 className="result-title">{title}</h3>
      {meta && <p className="result-meta">{meta}</p>}
      {excerpt && <p className="result-excerpt">{excerpt}</p>}
      <a href={url} className="result-url" onClick={(e) => e.stopPropagation()}>
        View Details <i className="fa fa-arrow-right" />
      </a>
    </div>
  );
}

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [input, setInput] = useState(query);
  const [results, setResults] = useState<SearchResults>({});
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [filter, setFilter] = useState<string>("all");

  // Run a search whenever the URL query changes.
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
    <main className="main">
      <div className="search-page-container">
        <div className="search-header">
          <h1>Search Results</h1>
          <div className="search-input-container">
            <form className="main-search-form" onSubmit={handleSubmit}>
              <input
                type="text"
                className="main-search-input"
                placeholder="Search for news, scholarships, announcements..."
                autoComplete="off"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button type="submit" className="main-search-btn">
                <i className="fa fa-search" /> Search
              </button>
            </form>
          </div>
          <p className="search-query">
            {query && (
              <span>
                Searching for: <strong>"{query}"</strong>
              </span>
            )}
            {status === "ready" && <span> ({total} results found)</span>}
          </p>
        </div>

        <div className="filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              className={cx("filter-tab", filter === tab.key && "active")}
              onClick={() => setFilter(tab.key)}
            >
              <i className={cx("fa", tab.icon)} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="search-results">
          {status === "ready" &&
            visibleSections.map((section) => (
              <div className="result-section" key={section.key}>
                <h2 className="result-section-title">
                  <i className={cx("fa", section.icon)} /> {section.title}
                </h2>
                {results[section.key].map((item, index) => (
                  <ResultItem key={index} item={item} type={section.key} />
                ))}
              </div>
            ))}

          {status === "error" && (
            <div className="error-state" style={{ textAlign: "center", padding: "60px 20px" }}>
              <i
                className="fa fa-exclamation-circle"
                style={{ fontSize: 64, color: "#d13438", marginBottom: 20 }}
              />
              <h2>Search Error</h2>
              <p>Failed to connect to search service</p>
            </div>
          )}
        </div>

        {status === "loading" && (
          <div className="loading-state" style={{ display: "block" }}>
            <i className="fa fa-spinner fa-spin" />
            <p>Searching...</p>
          </div>
        )}

        {status === "ready" && visibleSections.length === 0 && (
          <div className="empty-state" style={{ display: "block" }}>
            <i className="fa fa-search" />
            <h2>No Results Found</h2>
            <p>Try using different keywords or check your spelling</p>
          </div>
        )}
      </div>
    </main>
  );
}
