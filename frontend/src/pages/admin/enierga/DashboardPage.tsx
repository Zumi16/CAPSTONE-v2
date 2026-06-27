import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/dashboard.css";

/** Python analytics microservice (not behind the Vite /api proxy). */
const PYTHON_API_URL = "http://localhost:5000/api";

type EventItem = {
  event_type: string;
  title: string;
  details?: string | null;
  created_at: string;
};

type DashboardStats = {
  totalUpdates: number;
  totalReports: number;
  totalRepoItems: number;
};

type FileRow = {
  id: number;
  filename?: string;
  file_name?: string;
  uploaded_at?: string;
};

type AnalyticsResult = {
  title: string;
  date: string;
  records: number;
  chartImage: string;
  stats: { mean: number; median: number; std: number; range: number };
};

const EVENT_ICONS: Record<string, string> = {
  file_upload: "fa-solid fa-upload updates-icon blue",
  report_generated: "fa-solid fa-chart-line updates-icon purple",
  repo_update: "fa-solid fa-folder updates-icon orange",
  repo_file_added: "fa-solid fa-folder-plus updates-icon yellow",
  repo_file_deleted: "fa-solid fa-trash updates-icon red",
  chart_created: "fa-solid fa-chart-simple updates-icon green",
};

function eventIcon(type: string): string {
  return EVENT_ICONS[type] ?? "fa-solid fa-info-circle updates-icon";
}

function timeAgo(timestamp: string): string {
  const diffSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  if (diffDay < 30) {
    const w = Math.floor(diffDay / 7);
    return `${w} week${w > 1 ? "s" : ""} ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function DashboardPage() {
  const now = useNow();

  const [stats, setStats] = useState<DashboardStats>({
    totalUpdates: 0,
    totalReports: 0,
    totalRepoItems: 0,
  });
  const [recent, setRecent] = useState<EventItem[]>([]);
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [showAll, setShowAll] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsResult[] | null>(null);
  const [analyticsState, setAnalyticsState] = useState<"loading" | "ready" | "empty" | "error">(
    "loading",
  );

  // Summary cards + recent updates. Re-fetches every 30s like the old page.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [statsRes, recentRes, allRes] = await Promise.all([
          api.get<{ success: boolean; stats: DashboardStats }>("/api/dashboard/stats"),
          api.get<{ success: boolean; events: EventItem[] }>("/api/events/recent?limit=7"),
          api.get<{ success: boolean; events: EventItem[] }>("/api/events/recent?limit=100"),
        ]);
        if (cancelled) return;
        if (statsRes.success) setStats(statsRes.stats);
        setRecent(recentRes.success ? recentRes.events : []);
        setAllEvents(allRes.success ? allRes.events : []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    };

    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Analytics overview: pull recent files, then ask the Python service to
  // process the first few. Degrades to empty/error when the service is down.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setAnalyticsState("loading");
      try {
        const files = await api.get<FileRow[]>("/api/files/data");
        if (!files || files.length === 0) {
          if (!cancelled) setAnalyticsState("empty");
          return;
        }

        const results: AnalyticsResult[] = [];
        for (const file of files.slice(0, 3)) {
          const filename = file.filename ?? file.file_name;
          if (!filename) continue;
          const chartType = localStorage.getItem(`chartType_${filename}`) || "bar";
          try {
            const res = await fetch(`${PYTHON_API_URL}/analytics/process`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename, chart_type: chartType }),
            });
            if (!res.ok) continue;
            const data = await res.json();
            results.push({
              title: filename,
              date: file.uploaded_at
                ? new Date(file.uploaded_at).toLocaleDateString()
                : "",
              records: data.statistics.count,
              chartImage: data.chart_image,
              stats: data.statistics,
            });
          } catch {
            // Python service unreachable for this file — skip it.
          }
        }

        if (cancelled) return;
        if (results.length === 0) {
          setAnalyticsState("error");
        } else {
          setAnalytics(results);
          setAnalyticsState("ready");
        }
      } catch (err) {
        console.error("Failed to load analytics overview:", err);
        if (!cancelled) setAnalyticsState("error");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dateText = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });

  const totalRecords = analytics?.reduce((sum, r) => sum + r.records, 0) ?? 0;
  const avgMean = analytics?.length
    ? analytics.reduce((sum, r) => sum + r.stats.mean, 0) / analytics.length
    : 0;

  return (
    <div className="admin-dashboard">
      <h1>Welcome, Admin!</h1>
      <p className="datetime">{dateText}</p>

      {/* Summary cards */}
      <section className="summary-cards">
        <div className="card-grid">
          <div className="summary-card faculty">
            <div className="card-icon faculty">
              <i className="fas fa-bell" />
            </div>
            <div className="card-content">
              <h3 className="card-number">{stats.totalUpdates}</h3>
              <p className="card-label">Recent System Updates</p>
            </div>
          </div>

          <div className="summary-card alumni">
            <div className="card-icon alumni">
              <i className="fas fa-chart-line" />
            </div>
            <div className="card-content">
              <h3 className="card-number">{stats.totalReports}</h3>
              <p className="card-label">Reports Generated</p>
            </div>
          </div>

          <div className="summary-card research">
            <div className="card-icon research">
              <i className="fas fa-folder-open" />
            </div>
            <div className="card-content">
              <h3 className="card-number">{stats.totalRepoItems}</h3>
              <p className="card-label">Repository Items</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent updates */}
      <section className="updates-section">
        <div className="updates-header">
          <h2>Recent System Updates</h2>
          <button className="updates-viewall" onClick={() => setShowAll(true)}>
            View All
          </button>
        </div>

        <table className="updates-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center" }}>
                  No recent updates
                </td>
              </tr>
            ) : (
              recent.map((ev, i) => (
                <tr key={`${ev.created_at}-${i}`}>
                  <td>
                    <i className={eventIcon(ev.event_type)} /> {ev.title}
                  </td>
                  <td>{ev.details || ""}</td>
                  <td>{timeAgo(ev.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* View-all modal */}
      {showAll && (
        <div className="updates-modal" onClick={() => setShowAll(false)}>
          <div className="updates-modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="updates-close" onClick={() => setShowAll(false)}>
              &times;
            </span>
            <h3>All Updates</h3>
            <div className="updates-modal-body">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {allEvents.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center" }}>
                        No updates available
                      </td>
                    </tr>
                  ) : (
                    allEvents.map((ev, i) => (
                      <tr key={`${ev.created_at}-${i}`}>
                        <td>{ev.title}</td>
                        <td>{ev.details || ""}</td>
                        <td>{new Date(ev.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics overview */}
      <section className="analytics-overview-section">
        <div className="section-header analytics-header">
          <h2>
            <i className="bi bi-graph-up-arrow" /> Analytics Overview
          </h2>
        </div>

        {analyticsState === "loading" && (
          <div className="analytics-loading">
            <i className="fas fa-spinner fa-spin" />
            <p>Loading analytics...</p>
          </div>
        )}

        {analyticsState === "empty" && (
          <div className="analytics-empty">
            <i className="fas fa-inbox" />
            <p>No analytics data available yet. Upload files to generate analytics.</p>
          </div>
        )}

        {analyticsState === "error" && (
          <div className="analytics-error">
            <i className="fas fa-triangle-exclamation" />
            <p>
              Analytics service is unavailable. Start the Python API on port 5000 to
              see chart summaries.
            </p>
          </div>
        )}

        {analyticsState === "ready" && analytics && (
          <>
            <div className="analytics-summary">
              <div className="summary-stat">
                <i className="fas fa-chart-bar" />
                <div>
                  <h4>{analytics.length}</h4>
                  <p>Active Datasets</p>
                </div>
              </div>
              <div className="summary-stat">
                <i className="fas fa-database" />
                <div>
                  <h4>{totalRecords.toLocaleString()}</h4>
                  <p>Total Records</p>
                </div>
              </div>
              <div className="summary-stat">
                <i className="fas fa-calculator" />
                <div>
                  <h4>{avgMean.toFixed(2)}</h4>
                  <p>Average Mean</p>
                </div>
              </div>
            </div>

            <div className="analytics-grid">
              {analytics.map((r) => (
                <div className="analytics-card" key={r.title}>
                  <div className="analytics-card-header">
                    <div>
                      <h3>{r.title}</h3>
                      <p className="analytics-date">
                        <i className="bi bi-calendar3" /> {r.date}
                      </p>
                    </div>
                    <span className="analytics-badge">{r.records} records</span>
                  </div>
                  <div className="analytics-chart-preview">
                    <img src={r.chartImage} alt="Chart Preview" />
                  </div>
                  <div className="analytics-stats-mini">
                    {(
                      [
                        ["Mean", r.stats.mean],
                        ["Median", r.stats.median],
                        ["Std Dev", r.stats.std],
                        ["Range", r.stats.range],
                      ] as const
                    ).map(([label, value]) => (
                      <div className={cx("stat-item")} key={label}>
                        <span className="stat-label">{label}</span>
                        <span className="stat-value">{value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
