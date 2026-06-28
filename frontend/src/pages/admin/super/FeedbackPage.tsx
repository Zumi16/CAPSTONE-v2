import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/admin/feedback-dashboard.css";

/**
 * Shared Service Feedback dashboard (superAdmin + secondarySuperAdmin). Loads
 * the director analytics, then per-department feedback, and derives summary
 * cards, department performance, rating distribution, service-criteria scores,
 * a monthly trend, recent feedback, and critical alerts (rating ≤ 2). Supports
 * student & visitor submissions, filtering, a detail modal, an all-feedback
 * modal, CSV export, and light polling for new submissions.
 *
 * Endpoints: GET /api/feedback/director/analytics[?user_type=],
 * /api/feedback/department/:id[?user_type=], /api/feedback/director/trends?months=6
 */

const DEPARTMENTS = [
  { id: 1, name: "Registrar" },
  { id: 2, name: "Cashier" },
  { id: 3, name: "Library" },
  { id: 4, name: "Student Affairs" },
  { id: 5, name: "Clinic" },
  { id: 6, name: "Admission Office" },
];

type Feedback = {
  feedback_id: number;
  transaction_id?: string;
  user_identifier?: string;
  student_identifier?: string;
  visitor_name?: string;
  visitor_email?: string;
  visitor_phone?: string;
  service_type?: string;
  visit_date?: string;
  department_name: string;
  department_id: number;
  user_type?: "student" | "visitor";
  overall_rating: number;
  processing_time: number;
  staff_assistance: number;
  clarity: number;
  facility: number;
  comments?: string;
  created_at: string;
};
type Analytics = { department_id: number; department_name: string; total_feedback?: number };
type Trend = { month: string; avg_rating: number | string; feedback_count: number };
type Toast = { msg: string; type: "success" | "error" | "warning" | "info" };

const stars = (r: number) => "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals: [string, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, sec] of intervals) { const i = Math.floor(s / sec); if (i >= 1) return `${i} ${u}${i > 1 ? "s" : ""} ago`; }
  return "just now";
}
function formatMonth(m: string): string {
  const [year, month] = m.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
const identifierOf = (f: Feedback) => (f.user_type === "student" ? f.user_identifier || f.student_identifier : f.visitor_name || f.user_identifier) || "Anonymous";

export function FeedbackPage() {
  const [all, setAll] = useState<Feedback[]>([]);
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const [department, setDepartment] = useState("");
  const [rating, setRating] = useState("");
  const [userType, setUserType] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedRange, setAppliedRange] = useState({ start: "", end: "" });

  const [detail, setDetail] = useState<Feedback | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalDept, setModalDept] = useState("");
  const [modalRating, setModalRating] = useState("");

  const prevCount = useRef(0);
  const firstLoad = useRef(true);

  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchAll = useCallback(async (ut: string) => {
    try {
      const q = ut ? `?user_type=${ut}` : "";
      const analytics = await api.get<{ analytics?: Analytics[] }>(`/api/feedback/director/analytics${q}`);
      const depts = (analytics.analytics ?? []).filter((d) => (d.total_feedback ?? 0) > 0);
      const lists = await Promise.all(
        depts.map((d) =>
          api.get<{ feedback?: Feedback[] }>(`/api/feedback/department/${d.department_id}${q}`)
            .then((r) => (r.feedback ?? []).map((f) => ({ ...f, department_name: d.department_name, department_id: d.department_id })))
            .catch(() => [] as Feedback[]),
        ),
      );
      const merged = lists.flat();
      if (!firstLoad.current && merged.length > prevCount.current) {
        const n = merged.length - prevCount.current;
        showToast(`🎉 ${n} new feedback submission${n > 1 ? "s" : ""} received!`, "success");
      }
      prevCount.current = merged.length;
      setAll(merged);
    } catch {
      if (firstLoad.current) setAll([]);
    } finally {
      firstLoad.current = false;
    }
  }, [showToast]);

  useEffect(() => {
    (async () => {
      await fetchAll(userType);
      api.get<{ trends?: Trend[] }>("/api/feedback/director/trends?months=6").then((d) => setTrends(d.trends ?? [])).catch(() => setTrends([]));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType]);

  // Light polling for new feedback.
  useEffect(() => {
    const id = setInterval(() => fetchAll(userType), 30000);
    return () => clearInterval(id);
  }, [fetchAll, userType]);

  const filtered = useMemo(() => {
    return all.filter((f) => {
      if (department && f.department_name !== department) return false;
      if (rating && f.overall_rating !== parseInt(rating)) return false;
      if (userType && f.user_type !== userType) return false;
      if (timeRange) {
        const d = new Date(f.created_at);
        const now = new Date();
        if (timeRange === "today" && d.toDateString() !== now.toDateString()) return false;
        if (timeRange === "week" && d < new Date(now.getTime() - 7 * 86400000)) return false;
        if (timeRange === "month" && d < new Date(now.getTime() - 30 * 86400000)) return false;
        if (timeRange === "custom") {
          if (appliedRange.start && d < new Date(appliedRange.start)) return false;
          if (appliedRange.end && d > new Date(appliedRange.end)) return false;
        }
      }
      return true;
    });
  }, [all, department, rating, userType, timeRange, appliedRange]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const avg = total ? (filtered.reduce((s, f) => s + f.overall_rating, 0) / total).toFixed(1) : "0.0";
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = filtered.filter((f) => new Date(f.created_at) >= sevenDaysAgo).length;
    const critical = filtered.filter((f) => f.overall_rating <= 2).length;
    return { total, avg, recent, critical };
  }, [filtered]);

  const deptStats = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const fb = filtered.filter((f) => f.department_name === dept.name || f.department_id === dept.id);
      if (fb.length === 0) return null;
      return {
        name: dept.name,
        avgRating: (fb.reduce((s, f) => s + f.overall_rating, 0) / fb.length).toFixed(1),
        total: fb.length,
        critical: fb.filter((f) => f.overall_rating <= 2).length,
      };
    }).filter(Boolean).sort((a, b) => parseFloat(b!.avgRating) - parseFloat(a!.avgRating)) as { name: string; avgRating: string; total: number; critical: number }[];
  }, [filtered]);

  const ratingDist = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filtered.forEach((f) => { if (counts[f.overall_rating] !== undefined) counts[f.overall_rating]++; });
    const total = filtered.length || 1;
    return [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: counts[r], pct: Math.round((counts[r] / total) * 100) }));
  }, [filtered]);

  const criteria = useMemo(() => {
    const defs = [
      { key: "processing_time", name: "Processing Time", icon: "fa-clock" },
      { key: "staff_assistance", name: "Staff Assistance", icon: "fa-user-tie" },
      { key: "clarity", name: "Clarity of Instructions", icon: "fa-clipboard-list" },
      { key: "facility", name: "Facility Condition", icon: "fa-door-open" },
    ] as const;
    if (filtered.length === 0) return [];
    return defs.map((c) => {
      const avg = filtered.reduce((s, f) => s + (f[c.key] || 0), 0) / filtered.length;
      return { name: c.name, icon: c.icon, score: avg.toFixed(1), pct: Math.round((avg / 5) * 100) };
    });
  }, [filtered]);

  const recent = useMemo(() => [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5), [filtered]);
  const critical = useMemo(() => filtered.filter((f) => f.overall_rating <= 2).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5), [filtered]);

  const allModalList = useMemo(() => {
    const q = modalSearch.toLowerCase();
    return [...filtered]
      .filter((f) => {
        const matchesSearch = !q || (f.comments?.toLowerCase().includes(q) ?? false) || f.department_name.toLowerCase().includes(q) || identifierOf(f).toLowerCase().includes(q);
        return matchesSearch && (!modalDept || f.department_name === modalDept) && (!modalRating || f.overall_rating === parseInt(modalRating));
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [filtered, modalSearch, modalDept, modalRating]);

  function clearFilters() {
    setDepartment(""); setRating(""); setUserType(""); setTimeRange(""); setStartDate(""); setEndDate(""); setAppliedRange({ start: "", end: "" });
    showToast("Filters cleared", "info");
  }
  async function refresh() {
    await fetchAll(userType);
    showToast("Dashboard refreshed successfully", "success");
  }
  function exportCSV() {
    const rows = [
      ["Transaction ID", "Department", "User", "User Type", "Overall Rating", "Processing Time", "Staff Assistance", "Clarity", "Facility", "Comments", "Date"].join(","),
      ...filtered.map((f) => [f.transaction_id || "", f.department_name, identifierOf(f), f.user_type || "", f.overall_rating, f.processing_time, f.staff_assistance, f.clarity, f.facility, `"${(f.comments || "").replace(/"/g, '""')}"`, new Date(f.created_at).toLocaleDateString()].join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `feedback_export_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported successfully", "success");
  }

  const SUMMARY = [
    { grad: "gradient-blue", icon: "fa-comments", value: summary.total, label: "Total Feedback", sub: "All submissions" },
    { grad: "gradient-green", icon: "fa-star", value: summary.avg, label: "Average Rating", sub: "Overall satisfaction" },
    { grad: "gradient-orange", icon: "fa-clock", value: summary.recent, label: "Recent Feedback", sub: "Last 7 days" },
    { grad: "gradient-red", icon: "fa-exclamation-triangle", value: summary.critical, label: "Critical Alerts", sub: "Rating ≤ 2" },
  ];

  return (
    <div className="feedback-page">
      <div className="fb-header">
        <h2>Service Feedback</h2>
        <button className="refresh-btn" title="Refresh Dashboard" onClick={refresh}><i className="fas fa-sync-alt" /></button>
      </div>

      <section className="summary-section">
        <div className="summary-grid">
          {SUMMARY.map((s) => (
            <div className={cx("summary-card", s.grad)} key={s.label}>
              <div className="summary-icon"><i className={cx("fas", s.icon)} /></div>
              <div className="summary-content"><h3>{s.value}</h3><p>{s.label}</p><small className="summary-subtext">{s.sub}</small></div>
            </div>
          ))}
        </div>
      </section>

      <section className="controls-section">
        <div className="controls-container">
          <div className="filter-group">
            <select className="filter-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <select className="filter-select" value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="">All Ratings</option>
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? "s" : ""}</option>)}
            </select>
            <select className="filter-select" value={userType} onChange={(e) => setUserType(e.target.value)}>
              <option value="">All Users</option>
              <option value="student">Students</option>
              <option value="visitor">Visitors</option>
            </select>
            <select className="filter-select" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
            <button className="btn-clear" onClick={clearFilters}><i className="fas fa-times" /> Clear Filters</button>
          </div>
          <div className="action-group">
            <button className="btn-export" onClick={exportCSV}><i className="fas fa-file-csv" /> Export CSV</button>
            <button className="btn-export" onClick={() => showToast("PDF export feature coming soon", "info")}><i className="fas fa-file-pdf" /> Export PDF</button>
          </div>
        </div>
        {timeRange === "custom" && (
          <div className="date-range-container" style={{ display: "flex" }}>
            <input type="date" className="date-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span>to</span>
            <input type="date" className="date-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button className="btn-apply" onClick={() => setAppliedRange({ start: startDate, end: endDate })}>Apply</button>
          </div>
        )}
      </section>

      {loading ? (
        <div className="loading-state"><i className="fas fa-spinner" /><p>Loading feedback dashboard...</p></div>
      ) : (
        <div className="content-grid">
          <div className="left-column">
            <Card title="Department Performance" icon="fa-building">
              {deptStats.length === 0 ? <Empty text="No department data available" /> : (
                <div className="department-list">
                  {deptStats.map((d) => (
                    <div className="department-item" key={d.name} onClick={() => { setDepartment(d.name); showToast(`Filtered by ${d.name}`, "info"); }}>
                      <div className="dept-header"><span className="dept-name">{d.name}</span><span className="dept-rating"><i className="fas fa-star" /> {d.avgRating}</span></div>
                      <div className="dept-stats">
                        <span><i className="fas fa-comment" /> {d.total} feedback</span>
                        {d.critical > 0 && <span style={{ color: "#f56565" }}><i className="fas fa-exclamation-triangle" /> {d.critical} critical</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Rating Distribution" icon="fa-chart-bar">
              <div className="rating-bars">
                {ratingDist.map((r) => (
                  <div className="rating-bar-item" key={r.rating}>
                    <div className="rating-label"><span className="stars">{"★".repeat(r.rating)}</span></div>
                    <div className="rating-bar-container">
                      <div className={cx("rating-bar-fill", `star-${r.rating}`)} style={{ width: `${r.pct}%` }}>{r.count > 0 ? `${r.count} (${r.pct}%)` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Service Criteria Scores" icon="fa-sliders-h">
              {criteria.length === 0 ? <Empty text="No criteria data available" /> : (
                <div className="criteria-chart">
                  {criteria.map((c) => (
                    <div className="criteria-item" key={c.name}>
                      <div className="criteria-header"><span className="criteria-name"><i className={cx("fas", c.icon)} /> {c.name}</span><span className="criteria-score">{c.score}/5</span></div>
                      <div className="criteria-bar"><div className="criteria-fill" style={{ width: `${c.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="right-column">
            <Card title="Monthly Satisfaction Trends" icon="fa-chart-line">
              {trends === null ? (
                <div className="trend-placeholder"><i className="fas fa-spinner fa-spin" /><p>Loading trends...</p></div>
              ) : trends.length === 0 ? (
                <div className="trend-placeholder"><i className="fas fa-chart-line" /><p>No trend data available yet</p></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h4 style={{ margin: "0 0 10px", color: "#2d3748" }}>Last 6 Months Performance</h4>
                  {trends.map((t) => (
                    <div key={t.month} style={{ display: "flex", padding: 10, background: "#f7fafc", gap: 10, borderRadius: 6 }}>
                      <span style={{ fontWeight: 600, color: "#4a5568" }}>{formatMonth(t.month)}</span>
                      <span style={{ color: "#667eea", fontWeight: 700 }}>{t.avg_rating} ★ ({t.feedback_count} feedback)</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Recent Feedback" icon="fa-comment-dots" action={<button className="btn-view-all" onClick={() => setShowAll(true)}>View All</button>}>
              {recent.length === 0 ? <Empty icon="fa-inbox" text="No recent feedback" /> : (
                <div className="feedback-list">{recent.map((f) => <FeedbackItem key={f.feedback_id} f={f} onClick={() => setDetail(f)} />)}</div>
              )}
            </Card>

            <div className="card alert-card">
              <div className="card-header"><h3><i className="fas fa-exclamation-circle" /> Critical Alerts</h3></div>
              <div className="card-body">
                {critical.length === 0 ? (
                  <div className="empty-state" style={{ color: "#48bb78" }}><i className="fas fa-check-circle" /><h4>All Good!</h4><p>No critical alerts at this time</p></div>
                ) : (
                  <div className="alerts-list">
                    {critical.map((f) => (
                      <div className="alert-item" key={f.feedback_id} onClick={() => setDetail(f)}>
                        <div className="alert-header"><span className="alert-dept">{f.department_name}</span><span className="alert-rating">{stars(f.overall_rating)}</span></div>
                        <p className="alert-message">{f.comments || "No comments provided"}</p>
                        <span className="alert-date">{timeAgo(new Date(f.created_at))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback details modal */}
      {detail && <FeedbackDetailModal f={detail} onClose={() => setDetail(null)} />}

      {/* All feedback modal */}
      {showAll && (
        <div className="modal active">
          <div className="modal-overlay" onClick={() => setShowAll(false)} />
          <div className="modal-container large">
            <div className="modal-header"><h3><i className="fas fa-list" /> All Feedback</h3><button className="modal-close" onClick={() => setShowAll(false)}>×</button></div>
            <div className="modal-body">
              <div className="modal-filters">
                <input type="text" className="modal-search" placeholder="Search feedback..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} />
                <select className="modal-filter-select" value={modalDept} onChange={(e) => setModalDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <select className="modal-filter-select" value={modalRating} onChange={(e) => setModalRating(e.target.value)}>
                  <option value="">All Ratings</option>
                  {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
                </select>
              </div>
              <div className="all-feedback-container">
                {allModalList.length === 0 ? <Empty icon="fa-inbox" text="No feedback available" /> : (
                  <div className="feedback-list" style={{ maxHeight: "none" }}>{allModalList.map((f) => <FeedbackItem key={f.feedback_id} f={f} onClick={() => setDetail(f)} />)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={cx("toast", toast.type, "show")}>
            <div className="toast-icon"><i className={cx("fas", toast.type === "success" ? "fa-check-circle" : toast.type === "error" ? "fa-exclamation-circle" : toast.type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle")} /></div>
            <div className="toast-content"><div className="toast-message">{toast.msg}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, icon, action, children }: { title: string; icon: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-header"><h3><i className={cx("fas", icon)} /> {title}</h3>{action}</div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function Empty({ icon = "fa-inbox", text }: { icon?: string; text: string }) {
  return <div className="empty-state"><i className={cx("fas", icon)} /><p>{text}</p></div>;
}

function UserBadge({ type }: { type?: string }) {
  if (type === "student") return <span className="user-type-badge student"><i className="fas fa-user-graduate" /> Student</span>;
  if (type === "visitor") return <span className="user-type-badge visitor"><i className="fas fa-users" /> Visitor</span>;
  return null;
}

function FeedbackItem({ f, onClick }: { f: Feedback; onClick: () => void }) {
  return (
    <div className={cx("feedback-item", f.overall_rating <= 2 && "critical")} onClick={onClick}>
      <div className="feedback-header"><span className="feedback-dept">{f.department_name}</span><span className="feedback-rating">{stars(f.overall_rating)}</span></div>
      {f.user_type && <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}><UserBadge type={f.user_type} /><span style={{ fontSize: "0.85rem", color: "#4a5568" }}>{identifierOf(f)}</span></div>}
      <p className="feedback-comment">{f.comments || "No comments provided"}</p>
      <div className="feedback-meta"><span className="feedback-date"><i className="far fa-clock" /> {timeAgo(new Date(f.created_at))}</span></div>
    </div>
  );
}

function FeedbackDetailModal({ f, onClose }: { f: Feedback; onClose: () => void }) {
  return (
    <div className="modal active">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-header"><h3><i className="fas fa-comment-dots" /> Feedback Details</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="feedback-detail">
            <div className="detail-section">
              <h4><i className="fas fa-info-circle" /> Feedback Information</h4>
              <div style={{ marginBottom: 15 }}><UserBadge type={f.user_type} /></div>
              <div className="detail-grid">
                {f.transaction_id && <DetailItem label="Transaction ID" value={f.transaction_id} />}
                <DetailItem label="Department" value={f.department_name} />
                <DetailItem label={f.user_type === "student" ? "Student" : "Visitor"} value={identifierOf(f)} />
                <DetailItem label="Date Submitted" value={new Date(f.created_at).toLocaleString()} />
              </div>
            </div>

            {f.user_type === "visitor" && (
              <div className="detail-section">
                <h4><i className="fas fa-user" /> Visitor Information</h4>
                <div className="detail-grid">
                  <DetailItem label="Name" value={f.visitor_name || f.user_identifier || "—"} />
                  {f.visitor_email && <DetailItem label="Email" value={f.visitor_email} />}
                  {f.visitor_phone && <DetailItem label="Phone" value={f.visitor_phone} />}
                  {f.service_type && <DetailItem label="Service Type" value={f.service_type} />}
                  {f.visit_date && <DetailItem label="Visit Date" value={new Date(f.visit_date).toLocaleDateString()} />}
                </div>
              </div>
            )}

            <div className="detail-section">
              <h4><i className="fas fa-star" /> Overall Rating</h4>
              <div style={{ textAlign: "center", fontSize: "2rem", color: "#ffd700" }}>{stars(f.overall_rating)}<p style={{ margin: "10px 0 0", fontSize: "1.2rem", color: "#2d3748" }}>{f.overall_rating}/5</p></div>
            </div>

            <div className="detail-section">
              <h4><i className="fas fa-sliders-h" /> Service Criteria Ratings</h4>
              <div className="ratings-grid">
                <RatingItem label="Processing Time" value={f.processing_time} />
                <RatingItem label="Staff Assistance" value={f.staff_assistance} />
                <RatingItem label="Clarity" value={f.clarity} />
                <RatingItem label="Facility" value={f.facility} />
              </div>
            </div>

            {f.comments && (
              <div className="detail-section"><h4><i className="fas fa-comment" /> Comments</h4><p style={{ lineHeight: 1.6, color: "#4a5568" }}>{f.comments}</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="detail-item"><span className="detail-label">{label}</span><span className="detail-value">{value}</span></div>;
}
function RatingItem({ label, value }: { label: string; value: number }) {
  return <div className="rating-item"><span className="rating-item-label">{label}</span><span className="rating-item-value" style={{ color: "#ffd700" }}>{stars(value)}</span></div>;
}
