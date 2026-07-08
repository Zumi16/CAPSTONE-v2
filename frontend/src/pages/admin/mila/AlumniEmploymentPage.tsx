import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/admin/alumni-employment.css";

/**
 * adminMila → Alumni Employment Tracking.
 *
 * Migration of alumni-employment.js: shareable survey link, stat cards,
 * time-to-employment breakdown, batch/program/status filters, a responses
 * table with delete, and CSV export of the filtered set.
 *
 * Endpoints (`/api/alumni-employment`):
 *   GET    /responses        list
 *   GET    /stats            { total, employed, unemployed, timeline[] }
 *   DELETE /responses/:id    delete
 */

const PROGRAMS = ["BSIT", "BSCpE", "BSOA", "BSHM"];
const STATUSES = ["Employed", "Self-Employed", "Unemployed"];
const TIMELINES = ["Within 3 months", "Within 6 months", "Within 1 year", "More than 1 year"] as const;

type Response = {
  id: number;
  full_name: string;
  student_number?: string;
  birth_date?: string;
  batch: string;
  program: string;
  employment_status: string;
  work_type?: string;
  employment_timeline?: string;
  submitted_at: string;
};
type Stats = { total: number; employed: number; unemployed: number; timeline: { employment_timeline: string; count: number | string }[] };

export function AlumniEmploymentPage() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, employed: 0, unemployed: 0, timeline: [] });
  const [batch, setBatch] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  const surveyLink = `${window.location.origin}${PATHS.alumni}`;

  async function loadResponses() {
    try {
      const data = await api.get<{ success?: boolean; responses?: Response[] }>("/api/alumni-employment/responses");
      if (data.success) setResponses(data.responses ?? []);
    } catch (err) {
      console.error("Error loading responses:", err);
    }
  }
  async function loadStats() {
    try {
      const data = await api.get<{ success?: boolean; stats?: Stats }>("/api/alumni-employment/stats");
      if (data.success && data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Error loading statistics:", err);
    }
  }

  useEffect(() => {
    loadResponses();
    loadStats();
  }, []);

  const batches = useMemo(
    () => [...new Set(responses.map((r) => r.batch))].sort((a, b) => Number(b) - Number(a)),
    [responses],
  );

  const filtered = useMemo(
    () =>
      responses.filter(
        (r) =>
          (!batch || r.batch === batch) &&
          (!program || r.program === program) &&
          (!status || r.employment_status === status),
      ),
    [responses, batch, program, status],
  );

  const employmentRate = stats.total > 0 ? `${((stats.employed / stats.total) * 100).toFixed(1)}%` : "0%";

  const timelineCounts = useMemo(() => {
    const counts: Record<string, number> = { "Within 3 months": 0, "Within 6 months": 0, "Within 1 year": 0, "More than 1 year": 0 };
    stats.timeline?.forEach((t) => {
      if (t.employment_timeline in counts) counts[t.employment_timeline] = Number(t.count);
    });
    return counts;
  }, [stats]);

  function copyLink() {
    navigator.clipboard.writeText(surveyLink).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => window.alert("Failed to copy link. Please copy manually."),
    );
  }

  function clearFilters() {
    setBatch("");
    setProgram("");
    setStatus("");
  }

  async function remove(id: number) {
    if (!window.confirm("Are you sure you want to delete this response?")) return;
    try {
      const data = await api.delete<{ success?: boolean }>(`/api/alumni-employment/responses/${id}`);
      if (data.success) {
        loadResponses();
        loadStats();
      } else {
        window.alert("Failed to delete response");
      }
    } catch {
      window.alert("Error deleting response. Please try again.");
    }
  }

  function exportCsv() {
    if (filtered.length === 0) {
      window.alert("No data to export");
      return;
    }
    const headers = ["Full Name", "Student Number", "Birth Date", "Batch", "Program", "Employment Status", "Work Type", "Employment Timeline", "Submitted Date"];
    const rows = filtered.map((r) => [
      r.full_name, r.student_number || "N/A",
      r.birth_date ? new Date(r.birth_date).toLocaleDateString() : "N/A",
      r.batch, r.program, r.employment_status, r.work_type || "N/A",
      r.employment_timeline || "N/A", new Date(r.submitted_at).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alumni_employment_responses_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const STAT_CARDS = [
    { value: stats.total, icon: "fa-users", label: "Total Responses" },
    { value: stats.employed, icon: "fa-briefcase", label: "Employed" },
    { value: employmentRate, icon: "fa-chart-line", label: "Employment Rate" },
    { value: stats.unemployed, icon: "fa-user-slash", label: "Unemployed" },
  ];

  return (
    <div className="alumni-emp-page">
      {/* Survey link */}
      <div className="survey-link-card">
        <div className="link-card-header">
          <i className="fa-solid fa-link" />
          <h3>Alumni Survey Link</h3>
        </div>
        <p className="link-description">Share this link with graduates via email, SMS, or social media:</p>
        <div className="link-container">
          <input type="text" className="survey-link-input" readOnly value={surveyLink} onFocus={(e) => e.currentTarget.select()} />
          <button className="copy-btn" style={copied ? { background: "#2e7d32" } : undefined} onClick={copyLink}>
            <i className={cx("fa-solid", copied ? "fa-check" : "fa-copy")} /> {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
        <p className="link-note"><i className="fa-solid fa-info-circle" /> Alumni can access this survey without logging in</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {STAT_CARDS.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-icon"><i className={cx("fa-solid", c.icon)} /></div>
            <div className="stat-info">
              <h3>{c.value}</h3>
              <p>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="timeline-stats-card">
        <h3 className="card-title"><i className="fa-solid fa-clock" /> Time to Employment</h3>
        <div className="timeline-grid">
          {TIMELINES.map((t) => (
            <div className="timeline-item" key={t}>
              <h4>{timelineCounts[t]}</h4>
              <p>{t}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="filters-header">
          <div className="filters-title">
            <i className="fa-solid fa-filter" />
            <h3>Filter Responses</h3>
          </div>
          <button className="export-btn" onClick={exportCsv}><i className="fa-solid fa-download" /> Export to CSV</button>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Batch Year</label>
            <select value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="">All Batches</option>
              {batches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Program</label>
            <select value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="">All Programs</option>
              {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Employment Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <button className="clear-filter-btn" onClick={clearFilters}><i className="fa-solid fa-times" /> Clear Filters</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="responses-table-card">
        <h3 className="card-title"><i className="fa-solid fa-table" /> Alumni Responses</h3>
        <div className="table-container">
          <table className="responses-table">
            <thead>
              <tr>
                <th>Full Name</th><th>Student No.</th><th>Birth Date</th><th>Batch</th><th>Program</th><th>Status</th>
                <th>Work Type</th><th>Timeline</th><th>Submitted</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="no-data">
                    <i className="fa-solid fa-inbox" />
                    <p>No responses found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.full_name}</td>
                    <td>{r.student_number || "N/A"}</td>
                    <td>{r.birth_date ? new Date(r.birth_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}</td>
                    <td>{r.batch}</td>
                    <td>{r.program}</td>
                    <td>
                      <span className={cx("status-badge", r.employment_status.toLowerCase().replace(/\s+/g, "-"))}>
                        {r.employment_status}
                      </span>
                    </td>
                    <td>{r.work_type || "N/A"}</td>
                    <td>{r.employment_timeline || "N/A"}</td>
                    <td>{new Date(r.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                    <td>
                      <button className="delete-btn" onClick={() => remove(r.id)}><i className="fa-solid fa-trash" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
