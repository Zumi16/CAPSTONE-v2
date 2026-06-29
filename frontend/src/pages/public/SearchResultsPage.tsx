import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatLongDate } from "@/lib/format";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/search-results.css";

/**
 * The search API still returns legacy "/public/html/..." URLs from the old
 * site. Map each result to its real React route so results actually navigate
 * (and so Vite stops warning about the /public prefix).
 */
const SECTION_ROUTE: Record<string, string> = {
  news: PATHS.news,
  scholarships: PATHS.students.scholarships,
  careers: PATHS.students.careers,
  nstp: PATHS.students.nstp,
  ojt: PATHS.students.ojt,
  researchExtension: PATHS.about.researchExtension,
};

/** Legacy static-page html path fragments → React routes (for the "pages" section). */
const PAGE_ROUTE: [RegExp, string][] = [
  [/administrativeofficials/i, PATHS.about.administrativeOfficials],
  [/vicinitymap/i, PATHS.about.vicinityMap],
  [/history/i, PATHS.about.history],
  [/research&extension/i, PATHS.about.researchExtension],
  [/admission/i, PATHS.admission],
  [/campus-life/i, PATHS.campusLife],
  [/alumni/i, PATHS.alumni],
  [/feedback/i, PATHS.students.feedback],
  [/certificate-request/i, PATHS.students.certificateRequest],
  [/scholarships/i, PATHS.students.scholarships],
  [/careers/i, PATHS.students.careers],
  [/nstp/i, PATHS.students.nstp],
  [/ojt/i, PATHS.students.ojt],
  [/students/i, PATHS.students.index],
  [/quickhelp|contact/i, PATHS.contact],
  [/news/i, PATHS.news],
  [/index\.html|^\/public\/?$/i, PATHS.home],
];

/** Returns either an internal route (`to`) or an external link (`href`). */
function resolveTarget(item: SearchItem, sectionKey: string): { to?: string; href?: string } {
  const url = item.url ?? "";
  if (/^https?:\/\//i.test(url)) return { href: url }; // external (e.g. partner website)
  if (sectionKey === "pages") {
    const hit = PAGE_ROUTE.find(([re]) => re.test(url));
    return { to: hit ? hit[1] : PATHS.home };
  }
  return { to: SECTION_ROUTE[sectionKey] ?? PATHS.home };
}

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

function ResultItem({
  item,
  type,
  onOpen,
}: {
  item: SearchItem;
  type: string;
  onOpen: (item: SearchItem, type: string) => void;
}) {
  const title = item.title || item.name || "Untitled";
  const excerpt = item.excerpt || item.description || "";
  const meta = item.meta || (item.created_at ? formatLongDate(item.created_at) : "");

  return (
    <div className="result-item" onClick={() => onOpen(item, type)}>
      <span className={cx("result-type", type)}>{type}</span>
      <h3 className="result-title">{title}</h3>
      {meta && <p className="result-meta">{meta}</p>}
      {excerpt && <p className="result-excerpt">{excerpt}</p>}
      <button
        type="button"
        className="result-url"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(item, type);
        }}
      >
        View Details <i className="fa fa-arrow-right" />
      </button>
    </div>
  );
}

export function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const openResult = (item: SearchItem, type: string) => {
    const { to, href } = resolveTarget(item, type);
    if (href) window.open(href, "_blank", "noopener");
    else if (to) navigate(to);
  };

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
    <main className="main search-page">
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
                  <ResultItem key={index} item={item} type={section.key} onOpen={openResult} />
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
