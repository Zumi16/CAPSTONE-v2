import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/admin/mila-dashboard.css";

type Scholarship = {
  status?: string;
  created_at?: string;
  deadline?: string;
  title?: string;
  provider?: string;
  amount?: string;
};
type Organization = { status?: string; category?: string; created_at?: string; name?: string };
type CertStats = {
  total_requests?: number;
  pending_count?: number;
  generated_count?: number;
  printed_count?: number;
  released_count?: number;
};
type CertRequest = {
  request_number?: string;
  full_name?: string;
  certificate_type?: string;
  created_at?: string;
};

type Activity = { type: "scholarship" | "career" | "certificate"; title: string; description: string; timestamp?: string; icon: string };

function timeAgo(ts?: string): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function MilaDashboardPage() {
  const now = useNow();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [careers, setCareers] = useState<Organization[]>([]);
  const [certStats, setCertStats] = useState<CertStats>({});
  const [certRequests, setCertRequests] = useState<CertRequest[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  useEffect(() => {
    (async () => {
      const [sch, car, cs, cr] = await Promise.all([
        api.get<{ success: boolean; scholarships: Scholarship[] }>("/api/scholarships/all").catch(() => null),
        api.get<{ success: boolean; organizations: Organization[] }>("/api/career/organizations/all").catch(() => null),
        api.get<{ success: boolean; stats: CertStats }>("/api/certificate-requests/admin/stats").catch(() => null),
        api.get<{ success: boolean; requests: CertRequest[] }>("/api/certificate-requests/admin/recent").catch(() => null),
      ]);
      if (sch?.success) setScholarships(sch.scholarships);
      if (car?.success) setCareers(car.organizations);
      if (cs?.success) setCertStats(cs.stats);
      if (cr?.success) setCertRequests(cr.requests ?? []);
    })();
  }, []);

  // Scholarship stats
  const s = useMemo(() => {
    const now = new Date();
    const thirtyAgo = new Date(now.getTime() - 30 * 864e5);
    const seven = new Date(now.getTime() + 7 * 864e5);
    return {
      total: scholarships.length,
      open: scholarships.filter((x) => x.status === "open").length,
      upcoming: scholarships.filter((x) => x.status === "upcoming").length,
      closed: scholarships.filter((x) => x.status === "closed").length,
      recent: scholarships.filter((x) => x.created_at && new Date(x.created_at) >= thirtyAgo).length,
      deadlines: scholarships.filter((x) => {
        if (!x.deadline || x.status !== "open") return false;
        const dl = new Date(x.deadline);
        return dl >= now && dl <= seven;
      }).length,
    };
  }, [scholarships]);

  // Career stats
  const c = useMemo(() => {
    const cat = (k: string) => careers.filter((o) => o.category === k).length;
    return {
      total: careers.length,
      active: careers.filter((o) => o.status === "active").length,
      inactive: careers.filter((o) => o.status === "inactive").length,
      government: cat("Government"),
      university: cat("University Unit"),
      private: cat("Private Company"),
    };
  }, [careers]);

  const insights = useMemo(() => {
    const out: { type: "warning" | "info" | "success"; icon: string; message: string }[] = [];
    if (s.deadlines > 0)
      out.push({ type: "warning", icon: "fa-exclamation-triangle", message: `${s.deadlines} scholarship${s.deadlines > 1 ? "s" : ""} closing within 7 days` });
    if (c.inactive > 0)
      out.push({ type: "info", icon: "fa-info-circle", message: `${c.inactive} career partner${c.inactive > 1 ? "s" : ""} marked as inactive` });
    if (out.length === 0) out.push({ type: "success", icon: "fa-check-circle", message: "All systems running smoothly" });
    return out;
  }, [s.deadlines, c.inactive]);

  const allActivity = useMemo<Activity[]>(() => {
    const acts: Activity[] = [
      ...[...scholarships].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 10).map((x) => ({
        type: "scholarship" as const, title: `New Scholarship: ${x.title}`, description: `${x.provider ?? ""} - ${x.amount ?? ""}`, timestamp: x.created_at, icon: "fa-graduation-cap",
      })),
      ...[...careers].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 10).map((x) => ({
        type: "career" as const, title: `New Partner: ${x.name}`, description: `${x.category ?? ""} organization added`, timestamp: x.created_at, icon: "fa-building",
      })),
      ...certRequests.slice(0, 10).map((r) => ({
        type: "certificate" as const, title: `Certificate Request: ${r.request_number}`, description: `${r.full_name} - ${r.certificate_type === "no_id" ? "No ID Certificate" : "ID Fill-Out"}`, timestamp: r.created_at, icon: "fa-certificate",
      })),
    ].sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());
    return acts;
  }, [scholarships, careers, certRequests]);

  const recent = allActivity.slice(0, 10);

  const dateText = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="mila-dashboard">
      {/* Welcome */}
      <section className="welcome-section">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome back, <span>AdminMila</span>!</h1>
          <p className="welcome-subtitle">Manage scholarship and career opportunities for PUP Parañaque students</p>
          <div className="datetime-display"><i className="far fa-clock" /> <span>{dateText}</span></div>
        </div>
        <div className="system-status">
          <div className="status-indicator">
            <div className="status-dot operational" />
            <div className="status-text">
              <span className="status-label">System Status</span>
              <span className="status-value">Operational</span>
            </div>
          </div>
          <div className="last-sync"><i className="fas fa-sync-alt" /> <span>Last sync: Just now</span></div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="stats-grid">
        {([
          ["fa-graduation-cap", "linear-gradient(135deg,#48bb78,#38a169)", s.total, "Total Scholarships"],
          ["fa-door-open", "linear-gradient(135deg,#38a169,#2f855a)", s.open, "Open Scholarships"],
          ["fa-building", "linear-gradient(135deg,#667eea,#764ba2)", c.active, "Career Partners"],
          ["fa-certificate", "linear-gradient(135deg,#ed8936,#dd6b20)", certStats.pending_count ?? 0, "Pending Certificates"],
        ] as const).map(([icon, bg, value, label]) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon" style={{ background: bg, color: "#fff" }}><i className={cx("fa-solid", icon)} /></div>
            <div className="stat-info"><h3>{value}</h3><p>{label}</p></div>
          </div>
        ))}
      </div>

      {/* Insights */}
      <section className="insights-section">
        <div className="section-header"><h2 className="section-title"><i className="fas fa-lightbulb" /> Insights & Alerts</h2></div>
        {insights.map((ins, i) => (
          <div className={cx("insight-alert", ins.type)} key={i}><i className={cx("fa-solid", ins.icon)} /><span>{ins.message}</span></div>
        ))}
      </section>

      {/* Quick actions */}
      <section className="quick-actions-section">
        <div className="section-header"><h2 className="section-title"><i className="fas fa-bolt" /> Quick Actions</h2></div>
        <div className="quick-actions-grid">
          <Link to={PATHS.admin.mila.scholarships} className="quick-action-card">
            <div className="quick-action-icon"><i className="fa-solid fa-graduation-cap" /></div>
            <h4>Manage Scholarships</h4><p>Create and update opportunities</p>
          </Link>
          <Link to={PATHS.admin.mila.careers} className="quick-action-card">
            <div className="quick-action-icon"><i className="fa-solid fa-briefcase" /></div>
            <h4>Career Directory</h4><p>Manage partner organizations</p>
          </Link>
          <Link to={PATHS.admin.mila.certificates} className="quick-action-card">
            <div className="quick-action-icon"><i className="fa-solid fa-certificate" /></div>
            <h4>Process Certificates</h4><p>Handle student requests</p>
          </Link>
        </div>
      </section>

      {/* Detailed statistics */}
      <section className="insights-section">
        <div className="section-header"><h2 className="section-title"><i className="fas fa-chart-bar" /> Detailed Statistics</h2></div>
        <div className="detailed-stats-container">
          <div className="detailed-stats-section">
            <h3><i className="fa-solid fa-graduation-cap" /> Scholarships Breakdown</h3>
            <div className="detailed-stats">
              <Detail value={s.upcoming} label="Upcoming" />
              <Detail value={s.closed} label="Closed" />
              <Detail value={s.recent} label="Added (30 days)" />
              <Detail value={s.deadlines} label="Deadlines (7 days)" />
            </div>
          </div>
          <div className="detailed-stats-section">
            <h3><i className="fa-solid fa-briefcase" /> Career Partners Breakdown</h3>
            <div className="detailed-stats">
              <Detail value={c.government} label="Government" />
              <Detail value={c.university} label="University Units" />
              <Detail value={c.private} label="Private Companies" />
              <Detail value={c.total} label="Total Partners" />
            </div>
          </div>
          <div className="detailed-stats-section">
            <h3><i className="fa-solid fa-certificate" /> Certificate Requests Status</h3>
            <div className="detailed-stats">
              <Detail value={certStats.generated_count ?? 0} label="Generated" />
              <Detail value={certStats.printed_count ?? 0} label="Printed" />
              <Detail value={certStats.released_count ?? 0} label="Released" />
              <Detail value={certStats.total_requests ?? 0} label="Total Requests" />
            </div>
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="recent-activity-section">
        <div className="section-header">
          <h2 className="section-title"><i className="fas fa-history" /> Recent Activity</h2>
          <button className="view-all-btn" onClick={() => setShowAudit(true)}><i className="fas fa-list" /> View All</button>
        </div>
        <div className="activity-feed">
          {recent.length === 0 ? (
            <div className="empty-state"><i className="fa-solid fa-clock" /><p>No recent activity</p></div>
          ) : (
            recent.map((a, i) => (
              <div className={cx("activity-item", a.type)} key={i}>
                <div className="activity-icon"><i className={cx("fa-solid", a.icon)} /></div>
                <div className="activity-content">
                  <div className="activity-title">{a.title}</div>
                  <div className="activity-description">{a.description}</div>
                  <div className="activity-time">{timeAgo(a.timestamp)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Audit modal */}
      {showAudit && (
        <div className="mila-audit-overlay" onClick={() => setShowAudit(false)}>
          <div className="mila-audit-content" onClick={(e) => e.stopPropagation()}>
            <div className="mila-audit-header">
              <h2><i className="fas fa-clipboard-list" /> Activity Audit Trail</h2>
              <button className="mila-audit-close" onClick={() => setShowAudit(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="mila-audit-body">
              {allActivity.length === 0 ? (
                <div className="empty-state"><i className="fa-solid fa-clock" /><p>No activity recorded yet</p></div>
              ) : (
                allActivity.map((a, i) => (
                  <div className="audit-item" key={i}>
                    <div className="audit-number">#{i + 1}</div>
                    <div className="audit-icon"><i className={cx("fa-solid", a.icon)} /></div>
                    <div className="audit-content">
                      <div className="audit-title">{a.title}</div>
                      <div className="audit-description">{a.description}</div>
                      <div className="audit-timestamp">
                        <i className="far fa-clock" />{" "}
                        {a.timestamp ? new Date(a.timestamp).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ value, label }: { value: number; label: string }) {
  return (
    <div className="detail-stat-card">
      <div className="detail-stat-value">{value}</div>
      <div className="detail-stat-label">{label}</div>
    </div>
  );
}
