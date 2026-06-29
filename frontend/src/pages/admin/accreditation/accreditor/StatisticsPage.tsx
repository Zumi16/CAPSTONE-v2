import { useEffect, useMemo, useRef, useState } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/accreditation-accreditor.css";
import { reviewBadge, useAccreditor, type Review } from "./useAccreditor";

/**
 * Accreditor → My Statistics. Performance overview of the accreditor's own
 * reviews: status stat cards, a status doughnut + 7-day activity line chart, a
 * per-area performance table with progress bars, and a "last activity" panel.
 */

function ChartCanvas({ config }: { config: ChartConfiguration }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = new Chart(ref.current, config);
    return () => chartRef.current?.destroy();
  }, [config]);
  return <canvas ref={ref} />;
}

export function StatisticsPage() {
  const { user, cycle, areas, state } = useAccreditor();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (state !== "ready" || !cycle || !user) return;
    (async () => {
      try {
        const d = await api.get<{ reviews?: Review[] }>(`/api/accreditation/reviews/all/${cycle.id}`);
        setReviews((d.reviews ?? []).filter((r) => r.accreditor_id === user.id));
      } catch { /* */ }
    })();
  }, [state, cycle, user]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const complete = reviews.filter((r) => r.review_status === "Complete").length;
    const needsRevision = reviews.filter((r) => r.review_status === "Needs Revision").length;
    const incomplete = reviews.filter((r) => r.review_status === "Incomplete").length;
    const completionRate = total > 0 ? ((complete / total) * 100).toFixed(1) : "0";
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    const reviewsByArea = areas.map((area) => {
      const areaReviews = reviews.filter((r) => r.area_id === area.area_id);
      const areaComplete = areaReviews.filter((r) => r.review_status === "Complete").length;
      return { ...area, reviewed: areaReviews.length, complete: areaComplete, completion_rate: areaReviews.length > 0 ? Number(((areaComplete / areaReviews.length) * 100).toFixed(1)) : 0 };
    });

    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i); date.setHours(0, 0, 0, 0);
      const next = new Date(date); next.setDate(next.getDate() + 1);
      const count = reviews.filter((r) => { const d = new Date(r.reviewed_at ?? 0); return d >= date && d < next; }).length;
      last7Days.push({ date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count });
    }

    const recentReview = reviews.length > 0 ? reviews.reduce((a, b) => (new Date(b.reviewed_at ?? 0) > new Date(a.reviewed_at ?? 0) ? b : a)) : null;
    return { total, complete, needsRevision, incomplete, completionRate, pct, reviewsByArea, last7Days, recentReview };
  }, [reviews, areas]);

  const statusChart = useMemo<ChartConfiguration>(() => ({
    type: "doughnut",
    data: { labels: ["Complete", "Needs Revision", "Incomplete"], datasets: [{ data: [stats.complete, stats.needsRevision, stats.incomplete], backgroundColor: ["#10b981", "#f59e0b", "#ef4444"], borderWidth: 2, borderColor: "#fff" }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: "bottom", labels: { padding: 15, font: { size: 12 } } } } },
  }), [stats.complete, stats.needsRevision, stats.incomplete]);

  const activityChart = useMemo<ChartConfiguration>(() => ({
    type: "line",
    data: { labels: stats.last7Days.map((d) => d.date), datasets: [{ label: "Reviews", data: stats.last7Days.map((d) => d.count), borderColor: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.1)", tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: "#3b82f6", pointBorderColor: "#fff", pointBorderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "#e2e8f0" } }, x: { grid: { display: false } } } },
  }), [stats.last7Days]);

  if (state === "loading") return <Placeholder spinner title="Loading…" />;
  if (state === "no-cycle") return <Placeholder icon="fa-exclamation-circle" title="No Active Cycle" text="There is no active accreditation cycle." />;
  if (state === "no-user") return <Placeholder icon="fa-user-slash" title="Not Signed In" text="Please log in as an Accreditor to view this page." />;
  // "no-area" still renders the page (an accreditor may have reviews but be shown empty area table).

  return (
    <div className="accreditor-page">
      <div className="page-header">
        <div className="header-content"><h1 className="main-title">My Statistics</h1><p className="subtitle">Performance overview for {cycle?.academic_year ?? ""}</p></div>
        <div className="assigned-areas-badge"><i className="fas fa-chart-line" /> {stats.completionRate}% Completion Rate</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon total"><i className="fas fa-clipboard-check" /></div><div className="stat-content"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Reviews</div></div></div>
        <PctStat icon="fa-check-circle" variant="complete" value={stats.complete} label="Complete" pct={stats.pct(stats.complete)} />
        <PctStat icon="fa-exclamation-triangle" variant="pending" value={stats.needsRevision} label="Needs Revision" pct={stats.pct(stats.needsRevision)} />
        <PctStat icon="fa-times-circle" variant="reviewed" value={stats.incomplete} label="Incomplete" pct={stats.pct(stats.incomplete)} />
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <div className="card-header"><h3 className="card-title"><i className="fas fa-chart-pie" /> Status Distribution</h3></div>
          <div className="chart-container"><ChartCanvas config={statusChart} /></div>
        </div>
        <div className="chart-card">
          <div className="card-header"><h3 className="card-title"><i className="fas fa-chart-line" /> Recent Activity (Last 7 Days)</h3></div>
          <div className="chart-container"><ChartCanvas config={activityChart} /></div>
        </div>
      </div>

      <div className="sections-card">
        <div className="card-header"><h2 className="card-title"><i className="fas fa-layer-group" /> Performance by Area</h2></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Area</th><th>Total Sections</th><th>Reviewed</th><th>Complete</th><th>Completion Rate</th><th>Progress</th></tr></thead>
            <tbody>
              {stats.reviewsByArea.length === 0 ? (
                <tr><td colSpan={6} className="no-data">No assigned areas</td></tr>
              ) : stats.reviewsByArea.map((area) => (
                <tr key={area.area_id}>
                  <td><strong>Area {area.area_number}</strong><br /><span style={{ fontSize: 12, color: "#64748b" }}>{area.area_name}</span></td>
                  <td>{area.total_sections}</td>
                  <td>{area.reviewed}</td>
                  <td>{area.complete}</td>
                  <td><span className={cx("badge", area.completion_rate >= 80 ? "badge-green" : area.completion_rate >= 50 ? "badge-yellow" : "badge-red")}>{area.completion_rate}%</span></td>
                  <td><div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${area.completion_rate}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="info-card">
        <div className="info-header"><i className="fas fa-clock" /><h3>Last Activity</h3></div>
        <div className="info-content">
          {stats.recentReview ? (
            <>
              <p><strong>Last Reviewed:</strong> {stats.recentReview.section_name}</p>
              <p><strong>Status:</strong> <span className={cx("badge", reviewBadge(stats.recentReview.review_status).cls)}>{reviewBadge(stats.recentReview.review_status).label}</span></p>
              <p><strong>Date:</strong> {stats.recentReview.reviewed_at ? new Date(stats.recentReview.reviewed_at).toLocaleString() : "Unknown"}</p>
            </>
          ) : <p>No reviews yet</p>}
        </div>
      </div>
    </div>
  );
}

function PctStat({ icon, variant, value, label, pct }: { icon: string; variant: string; value: number; label: string; pct: number }) {
  return (
    <div className="stat-card">
      <div className={cx("stat-icon", variant)}><i className={cx("fas", icon)} /></div>
      <div className="stat-content"><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-percentage">{pct}%</div></div>
    </div>
  );
}

function Placeholder({ icon, title, text, spinner }: { icon?: string; title: string; text?: string; spinner?: boolean }) {
  return (
    <div className="accreditor-page">
      <div className="no-data-message"><i className={spinner ? "fas fa-spinner fa-spin" : cx("fas", icon)} /><h2>{title}</h2>{text && <p>{text}</p>}</div>
    </div>
  );
}
