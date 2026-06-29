import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/admin/cmo-dashboard.css";

/**
 * adminCMO → Dashboard. Communications & Marketing overview built from the news
 * API: total / published / this-month / trashed metric cards, a recent-articles
 * list, publishing-trend insights, quick actions, and derived system alerts.
 *
 * Endpoints (under `/api/news`): /posts (published), /trash (deleted).
 */

type Post = { id: number; title: string; content: string; created_at: string };
type ApiList = { success?: boolean; posts?: Post[] };
type Alert = { type: "info" | "warning" | "error" | "success"; title: string; message: string };

const DAY = 86400000;

const isThisMonth = (d: string) => {
  const date = new Date(d), now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, secs] of intervals) {
    const n = Math.floor(seconds / secs);
    if (n >= 1) return `${n} ${unit}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

/** Counts up to `value` over ~1s, mirroring the legacy animateValue. */
function AnimatedValue({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    let raf = 0, start = 0;
    const from = ref.current;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setDisplay(Math.floor(p * (value - from) + from));
      if (p < 1) raf = requestAnimationFrame(step);
      else ref.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

const ICONS: Record<Alert["type"], string> = { success: "fa-check-circle", warning: "fa-exclamation-triangle", error: "fa-times-circle", info: "fa-info-circle" };

export function CmoDashboardPage() {
  const navigate = useNavigate();
  const [published, setPublished] = useState<Post[]>([]);
  const [trashed, setTrashed] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, t] = await Promise.all([
          api.get<ApiList>("/api/news/posts"),
          api.get<ApiList>("/api/news/trash"),
        ]);
        setPublished(p.success ? p.posts ?? [] : []);
        setTrashed(t.success ? t.posts ?? [] : []);
      } catch {
        setError(true);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const stats = useMemo(() => ({
    total: published.length + trashed.length,
    published: published.length,
    trashed: trashed.length,
    recent: published.filter((p) => isThisMonth(p.created_at)).length,
  }), [published, trashed]);

  const insights = useMemo(() => {
    const n = Date.now();
    const thisWeek = published.filter((p) => n - new Date(p.created_at).getTime() <= 7 * DAY).length;
    const lastWeek = published.filter((p) => { const d = n - new Date(p.created_at).getTime(); return d > 7 * DAY && d <= 14 * DAY; }).length;
    const sorted = [...published].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    let trend: { dir: "up" | "down" | "stable"; text: string };
    if (thisWeek > lastWeek) trend = { dir: "up", text: `Increasing - ${thisWeek} articles this week` };
    else if (thisWeek < lastWeek) trend = { dir: "down", text: `Decreasing - ${thisWeek} articles this week` };
    else trend = { dir: "stable", text: `Stable - ${thisWeek} articles this week` };

    let message: string;
    if (published.length === 0) message = "Start publishing articles to engage with your audience and keep them informed.";
    else if (thisWeek === 0) message = "No articles published this week. Consider creating fresh content to maintain engagement.";
    else if (thisWeek > lastWeek) message = `Great momentum! You've published ${thisWeek} articles this week, up from ${lastWeek} last week.`;
    else message = `You have ${published.length} total articles published. Keep up the great work!`;

    return { trend, message, lastPublished: sorted.length ? timeAgo(new Date(sorted[0].created_at)) : "No recent posts" };
  }, [published]);

  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];
    if (published.length === 0) list.push({ type: "info", title: "No Published Articles", message: "Start creating content to engage with your audience." });
    const old = published.filter((p) => Date.now() - new Date(p.created_at).getTime() > 30 * DAY);
    if (old.length > 5) list.push({ type: "warning", title: "Outdated Content", message: `${old.length} articles are over a month old. Consider updating or archiving.` });
    if (trashed.length > 10) list.push({ type: "info", title: "Trash Full", message: `${trashed.length} items in trash. Consider permanent deletion.` });
    if (published.length > 0 && list.length === 0) list.push({ type: "success", title: "System Healthy", message: "All systems operational. Keep up the great work!" });
    return list;
  }, [published, trashed]);

  const recent = published.slice(0, 6);
  const goNews = () => navigate(PATHS.admin.cmo.news);

  return (
    <div className="cmo-dashboard">
      {/* Welcome */}
      <section className="welcome-section">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome back, <span>Admin CMO</span>!</h1>
          <p className="welcome-subtitle">Communications &amp; Marketing Office Overview</p>
          <div className="datetime-display">
            <i className="far fa-clock" />
            <span>{now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        </div>
        <div className="system-status">
          <div className="status-indicator">
            <div className="status-dot operational" />
            <div className="status-text">
              <span className="status-label">System Status</span>
              <span className="status-value">Operational</span>
            </div>
          </div>
          <div className="last-sync"><i className="fas fa-sync-alt" /><span>Last sync: Just now</span></div>
        </div>
      </section>

      {/* Metrics */}
      <section className="metrics-section">
        <div className="metrics-grid">
          <MetricCard variant="gradient-blue" icon="fa-newspaper" value={stats.total} loaded={loaded} error={error} label="Total Articles" sub="All-time posts" />
          <MetricCard variant="gradient-green" icon="fa-check-circle" value={stats.published} loaded={loaded} error={error} label="Published" sub="Live on site" />
          <MetricCard variant="gradient-purple" icon="fa-clock" value={stats.recent} loaded={loaded} error={error} label="This Month" sub="Recent articles" />
          <MetricCard variant="gradient-orange" icon="fa-trash" value={stats.trashed} loaded={loaded} error={error} label="In Trash" sub="Deleted items" />
        </div>
      </section>

      {/* Two columns */}
      <div className="content-columns">
        <div className="left-column">
          <section className="insights-card">
            <div className="card-header">
              <h3><i className="fas fa-newspaper" /> Recent Articles</h3>
              <button className="view-all-btn" onClick={goNews}>View All</button>
            </div>
            <div className="card-body">
              <div className="recent-news-list">
                {!loaded ? (
                  <div className="skeleton-activity"><div className="skeleton-loader" /><div className="skeleton-loader" /><div className="skeleton-loader" /></div>
                ) : error ? (
                  <div className="empty-state"><i className="fa fa-exclamation-triangle" /><h4>Error Loading Data</h4><p>Please refresh the page and try again.</p></div>
                ) : recent.length === 0 ? (
                  <div className="empty-state"><i className="fa fa-newspaper" /><h4>No News Articles Yet</h4><p>Start by creating your first news article.</p></div>
                ) : recent.map((post) => (
                  <div className="news-item" key={post.id} onClick={goNews}>
                    <div className="news-icon"><i className="fa fa-newspaper" /></div>
                    <div className="news-content">
                      <h4 className="news-title">{post.title}</h4>
                      <div className="news-meta">
                        <span><i className="fa fa-calendar" /> {formatDate(post.created_at)}</span>
                        <span><i className="fa fa-clock" /> {timeAgo(new Date(post.created_at))}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="insights-card">
            <div className="card-header"><h3><i className="fas fa-chart-line" /> Publishing Insights</h3></div>
            <div className="card-body">
              <div className="insight-item">
                <div className={cx("insight-icon", "trending", insights.trend.dir === "down" && "down", insights.trend.dir === "stable" && "stable")}>
                  <i className={cx("fas", insights.trend.dir === "up" ? "fa-arrow-up" : insights.trend.dir === "down" ? "fa-arrow-down" : "fa-minus")} />
                </div>
                <div className="insight-content">
                  <div className="insight-label">Publishing Trend</div>
                  <div className="insight-value">{loaded ? insights.trend.text : "Loading..."}</div>
                </div>
              </div>
              <div className="insight-item">
                <div className="insight-icon"><i className="fas fa-calendar" /></div>
                <div className="insight-content">
                  <div className="insight-label">Last Published</div>
                  <div className="insight-value">{insights.lastPublished}</div>
                </div>
              </div>
              <div className="insight-message">
                <i className="fas fa-lightbulb" />
                <p>{loaded ? insights.message : "Analyzing publishing patterns..."}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="right-column">
          <section className="quick-actions-card">
            <div className="card-header"><h3><i className="fas fa-bolt" /> Quick Actions</h3></div>
            <div className="card-body">
              <div className="actions-grid">
                <button className="action-button green" onClick={goNews}><i className="fas fa-plus" /><span>Create News</span></button>
                <button className="action-button blue" onClick={goNews}><i className="fas fa-edit" /><span>Manage Posts</span></button>
                <button className="action-button purple" onClick={goNews}><i className="fas fa-eye" /><span>View Published</span></button>
                <button className="action-button orange" onClick={goNews}><i className="fas fa-trash-restore" /><span>Restore Deleted</span></button>
              </div>
            </div>
          </section>

          <section className="notifications-card">
            <div className="card-header"><h3><i className="fas fa-bell" /> System Alerts</h3></div>
            <div className="card-body">
              <div className="notifications-list">
                {alerts.length === 0 ? (
                  <div className="no-notifications"><i className="fas fa-check-circle" /><p>All systems operational</p></div>
                ) : alerts.map((a, i) => (
                  <div className={cx("notification-item", a.type)} key={i}>
                    <div className="notification-icon"><i className={cx("fas", ICONS[a.type])} /></div>
                    <div className="notification-content">
                      <div className="notification-title">{a.title}</div>
                      <div className="notification-message">{a.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ variant, icon, value, loaded, error, label, sub }: { variant: string; icon: string; value: number; loaded: boolean; error: boolean; label: string; sub: string }) {
  return (
    <div className={cx("metric-card", variant)}>
      <div className="metric-icon"><i className={cx("fas", icon)} /></div>
      <div className="metric-content">
        <div className="metric-value">{!loaded ? <div className="skeleton-loader" /> : error ? "-" : <AnimatedValue value={value} />}</div>
        <div className="metric-label">{label}</div>
        <div className="metric-subtext">{sub}</div>
      </div>
    </div>
  );
}
