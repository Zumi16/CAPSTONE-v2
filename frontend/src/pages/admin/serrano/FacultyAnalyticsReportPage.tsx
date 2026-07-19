import { useEffect, useMemo, useRef, useState } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";

import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { getStoredAdminId } from "@/lib/adminAuth";
import "@/styles/pages/admin/faculty-analytics.css";

/**
 * adminSerrano → Analytics & AI Insights.
 *
 * Migration of facultyAnalyticsReport.js: two tabs (Faculty Analytics with six
 * Chart.js charts, and an "AI Insights Report" generated client-side from the
 * faculty roster, exactly like the legacy heuristic). Data from `GET /api/faculty`.
 */

const PROGRAMS = ["BSIT", "BSCpE", "BSHM", "BSOA"];

type Faculty = {
  employment_type?: string;
  highest_degree?: string;
  program?: string;
  birthdate?: string;
  last_pds_update?: string;
  is_active?: boolean;
};

function calculateAge(birthdate: string): number {
  const b = new Date(birthdate);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

/** Mounts a Chart.js chart on a canvas and tears it down on unmount/config change. */
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

export function FacultyAnalyticsReportPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [tab, setTab] = useState<"analytics" | "ai-report">("analytics");

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Faculty[]>("/api/faculty");
        setFaculty(Array.isArray(data) ? data : []);
      } catch {
        setFaculty([]);
      }
    })();
  }, []);

  const active = useMemo(() => faculty.filter((f) => f.is_active), [faculty]);

  return (
    <div className="faculty-analytics-page">
      <div className="tab-navigation">
        <button className={cx("tab-btn", tab === "analytics" && "active")} onClick={() => setTab("analytics")}>
          <i className="fas fa-chart-bar" /> Faculty Analytics
        </button>
        <button className={cx("tab-btn", tab === "ai-report" && "active")} onClick={() => setTab("ai-report")}>
          <i className="fas fa-robot" /> AI Insights Report
        </button>
      </div>

      <div className="dashboard-content">
        {tab === "analytics" ? <AnalyticsTab faculty={active} /> : <AIReportTab faculty={active} />}
      </div>
    </div>
  );
}

function AnalyticsTab({ faculty }: { faculty: Faculty[] }) {
  const charts = useMemo<{ title: string; config: ChartConfiguration }[]>(() => {
    if (faculty.length === 0) return [];
    const count = (pred: (f: Faculty) => boolean) => faculty.filter(pred).length;

    // Age ranges
    const ranges = { "20-30": 0, "31-40": 0, "41-50": 0, "51-60": 0, "60+": 0 };
    faculty.filter((f) => f.birthdate).forEach((f) => {
      const a = calculateAge(f.birthdate!);
      if (a <= 30) ranges["20-30"]++;
      else if (a <= 40) ranges["31-40"]++;
      else if (a <= 50) ranges["41-50"]++;
      else if (a <= 60) ranges["51-60"]++;
      else ranges["60+"]++;
    });

    // PDS status
    const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const pds = { "Up to Date": 0, "Outdated (1+ year)": 0, "Severely Outdated (2+ years)": 0, "Never Updated": 0 };
    faculty.forEach((f) => {
      if (!f.last_pds_update) pds["Never Updated"]++;
      else {
        const d = new Date(f.last_pds_update);
        if (d < twoYearsAgo) pds["Severely Outdated (2+ years)"]++;
        else if (d < oneYearAgo) pds["Outdated (1+ year)"]++;
        else pds["Up to Date"]++;
      }
    });

    const percentTooltip = {
      callbacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        label: (ctx: any) => {
          const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
          const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : "0";
          return `${ctx.label || ""}: ${ctx.parsed} (${pct}%)`;
        },
      },
    };

    return [
      {
        title: "Employment Distribution",
        config: {
          type: "doughnut",
          data: {
            labels: ["Regular", "Part-Time"],
            datasets: [{ data: [count((f) => f.employment_type === "Regular"), count((f) => f.employment_type === "Part-Time")], backgroundColor: ["#4facfe", "#f5576c"], borderWidth: 3, borderColor: "#ffffff" }],
          },
          options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: "bottom" }, tooltip: percentTooltip } },
        },
      },
      {
        title: "Degree Distribution",
        config: {
          type: "pie",
          data: {
            labels: ["Bachelor", "Master", "Doctorate"],
            datasets: [{ data: [count((f) => f.highest_degree === "Bachelor"), count((f) => f.highest_degree === "Master"), count((f) => f.highest_degree === "Doctorate")], backgroundColor: ["#fce7f3", "#e0e7ff", "#dbeafe"], borderWidth: 3, borderColor: "#ffffff" }],
          },
          options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: "bottom" } } },
        },
      },
      {
        title: "Faculty by Program",
        config: {
          type: "bar",
          data: {
            labels: PROGRAMS,
            datasets: [{ label: "Faculty Count", data: PROGRAMS.map((p) => count((f) => f.program === p)), backgroundColor: ["#667eea", "#f5576c", "#4facfe", "#fbc02d"], borderWidth: 0, borderRadius: 8 }],
          },
          options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } },
        },
      },
      {
        title: "Qualifications Overview",
        config: {
          type: "bar",
          data: {
            labels: PROGRAMS,
            datasets: [
              { label: "Doctorate", data: PROGRAMS.map((p) => count((f) => f.program === p && f.highest_degree === "Doctorate")), backgroundColor: "#dbeafe" },
              { label: "Master", data: PROGRAMS.map((p) => count((f) => f.program === p && f.highest_degree === "Master")), backgroundColor: "#e0e7ff" },
              { label: "Bachelor", data: PROGRAMS.map((p) => count((f) => f.program === p && f.highest_degree === "Bachelor")), backgroundColor: "#fce7f3" },
            ],
          },
          options: { responsive: true, maintainAspectRatio: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { position: "bottom" } } },
        },
      },
      {
        title: "Age Distribution",
        config: {
          type: "bar",
          data: { labels: Object.keys(ranges), datasets: [{ label: "Faculty Count", data: Object.values(ranges), backgroundColor: "#667eea", borderRadius: 8 }] },
          options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } },
        },
      },
      {
        title: "PDS Update Status",
        config: {
          type: "doughnut",
          data: { labels: Object.keys(pds), datasets: [{ data: Object.values(pds), backgroundColor: ["#48bb78", "#f59e0b", "#f56565", "#94a3b8"], borderWidth: 3, borderColor: "#ffffff" }] },
          options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: "bottom" } } },
        },
      },
    ];
  }, [faculty]);

  return (
    <>
      <h2><i className="fas fa-chart-bar" /> Faculty Analytics</h2>
      {charts.length === 0 ? (
        <div className="analytics-grid">
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <i className="fas fa-chart-bar" />
            <h4>No Data Available</h4>
            <p>Add faculty members to view analytics</p>
          </div>
        </div>
      ) : (
        <div className="analytics-grid">
          {charts.map((c) => (
            <div className="chart-card" key={c.title}>
              <h3>{c.title}</h3>
              <ChartCanvas config={c.config} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

type Insight = { type: "positive" | "concern" | "priority" | "critical" | "observation"; text: string };
type Recommendation = { priority: "High" | "Medium" | "Low"; category: string; recommendation: string; expectedImpact: string };
type Report = {
  executiveSummary: string;
  statistics: { total: number; regular: number; partTime: number; regularPercent: string; partTimePercent: string; doctoral: number; masters: number; bachelor: number; doctoralPercent: string; mastersPercent: string; bachelorPercent: string };
  programStats: { program: string; count: number; percent: string; advancedPercent: string }[];
  keyInsights: Insight[];
  recommendations: Recommendation[];
  generatedAt: string;
  generatedBy?: string | null;
};

const INSIGHT_ICON: Record<Insight["type"], string> = {
  positive: "fa-check-circle",
  concern: "fa-exclamation-triangle",
  priority: "fa-flag",
  critical: "fa-exclamation-circle",
  observation: "fa-circle-info",
};

function AIReportTab({ faculty }: { faculty: Faculty[] }) {
  const [report, setReport] = useState<Report | null>(null);
  const [fetching, setFetching] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load whatever was last saved — free, no AI call. The report only
  // changes when an admin explicitly clicks "Regenerate Report" below.
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ report: Report | null }>("/api/faculty/ai-report");
        setReport(data.report);
      } catch (err) {
        console.error("Failed to load saved AI report:", err);
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  async function generate() {
    if (faculty.length === 0) {
      window.alert("No faculty data available to generate report");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const data = await api.post<{ report: Report }>("/api/faculty/ai-report/generate", {
        adminid: getStoredAdminId(),
      });
      setReport(data.report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate the AI report. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <div className="report-header">
        <h2><i className="fas fa-robot" /> AI Faculty Insights Report</h2>
        <button className="btn-primary" onClick={generate} disabled={generating || fetching}>
          <i className={cx("fas", generating ? "fa-spinner fa-spin" : "fa-sync-alt")} />
          {generating ? " Generating…" : report ? " Regenerate Report" : " Generate Report"}
        </button>
      </div>

      {error && (
        <div className="report-error">
          <i className="fas fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div className="report-container">
        {fetching ? (
          <div className="report-loading">
            <i className="fas fa-spinner fa-spin" />
            <p>Loading saved report…</p>
          </div>
        ) : generating ? (
          <div className="report-loading">
            <i className="fas fa-spinner fa-spin" />
            <p>Generating comprehensive AI insights report...</p>
            <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: 10 }}>Analyzing {faculty.length} faculty records with Gemini...</p>
          </div>
        ) : !report ? (
          <div className="report-loading">
            <i className="fas fa-robot" />
            <p>No AI report has been generated yet. Click "Generate Report" above to create one.</p>
          </div>
        ) : (
          <>
            <div className="report-section">
              <h3><i className="fas fa-file-alt" /> Executive Summary</h3>
              <div className="report-content"><p>{report.executiveSummary}</p></div>
            </div>

            <div className="report-section">
              <h3><i className="fas fa-chart-bar" /> Statistical Overview</h3>
              <div className="report-stats">
                <div className="stat-box"><h4>Total Faculty</h4><p>{report.statistics.total}</p></div>
                <div className="stat-box"><h4>Regular Faculty</h4><p>{report.statistics.regular} ({report.statistics.regularPercent}%)</p></div>
                <div className="stat-box"><h4>Doctoral Holders</h4><p>{report.statistics.doctoral} ({report.statistics.doctoralPercent}%)</p></div>
                <div className="stat-box"><h4>Master's Holders</h4><p>{report.statistics.masters} ({report.statistics.mastersPercent}%)</p></div>
              </div>
            </div>

            <div className="report-section">
              <h3><i className="fas fa-building-columns" /> Program Distribution</h3>
              <div className="report-stats">
                {report.programStats.map((p) => (
                  <div className="stat-box" key={p.program}>
                    <h4>{p.program}</h4>
                    <p>{p.count} faculty ({p.percent}%)</p>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 5 }}>{p.advancedPercent}% advanced degrees</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-section">
              <h3><i className="fas fa-lightbulb" /> Key Insights</h3>
              <ul className="insights-list">
                {report.keyInsights.length === 0 ? (
                  <li className="observation"><i className="fas fa-circle-info" /> No notable insights — faculty qualifications are within expected ranges.</li>
                ) : (
                  report.keyInsights.map((ins, i) => (
                    <li className={ins.type} key={i}><i className={cx("fas", INSIGHT_ICON[ins.type])} /> {ins.text}</li>
                  ))
                )}
              </ul>
            </div>

            <div className="report-section">
              <h3><i className="fas fa-tasks" /> Strategic Recommendations</h3>
              <div className="recommendations-list">
                {report.recommendations.map((rec, i) => (
                  <div className="recommendation-card" key={i}>
                    <div className="rec-header">
                      <span className={cx("priority-badge", `badge-${rec.priority.toLowerCase()}`)}>{rec.priority} Priority</span>
                      <strong>{rec.category}</strong>
                    </div>
                    <p className="rec-recommendation">{rec.recommendation}</p>
                    <p className="rec-impact"><strong>Expected Impact:</strong> {rec.expectedImpact}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-footer">
              <p>
                <strong>Report Generated:</strong> {new Date(report.generatedAt).toLocaleString()}
                {report.generatedBy ? ` by ${report.generatedBy}` : ""}
              </p>
              <p><em>Generated by Gemini AI and saved — click "Regenerate Report" to refresh it with the latest faculty data.</em></p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
