import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import Chart from "chart.js/auto";

import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/data-uploads.css";

type Row = Record<string, unknown>;
type ChartKind = "bar" | "line" | "pie";

const MAROON_PALETTE = [
  "rgba(139, 0, 0, 0.7)",
  "rgba(178, 34, 34, 0.7)",
  "rgba(220, 20, 60, 0.7)",
  "rgba(205, 92, 92, 0.7)",
  "rgba(240, 128, 128, 0.7)",
  "rgba(233, 150, 122, 0.7)",
];

/** Pick the first column that is mostly numeric (skipping the label column). */
function findValueColumn(rows: Row[], headers: string[]): string | null {
  for (let i = 1; i < headers.length; i++) {
    const h = headers[i];
    let numeric = 0;
    for (const row of rows) {
      const v = row[h];
      if (v !== "" && v !== null && !isNaN(parseFloat(String(v)))) numeric++;
    }
    if (numeric > rows.length * 0.3) return h;
  }
  return null;
}

export function DataUploadsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [info, setInfo] = useState<{ text: string; error?: boolean } | null>(null);
  const [chartType, setChartType] = useState<ChartKind>("bar");
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const selectedFile = useRef<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  // (Re)draw the chart whenever the data or chart type changes.
  useEffect(() => {
    if (!canvasRef.current || rows.length === 0 || headers.length === 0) return;

    const valueCol = findValueColumn(rows, headers);
    if (!valueCol) return;
    const labelCol = headers[0];

    const labels = rows.map((r) => String(r[labelCol] ?? ""));
    const values = rows.map((r) => {
      const n = parseFloat(String(r[valueCol]));
      return isNaN(n) ? 0 : n;
    });

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: valueCol,
            data: values,
            borderWidth: 2,
            tension: 0.4,
            fill: chartType === "line",
            backgroundColor:
              chartType === "line"
                ? "rgba(139, 0, 0, 0.2)"
                : MAROON_PALETTE.slice(0, Math.max(values.length, 1)),
            borderColor:
              chartType === "line" ? "#8b0000" : MAROON_PALETTE.slice(0, Math.max(values.length, 1)),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: displayName || valueCol },
        },
        scales: chartType === "pie" ? {} : { y: { beginAtZero: true } },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [rows, headers, chartType, displayName]);

  const loadRows = (data: Row[]) => {
    if (!data.length) {
      setInfo({ text: "No data found in the file.", error: true });
      return;
    }
    setRows(data);
    setHeaders(Object.keys(data[0]));
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    selectedFile.current = file;
    setUploaded(false);
    setRows([]);
    setHeaders([]);
    setDisplayName(file.name.replace(/\.(csv|xlsx|xls|json)$/i, ""));
    setFileName(file.name);
    setInfo({ text: `${file.name} (${(file.size / 1024).toFixed(1)} KB) — ready to upload` });

    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".csv")) {
        Papa.parse<Row>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => loadRows(res.data),
          error: (err) => setInfo({ text: `Error reading CSV: ${err.message}`, error: true }),
        });
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          loadRows(XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false }));
        };
        reader.readAsArrayBuffer(file);
      } else if (lower.endsWith(".json")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const parsed = JSON.parse(e.target!.result as string);
          loadRows(Array.isArray(parsed) ? parsed : [parsed]);
        };
        reader.readAsText(file);
      } else {
        setInfo({ text: "Unsupported format. Use CSV, Excel, or JSON.", error: true });
      }
    } catch (err) {
      setInfo({ text: `Error parsing file: ${(err as Error).message}`, error: true });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile.current) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile.current);
      fd.append("adminid", localStorage.getItem("adminid") || "1");
      fd.append("folder_id", "");
      const res = await api.post<{ success: boolean; message?: string }>("/api/files/upload", fd);
      if (!res.success) throw new Error(res.message || "Upload failed");
      setUploaded(true);
      setInfo({ text: `${fileName} uploaded successfully!` });
    } catch (err) {
      setInfo({
        text: `Upload failed: ${err instanceof ApiError ? err.message : (err as Error).message}`,
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const previewRows = rows.slice(0, 50);

  return (
    <div className="du-page">
      <div className="upload-header">
        <h2>
          <i className="fa fa-cloud-upload-alt" /> Upload Your Data
        </h2>
        <p>Select a CSV, Excel, or JSON file to preview, then upload to the repository.</p>
      </div>

      <div className="upload-section">
        <div className="upload-box">
          <input
            type="file"
            id="dataFileInput"
            accept=".csv,.xlsx,.xls,.json"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <label htmlFor="dataFileInput" className="upload-label">
            <i className="fa-solid fa-file-arrow-up" />
            <span>Choose a File</span>
            <small>CSV, Excel, or JSON</small>
          </label>
        </div>

        {info && (
          <div className={cx("file-info", info.error && "error")}>
            <i
              className={cx(
                "fa",
                uploaded ? "fa-check-circle" : info.error ? "fa-exclamation-circle" : "fa-file",
              )}
            />{" "}
            {info.text}
          </div>
        )}

        <button
          className="upload-btn"
          disabled={rows.length === 0 || busy || uploaded}
          onClick={handleUpload}
        >
          <i className={cx("fa", busy ? "fa-spinner fa-spin" : "fa-upload")} />{" "}
          {busy ? "Uploading..." : uploaded ? "Uploaded" : "Upload File"}
        </button>
      </div>

      <div className="preview-section">
        <h3>
          <i className="fa fa-table" /> Data Preview
        </h3>
        <div className="table-preview">
          {rows.length === 0 ? (
            <p className="placeholder-msg">
              <i className="fa fa-inbox" /> No file selected yet. Choose a file to see preview.
            </p>
          ) : (
            <>
              <table className="preview-table">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h}>{h.startsWith("__EMPTY") ? "" : h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h}>{String(row[h] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <div className="row-info">
                  Showing 50 of {rows.length} rows (preview limited to first 50).
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="visualization-section">
        <h3>
          <i className="fa fa-eye" /> Visualization Preview
        </h3>
        <div className="visualization-controls">
          <div className="control-group">
            <label htmlFor="chartTypeSelect">Chart Type:</label>
            <select
              id="chartTypeSelect"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartKind)}
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="placeholder-msg">
            <i className="fa fa-chart-pie" /> No visualization yet. Add a file to generate a preview.
          </p>
        ) : (
          <div className="chart-wrap">
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>
    </div>
  );
}
