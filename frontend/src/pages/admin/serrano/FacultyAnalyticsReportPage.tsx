import { useEffect, useMemo, useRef, useState } from "react";
import Chart, { type ChartConfiguration } from "chart.js/auto";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
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
};

function buildReport(faculty: Faculty[]): Report {
  const total = faculty.length;
  const regular = faculty.filter((f) => f.employment_type === "Regular").length;
  const partTime = faculty.filter((f) => f.employment_type === "Part-Time").length;
  const doctoral = faculty.filter((f) => f.highest_degree === "Doctorate").length;
  const masters = faculty.filter((f) => f.highest_degree === "Master").length;
  const bachelor = faculty.filter((f) => f.highest_degree === "Bachelor").length;
  const pct = (n: number) => ((n / total) * 100).toFixed(1);

  const programStats = PROGRAMS.map((program) => {
    const count = faculty.filter((f) => f.program === program).length;
    const withDoc = faculty.filter((f) => f.program === program && f.highest_degree === "Doctorate").length;
    const withMas = faculty.filter((f) => f.program === program && f.highest_degree === "Master").length;
    return { program, count, percent: pct(count), advancedPercent: count > 0 ? (((withDoc + withMas) / count) * 100).toFixed(1) : "0.0" };
  });

  const advancedPercent = ((doctoral + masters) / total) * 100;
  const keyInsights: Insight[] = [];
  if (advancedPercent >= 70) keyInsights.push({ type: "positive", text: `Strong Academic Profile: ${advancedPercent.toFixed(1)}% of faculty hold advanced degrees, exceeding accreditation standards.` });
  else if (advancedPercent < 50) keyInsights.push({ type: "priority", text: `Qualification Enhancement Needed: Only ${advancedPercent.toFixed(1)}% hold advanced degrees. Faculty development programs recommended.` });
  if (doctoral === 0) keyInsights.push({ type: "critical", text: "No Doctoral Faculty: Urgent need to recruit or develop doctoral-qualified faculty for research and accreditation." });
  programStats.forEach((p) => {
    if (parseFloat(p.advancedPercent) < 40 && p.count > 0) keyInsights.push({ type: "concern", text: `${p.program} has low advanced degree rate: ${p.advancedPercent}%. Targeted faculty development recommended.` });
  });

  const recommendations: Recommendation[] = [];
  if (doctoral < 5) recommendations.push({ priority: "High", category: "Doctoral Faculty Recruitment", recommendation: "Implement aggressive recruitment strategy for doctoral-qualified faculty with competitive packages.", expectedImpact: "Strengthen research capabilities and institutional credibility." });
  if (advancedPercent < 60) recommendations.push({ priority: "High", category: "Faculty Development", recommendation: "Establish scholarship program for master's and doctoral studies with financial support.", expectedImpact: "Meet accreditation standards and enhance academic quality." });
  recommendations.push({ priority: "Medium", category: "Continuous Improvement", recommendation: "Develop three-year qualification enhancement roadmap aligned with CHED standards.", expectedImpact: "Systematic progress toward accreditation and competitive standing." });

  return {
    executiveSummary: `The Polytechnic University of the Philippines - Parañaque Campus employs ${total} active faculty members. The employment structure consists of ${regular} regular faculty (${pct(regular)}%) and ${partTime} part-time instructors (${pct(partTime)}%). Academic qualifications include ${doctoral} doctorate holders (${pct(doctoral)}%), ${masters} master's degree holders (${pct(masters)}%), and ${bachelor} bachelor's degree holders (${pct(bachelor)}%).`,
    statistics: { total, regular, partTime, regularPercent: pct(regular), partTimePercent: pct(partTime), doctoral, masters, bachelor, doctoralPercent: pct(doctoral), mastersPercent: pct(masters), bachelorPercent: pct(bachelor) },
    programStats,
    keyInsights,
    recommendations,
    generatedAt: new Date().toLocaleString(),
  };
}

const INSIGHT_ICON: Record<Insight["type"], string> = {
  positive: "fa-check-circle",
  concern: "fa-exclamation-triangle",
  priority: "fa-flag",
  critical: "fa-exclamation-circle",
  observation: "fa-circle-info",
};

function AIReportTab({ faculty }: { faculty: Faculty[] }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  function generate() {
    if (faculty.length === 0) {
      window.alert("No faculty data available to generate report");
      return;
    }
    setLoading(true);
    setReport(null);
    // Mirror the legacy 2s "AI processing" delay.
    setTimeout(() => {
      setReport(buildReport(faculty));
      setLoading(false);
    }, 1200);
  }

  return (
    <>
      <div className="report-header">
        <h2><i className="fas fa-robot" /> AI Faculty Insights Report</h2>
        <button className="btn-primary" onClick={generate}><i className="fas fa-sync-alt" /> Regenerate Report</button>
      </div>

      <div className="report-container">
        {loading ? (
          <div className="report-loading">
            <i className="fas fa-spinner fa-spin" />
            <p>Generating comprehensive AI insights report...</p>
            <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: 10 }}>Analyzing {faculty.length} faculty records...</p>
          </div>
        ) : !report ? (
          <div className="report-loading">
            <i className="fas fa-spinner fa-spin" />
            <p>Click "Regenerate Report" to generate AI insights...</p>
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
              <p><strong>Report Generated:</strong> {report.generatedAt}</p>
              <p><em>AI-powered insights for academic planning and strategic decision-making.</em></p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
