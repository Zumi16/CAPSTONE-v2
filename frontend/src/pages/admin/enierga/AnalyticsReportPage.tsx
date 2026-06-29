import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/analytics-report.css";

const PY = "http://localhost:5000/api";

type Stats = {
  count: number;
  mean: number;
  median: number;
  mode: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  variance: number;
  range: number;
  sum: number;
  skewness?: number;
  kurtosis?: number;
};
type ColumnInfo = { raw_name: string; display_name: string; data_count: number };
type FileInfo = {
  total_rows: number;
  total_columns: number;
  analyzed_column: string;
  available_columns?: ColumnInfo[];
};
type TableData = { headers: string[]; rows: (string | number)[][] };
type AnalyticsResp = {
  chart_image: string;
  statistics: Stats;
  table_data: TableData;
  file_info: FileInfo;
  summary?: { outliers_detected?: number };
};
type SourceFile = {
  id: number;
  filename?: string;
  file_name?: string;
  displayName?: string;
  display_name?: string;
  type?: string;
  uploaded_at: string;
  trashed_at?: string;
  chart_type?: string;
};
type Report = {
  id: number;
  file_id: number;
  title: string;
  actualFilename: string;
  metric: string;
  date: string;
  uploadedAt: number;
  recordsProcessed: number;
  chartType: string;
  chartImage?: string;
  statistics?: Stats;
  interpretation?: string | null;
  hasInterpretation: boolean;
  currentColumn: string;
  availableColumns: ColumnInfo[];
  tableData?: TableData;
  fileInfo?: FileInfo;
  fileExtension: string;
  isTrashed: boolean;
  error?: string;
};

async function processFile(body: Record<string, unknown>): Promise<AnalyticsResp> {
  const r = await fetch(`${PY}/analytics/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function extractDisplayName(filename?: string): string {
  if (!filename) return "Unknown File";
  if (filename.includes("-")) {
    const parts = filename.split("-");
    if (/^\d+$/.test(parts[0])) return parts.slice(1).join("-");
  }
  return filename;
}

export function AnalyticsReportPage() {
  const [view, setView] = useState<"active" | "trash">("active");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [modal, setModal] = useState<Report | null>(null);

  const patch = (id: number, changes: Partial<Report>) =>
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        view === "trash"
          ? (await api.get<{ files: SourceFile[] }>("/api/trash")).files
          : await api.get<SourceFile[]>("/api/files/data");

      const out: Report[] = [];
      for (let i = 0; i < data.length; i++) {
        const file = data[i];
        const stored = file.filename || file.file_name;
        const display =
          file.displayName || file.display_name || extractDisplayName(stored);
        const chartType =
          localStorage.getItem(`chartType_${file.id}`) || file.chart_type || "bar";

        let interpretation: string | null = null;
        if (view === "active") {
          try {
            const it = await api.get<{ interpretation: string }>(
              `/api/files/interpretation/${file.id}`,
            );
            interpretation = it.interpretation ?? null;
          } catch {
            /* none saved */
          }
        }

        try {
          const a = await processFile({
            filename: stored,
            chart_type: chartType,
            generate_interpretation: false,
          });
          out.push({
            id: file.id,
            file_id: file.id,
            title: display,
            actualFilename: stored || display,
            metric: file.type || "Uploaded Dataset",
            date: new Date(file.uploaded_at).toLocaleDateString(),
            uploadedAt: new Date(file.uploaded_at).getTime(),
            recordsProcessed: a.statistics.count,
            chartType,
            chartImage: a.chart_image,
            statistics: a.statistics,
            interpretation,
            hasInterpretation: !!interpretation,
            currentColumn: a.file_info?.analyzed_column || "Default Column",
            availableColumns: a.file_info?.available_columns || [],
            tableData: a.table_data,
            fileInfo: a.file_info,
            fileExtension: display.split(".").pop()?.toUpperCase() || "",
            isTrashed: view === "trash",
          });
        } catch (err) {
          out.push({
            id: file.id,
            file_id: file.id,
            title: display,
            actualFilename: stored || display,
            metric: "Error Processing",
            date: new Date(file.uploaded_at).toLocaleDateString(),
            uploadedAt: new Date(file.uploaded_at).getTime(),
            recordsProcessed: 0,
            chartType,
            hasInterpretation: false,
            currentColumn: "",
            availableColumns: [],
            fileExtension: display.split(".").pop()?.toUpperCase() || "",
            isTrashed: view === "trash",
            error: (err as Error).message,
          });
        }
      }
      setReports(out);
    } catch (err) {
      console.error("Error loading reports:", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  // --- per-card actions ---------------------------------------------------

  const changeChartType = async (report: Report, type: string) => {
    try {
      const a = await processFile({
        filename: report.actualFilename,
        chart_type: type,
        generate_interpretation: false,
      });
      localStorage.setItem(`chartType_${report.file_id}`, type);
      patch(report.id, { chartType: type, chartImage: a.chart_image, statistics: a.statistics });
    } catch {
      window.alert("Failed to regenerate chart.");
    }
  };

  const changeColumn = async (report: Report, column: string) => {
    try {
      const a = await processFile({
        filename: report.actualFilename,
        chart_type: report.chartType,
        column,
        generate_interpretation: false,
      });
      patch(report.id, {
        chartImage: a.chart_image,
        statistics: a.statistics,
        tableData: a.table_data,
        currentColumn: a.file_info.analyzed_column,
        interpretation: null,
        hasInterpretation: false,
      });
    } catch {
      window.alert("Failed to load data for selected column.");
    }
  };

  const generateInterpretation = async (report: Report) => {
    try {
      const r = await fetch(`${PY}/analytics/generate-interpretation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: report.actualFilename,
          file_id: report.file_id,
          chart_type: report.chartType,
        }),
      });
      if (!r.ok) throw new Error();
      const result = await r.json();
      patch(report.id, { interpretation: result.interpretation, hasInterpretation: true });
      window.alert("AI interpretation generated successfully!");
    } catch {
      window.alert("Failed to generate AI interpretation.");
    }
  };

  const trashActions = {
    move: async (r: Report) => {
      try {
        await api.post(`/api/trash/move/${r.file_id}`);
        load();
      } catch {
        window.alert("Failed to move to trash.");
      }
    },
    restore: async (r: Report) => {
      try {
        await api.post(`/api/trash/restore/${r.file_id}`);
        load();
      } catch {
        window.alert("Failed to restore.");
      }
    },
    remove: async (r: Report) => {
      if (!window.confirm(`Permanently delete "${r.title}"? This cannot be undone!`)) return;
      try {
        await api.delete(`/api/trash/permanent/${r.file_id}`);
        load();
      } catch {
        window.alert("Failed to delete permanently.");
      }
    },
    empty: async () => {
      if (!window.confirm(`Permanently delete all ${reports.length} report(s) in trash?`)) return;
      try {
        await api.delete("/api/trash/empty");
        load();
      } catch {
        window.alert("Failed to empty trash.");
      }
    },
  };

  const exportReportCsv = (report: Report) => {
    if (!report.statistics || !report.tableData) return;
    const s = report.statistics;
    let csv = `Report: ${report.title}\nDate: ${report.date}\nColumn: ${report.currentColumn}\n\nMetric,Value\n`;
    csv += `Mean,${s.mean}\nMedian,${s.median}\nStd Dev,${s.std}\nMin,${s.min}\nMax,${s.max}\n\n`;
    csv += report.tableData.headers.join(",") + "\n";
    report.tableData.rows.forEach((row) => (csv += row.join(",") + "\n"));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.replace(/[^a-z0-9]/gi, "_")}_report.csv`;
    link.click();
  };

  const exportAll = () => {
    if (view === "trash") return window.alert("Cannot export from trash.");
    const valid = reports.filter((r) => !r.error && r.statistics);
    if (valid.length === 0) return window.alert("No reports available to export.");
    let csv =
      "Report Title,File Type,Date,Records,Column,Mean,Median,Std Dev,Min,Max\n";
    valid.forEach((r) => {
      const s = r.statistics!;
      csv += `"${r.title}",${r.fileExtension},${r.date},${r.recordsProcessed},"${r.currentColumn}",${s.mean},${s.median},${s.std},${s.min},${s.max}\n`;
    });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics_reports_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // --- derived ------------------------------------------------------------

  const filtered = reports.filter((r) => {
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.currentColumn.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "All Types" || r.fileExtension === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalRecords = reports.reduce((sum, r) => sum + (r.recordsProcessed || 0), 0);
  const mostRecent = [...reports].sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
  const avgRecords = reports.length ? Math.round(totalRecords / reports.length) : 0;

  const CARDS = [
    {
      label: view === "trash" ? "Reports in Trash" : "Total Reports",
      value: reports.length,
      icon: "bi bi-file-earmark-text",
      color: "bg-blue",
    },
    {
      label: view === "trash" ? "Records in Trash" : "Total Records Tracked",
      value: totalRecords.toLocaleString(),
      icon: "bi bi-people",
      color: "bg-green",
    },
    {
      label: view === "trash" ? "Recently Deleted" : "Most Recent Report",
      value: mostRecent ? (mostRecent.title.length > 20 ? mostRecent.title.slice(0, 20) + "…" : mostRecent.title) : "—",
      icon: "bi bi-clock-history",
      color: "bg-purple",
    },
    {
      label: view === "trash" ? "Items in Trash" : "Avg Records per Report",
      value: avgRecords.toLocaleString(),
      icon: "bi bi-mortarboard",
      color: "bg-orange",
    },
  ];

  return (
    <div className="ar-page">
      <section className="summary-cards">
        {CARDS.map((c) => (
          <div className="summary-card" key={c.label}>
            <div className="summary-card-content">
              <div>
                <p className="summary-label">{c.label}</p>
                <p className="summary-value">{c.value}</p>
              </div>
              <div className={cx("summary-icon", c.color)}>
                <i className={c.icon} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="reports-section">
        <div className="reports-header">
          <div className="view-toggle">
            <button
              className={cx("view-toggle-btn", view === "active" && "active")}
              onClick={() => setView("active")}
            >
              <i className="bi bi-file-earmark-text" /> Active Reports
            </button>
            <button
              className={cx("view-toggle-btn", view === "trash" && "active")}
              onClick={() => setView("trash")}
            >
              <i className="bi bi-trash" /> Trash
            </button>
          </div>

          <div className="search-filter">
            <input
              className="search-input"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option>All Types</option>
              <option>CSV</option>
              <option>XLSX</option>
              <option>JSON</option>
            </select>
          </div>

          <button className="export-btn" onClick={exportAll}>
            <i className="bi bi-download" /> Export All
          </button>
        </div>

        {view === "trash" && filtered.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button className="empty-trash-btn" onClick={trashActions.empty}>
              <i className="bi bi-trash3" /> Empty Trash ({filtered.length})
            </button>
          </div>
        )}

        {loading ? (
          <p className="empty-msg">Loading analytics…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-msg">
            {view === "trash"
              ? "No reports in trash."
              : "No analytics available. Upload a file (and start the Python API on port 5000) to generate reports."}
          </p>
        ) : (
          <div className="reports-grid">
            {filtered.map((report) => (
              <div className="report-card" key={report.id}>
                {report.error ? (
                  <div className="report-header">
                    <h3>{report.title}</h3>
                    <p className="error-text">Error: {report.error}</p>
                  </div>
                ) : (
                  <>
                    <div className="report-header">
                      <h3>{report.title}</h3>
                      <p>{report.metric}</p>
                      <p>
                        <strong>Analyzing:</strong> {report.currentColumn}
                      </p>
                      {!report.isTrashed && (
                        <span
                          className={cx("interpretation-badge", !report.hasInterpretation && "empty")}
                        >
                          <i className={report.hasInterpretation ? "bi bi-check-circle-fill" : "bi bi-robot"} />{" "}
                          {report.hasInterpretation ? "AI Analysis Ready" : "No AI Analysis Yet"}
                        </span>
                      )}
                    </div>

                    {!report.isTrashed && report.availableColumns.length > 1 && (
                      <div className="column-selector">
                        <label>Column:</label>
                        <select
                          className="column-select-dropdown"
                          value={report.availableColumns.find((c) => c.display_name === report.currentColumn)?.raw_name}
                          onChange={(e) => changeColumn(report, e.target.value)}
                        >
                          {report.availableColumns.map((col) => (
                            <option value={col.raw_name} key={col.raw_name}>
                              {col.display_name} ({col.data_count} values)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!report.isTrashed && (
                      <div className="chart-selector">
                        <label>Chart Type:</label>
                        <select
                          className="chart-type-select"
                          value={report.chartType}
                          onChange={(e) => changeChartType(report, e.target.value)}
                        >
                          <option value="bar">Bar Chart</option>
                          <option value="line">Line Chart</option>
                          <option value="pie">Pie Chart</option>
                          <option value="histogram">Histogram</option>
                          <option value="box">Box Plot</option>
                        </select>
                      </div>
                    )}

                    <div className="chart-container">
                      {report.chartImage && (
                        <img src={report.chartImage} alt="Chart" className="chart-preview-img" />
                      )}
                    </div>

                    {report.statistics && (
                      <div className="quick-stats">
                        {(
                          [
                            ["Mean", report.statistics.mean],
                            ["Median", report.statistics.median],
                            ["Std Dev", report.statistics.std],
                          ] as const
                        ).map(([label, val]) => (
                          <div className="stat-mini" key={label}>
                            <span className="stat-label">{label}</span>
                            <span className="stat-value">{val.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="report-actions">
                      {report.isTrashed ? (
                        <>
                          <button className="restore-btn" onClick={() => trashActions.restore(report)}>
                            <i className="bi bi-arrow-counterclockwise" /> Restore
                          </button>
                          <button className="delete-permanent-btn" onClick={() => trashActions.remove(report)}>
                            <i className="bi bi-trash3" /> Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="view-btn" onClick={() => setModal(report)}>
                            <i className="bi bi-eye" /> View Report
                          </button>
                          <button
                            className="generate-interpretation-btn"
                            onClick={() => generateInterpretation(report)}
                          >
                            <i className="bi bi-robot" />{" "}
                            {report.hasInterpretation ? "Regenerate AI" : "Generate AI"}
                          </button>
                          <button className="trash-btn" onClick={() => trashActions.move(report)}>
                            <i className="bi bi-trash" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {modal && modal.statistics && modal.tableData && (
        <div className="ar-modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal.title}</h2>
              <button className="close-modal" onClick={() => setModal(null)}>
                &times;
              </button>
            </div>

            <div className="report-details">
              <p>
                <strong>Currently Analyzing:</strong> {modal.currentColumn}
              </p>

              {modal.chartImage && (
                <div className="chart-full">
                  <img src={modal.chartImage} alt="Full Chart" />
                </div>
              )}

              <div className="stats-section">
                {(
                  [
                    ["blue", "Mean", modal.statistics.mean],
                    ["green", "Median", modal.statistics.median],
                    ["purple", "Mode", modal.statistics.mode],
                    ["orange", "Std Dev", modal.statistics.std],
                    ["red", "Min", modal.statistics.min],
                    ["teal", "Max", modal.statistics.max],
                    ["yellow", "Q1", modal.statistics.q1],
                    ["pink", "Q3", modal.statistics.q3],
                  ] as const
                ).map(([color, label, val]) => (
                  <div className={cx("stat-card", color)} key={label}>
                    <strong>{label}</strong>
                    <p>{val.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="insight">
                <strong>🔍 Analysis Summary</strong>
                <div className="interpretation-text">
                  {modal.interpretation ||
                    'No AI interpretation available yet. Click "Generate AI" to create one.'}
                </div>
              </div>

              <div className="data-table-container">
                <strong>📋 Data Table</strong>
                <table className="data-table">
                  <thead>
                    <tr>
                      {modal.tableData.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modal.tableData.rows.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{typeof cell === "number" ? cell.toFixed(2) : cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="export-options">
                <button className="export-csv-btn" onClick={() => exportReportCsv(modal)}>
                  <i className="bi bi-file-spreadsheet" /> Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
