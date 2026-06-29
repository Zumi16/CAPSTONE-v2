import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/accreditation-areahead.css";
import { reviewBadge, useAreaHead, type Section } from "./useAreaHead";

/**
 * Area Head → Reports (Statistics & Analytics). Submission / review breakdown of
 * the area's sections: large stat cards with progress bars, a submission
 * doughnut + review bar chart, a per-section breakdown table, performance
 * metrics, and CSV export. Read-only over `/api/accreditation/sections`.
 */

type Toast = { msg: string; type: "success" | "info" | "warning" };

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

export function ReportsPage() {
  const { cycle, area, state } = useAreaHead();
  const [sections, setSections] = useState<Section[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!cycle || !area) return;
    try {
      const d = await api.get<{ sections?: Section[] }>(`/api/accreditation/sections/${cycle.id}/${area.area_id}`);
      setSections(d.sections ?? []);
    } catch { /* */ }
  }, [cycle, area]);

  useEffect(() => { if (state === "ready") load(); }, [state, load]);

  const m = useMemo(() => {
    const total = sections.length;
    const submitted = sections.filter((s) => s.google_drive_link).length;
    const pending = total - submitted;
    const reviewed = sections.filter((s) => s.review_status && s.review_status !== "Not Reviewed").length;
    const complete = sections.filter((s) => s.review_status === "Complete").length;
    const needsRevision = sections.filter((s) => s.review_status === "Needs Revision").length;
    const incomplete = sections.filter((s) => s.review_status === "Incomplete").length;
    const notReviewed = sections.filter((s) => !s.review_status || s.review_status === "Not Reviewed").length;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const reviewedWithTimes = sections.filter((s) => s.submitted_at && s.reviewed_at);
    let avgReviewDays = 0;
    if (reviewedWithTimes.length > 0) {
      const totalDays = reviewedWithTimes.reduce((sum, s) => sum + Math.floor((new Date(s.reviewed_at!).getTime() - new Date(s.submitted_at!).getTime()) / 86400000), 0);
      avgReviewDays = Math.round(totalDays / reviewedWithTimes.length);
    }
    return { total, submitted, pending, reviewed, complete, needsRevision, incomplete, notReviewed, pct, avgReviewDays };
  }, [sections]);

  const submissionChart = useMemo<ChartConfiguration>(() => ({
    type: "doughnut",
    data: { labels: ["Submitted", "Pending"], datasets: [{ data: [m.submitted, m.pending], backgroundColor: ["#10b981", "#f59e0b"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: "bottom" } } },
  }), [m.submitted, m.pending]);

  const reviewChart = useMemo<ChartConfiguration>(() => ({
    type: "bar",
    data: { labels: ["Complete", "Needs Revision", "Incomplete", "Not Reviewed"], datasets: [{ label: "Sections", data: [m.complete, m.needsRevision, m.incomplete, m.notReviewed], backgroundColor: ["#10b981", "#f59e0b", "#ef4444", "#94a3b8"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } },
  }), [m.complete, m.needsRevision, m.incomplete, m.notReviewed]);

  async function refresh() { showToast("Refreshing statistics...", "info"); await load(); showToast("Statistics updated", "success"); }

  function exportCsv() {
    if (sections.length === 0) return showToast("No data to export", "warning");
    const rows = [["Section Name", "Link Status", "Review Status", "Submitted Date", "Days Since Submission"], ...sections.map((s) => [
      s.section_name,
      s.google_drive_link ? "Submitted" : "Not Submitted",
      s.review_status || "Not Reviewed",
      s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-",
      s.submitted_at ? String(Math.floor((Date.now() - new Date(s.submitted_at).getTime()) / 86400000)) : "-",
    ])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = `Area_${area!.area_number}_Statistics_${new Date().toISOString().split("T")[0]}.csv`; link.click();
    URL.revokeObjectURL(url);
    showToast("Statistics exported successfully", "success");
  }

  if (state === "loading") return <div className="areahead-page"><div className="no-data-message"><i className="fas fa-spinner fa-spin" /><h2>Loading…</h2></div></div>;
  if (state !== "ready") return <div className="areahead-page"><div className="no-data-message"><i className="fas fa-exclamation-circle" /><h2>No Active Assignment</h2><p>You don't have an active area assignment or accreditation cycle.</p></div></div>;

  return (
    <div className="areahead-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="main-title">Statistics &amp; Analytics</h1>
          <p className="subtitle">Area {area!.area_number}: {area!.area_name}</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={refresh}><i className="fas fa-sync" /> Refresh</button>
          <button className="btn-primary" onClick={exportCsv}><i className="fas fa-download" /> Export Report</button>
        </div>
      </div>

      <div className="stats-grid-large">
        <div className="stat-card-large total">
          <div className="stat-icon-large"><i className="fas fa-list" /></div>
          <div className="stat-content-large"><div className="stat-label-large">Total Sections</div><div className="stat-value-large">{m.total}</div><div className="stat-change positive">100%</div></div>
        </div>
        <LargeStat variant="submitted" icon="fa-check-circle" label="Submitted" value={m.submitted} pct={m.pct(m.submitted)} bar="" />
        <LargeStat variant="pending" icon="fa-clock" label="Pending" value={m.pending} pct={m.pct(m.pending)} bar="pending-bar" />
        <LargeStat variant="reviewed" icon="fa-clipboard-check" label="Reviewed" value={m.reviewed} pct={m.pct(m.reviewed)} bar="reviewed-bar" />
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <div className="chart-header"><h3 className="chart-title"><i className="fas fa-chart-pie" /> Submission Status</h3></div>
          <div className="chart-body"><ChartCanvas config={submissionChart} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3 className="chart-title"><i className="fas fa-chart-bar" /> Review Status</h3></div>
          <div className="chart-body"><ChartCanvas config={reviewChart} /></div>
        </div>
      </div>

      <div className="breakdown-card">
        <div className="breakdown-header"><h2 className="breakdown-title"><i className="fas fa-th-list" /> Section Breakdown</h2></div>
        <div className="breakdown-table-container">
          <table className="breakdown-table">
            <thead><tr><th>Section Name</th><th>Link Status</th><th>Review Status</th><th>Submitted Date</th><th>Days Since Submission</th></tr></thead>
            <tbody>
              {sections.length === 0 ? (
                <tr><td colSpan={5} className="no-data">No sections found</td></tr>
              ) : sections.map((s) => {
                const rb = reviewBadge(s.review_status);
                let daysSince = "-";
                if (s.submitted_at) {
                  const days = Math.floor((Date.now() - new Date(s.submitted_at).getTime()) / 86400000);
                  daysSince = `${days} day${days !== 1 ? "s" : ""}`;
                }
                return (
                  <tr key={s.section_id}>
                    <td><strong>{s.section_name}</strong></td>
                    <td>{s.google_drive_link ? <span className="badge badge-green">Submitted</span> : <span className="badge badge-gray">Not Submitted</span>}</td>
                    <td><span className={cx("badge", rb.cls)}>{rb.icon && <i className={cx("fas", rb.icon)} />} {rb.label}</span></td>
                    <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "-"}</td>
                    <td>{daysSince}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="metrics-grid">
        <Metric icon="fa-calendar-check" label="Submission Rate" value={`${m.pct(m.submitted)}%`} desc="Sections with links" />
        <Metric icon="fa-clock" label="Avg. Review Time" value={String(m.avgReviewDays)} desc="Days from submission" />
        <Metric icon="fa-star" label="Completion Rate" value={`${m.pct(m.complete)}%`} desc="Complete reviews" />
        <Metric icon="fa-exclamation-triangle" label="Needs Attention" value={String(m.needsRevision)} desc="Revisions required" />
      </div>

      {toast && <div className={cx("ah-toast", `toast-${toast.type}`)}>{toast.msg}</div>}
    </div>
  );
}

function LargeStat({ variant, icon, label, value, pct, bar }: { variant: string; icon: string; label: string; value: number; pct: number; bar: string }) {
  return (
    <div className={cx("stat-card-large", variant)}>
      <div className="stat-icon-large"><i className={cx("fas", icon)} /></div>
      <div className="stat-content-large">
        <div className="stat-label-large">{label}</div>
        <div className="stat-value-large">{value}</div>
        <div className="stat-progress"><div className={cx("stat-progress-bar", bar)} style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, desc }: { icon: string; label: string; value: string; desc: string }) {
  return (
    <div className="metric-card">
      <div className="metric-icon"><i className={cx("fas", icon)} /></div>
      <div className="metric-content"><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-desc">{desc}</div></div>
    </div>
  );
}
