import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/admin/serrano-dashboard.css";

/**
 * adminSerrano (Academic Affairs Manager) dashboard.
 *
 * Faithful migration of adminSerrano.js: pulls the faculty roster from
 * `GET /api/faculty` and derives every stat client-side — total active,
 * doctorate/master counts, PDS-updated-in-last-year, per-program counts, and
 * the PDS staleness alerts (never / 1y+ / 2y+).
 */

type Faculty = {
  full_name: string;
  program?: string;
  employment_type?: string;
  highest_degree?: string;
  last_pds_update?: string | null;
  is_active?: boolean;
};

const PROGRAMS: { key: string; icon: string }[] = [
  { key: "BSIT", icon: "fa-laptop-code" },
  { key: "BSCpE", icon: "fa-microchip" },
  { key: "BSHM", icon: "fa-utensils" },
  { key: "BSOA", icon: "fa-briefcase" },
];

type Alert = {
  faculty: Faculty;
  severity: "critical" | "warning";
  message: string;
};

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const now = useNow();
  const [faculty, setFaculty] = useState<Faculty[]>([]);

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

  const stats = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return {
      total: active.length,
      doctorate: active.filter((f) => f.highest_degree === "Doctorate").length,
      masters: active.filter((f) => f.highest_degree === "Master").length,
      pdsUpdated: active.filter((f) => f.last_pds_update && new Date(f.last_pds_update) >= oneYearAgo).length,
    };
  }, [active]);

  const programCounts = useMemo(() => {
    const map: Record<string, number> = {};
    PROGRAMS.forEach((p) => (map[p.key] = active.filter((f) => f.program === p.key).length));
    return map;
  }, [active]);

  const alerts = useMemo<Alert[]>(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const list: Alert[] = [];
    active.forEach((f) => {
      if (!f.last_pds_update) {
        list.push({ faculty: f, severity: "critical", message: "PDS never updated" });
      } else {
        const d = new Date(f.last_pds_update);
        if (d < twoYearsAgo) list.push({ faculty: f, severity: "critical", message: "PDS severely outdated (2+ years)" });
        else if (d < oneYearAgo) list.push({ faculty: f, severity: "warning", message: "PDS outdated (1+ year)" });
      }
    });
    return list.sort((a, b) => (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1));
  }, [active]);

  const dateText = now.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", hour12: true,
  });

  const goToFaculty = (program?: string) =>
    navigate(program ? `${PATHS.admin.serrano.facultyManagement}?program=${program}` : PATHS.admin.serrano.facultyManagement);

  const SUMMARY = [
    { cls: "faculty", icon: "fa-users", value: stats.total, label: "Total Active Faculty" },
    { cls: "alumni", icon: "fa-graduation-cap", value: stats.doctorate, label: "Doctorate Holders" },
    { cls: "research", icon: "fa-user-graduate", value: stats.masters, label: "Master's Degree Holders" },
    { cls: "events", icon: "fa-id-card", value: stats.pdsUpdated, label: "PDS Updated (Last Year)" },
  ];

  return (
    <div className="serrano-dashboard">
      <h1>Welcome, Academic Affairs Manager!</h1>
      <p className="datetime">{dateText}</p>

      <section className="summary-cards">
        <div className="card-grid">
          {SUMMARY.map((c) => (
            <div className={cx("summary-card", c.cls)} key={c.label}>
              <div className={cx("card-icon", c.cls)}><i className={cx("fas", c.icon)} /></div>
              <div className="card-content">
                <h3 className="card-number">{c.value}</h3>
                <p className="card-label">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="program-section">
        <h2><i className="fas fa-building-columns" /> Faculty by Program</h2>
        <div className="program-cards">
          {PROGRAMS.map((p) => (
            <div className="program-card" key={p.key} onClick={() => goToFaculty(p.key)}>
              <div className="program-icon"><i className={cx("fas", p.icon)} /></div>
              <h3>{p.key}</h3>
              <p className="program-count">{programCounts[p.key]} Faculty</p>
            </div>
          ))}
        </div>
      </section>

      <section className="quick-actions">
        <h2><i className="fas fa-bolt" /> Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => goToFaculty()}>
            <i className="fa fa-users" /> <span>Manage Faculty</span>
          </button>
          <button className="action-btn" onClick={() => navigate(PATHS.admin.serrano.analyticsReport)}>
            <i className="fa fa-chart-line" /> <span>View Analytics</span>
          </button>
          <button className="action-btn" onClick={() => navigate(PATHS.admin.serrano.analyticsReport)}>
            <i className="fa fa-robot" /> <span>Generate AI Report</span>
          </button>
        </div>
      </section>

      <section className="pds-alert-section">
        <h2><i className="fas fa-exclamation-triangle" /> PDS Update Alerts</h2>
        <div className="alert-grid">
          {alerts.length === 0 ? (
            <div className="alert-card success">
              <i className="fas fa-check-circle" />
              <div className="alert-content">
                <h4>All PDS Records Up to Date</h4>
                <p>All faculty members have updated their PDS within the last year.</p>
              </div>
            </div>
          ) : (
            <>
              {alerts.slice(0, 5).map((a, i) => (
                <div className={cx("alert-card", a.severity)} key={i}>
                  <i className={cx("fas", a.severity === "critical" ? "fa-exclamation-circle" : "fa-exclamation-triangle")} />
                  <div className="alert-content">
                    <h4>{a.faculty.full_name}</h4>
                    <p className="alert-program">{a.faculty.program} - {a.faculty.employment_type}</p>
                    <p className="alert-message">{a.message}</p>
                    <p className="alert-date">
                      {a.faculty.last_pds_update
                        ? `Last updated: ${new Date(a.faculty.last_pds_update).toLocaleDateString()}`
                        : "No update record"}
                    </p>
                  </div>
                </div>
              ))}
              {alerts.length > 5 && (
                <div className="alert-card info">
                  <i className="fas fa-info-circle" />
                  <div className="alert-content">
                    <h4>+{alerts.length - 5} More Alerts</h4>
                    <p>View Faculty Management for complete list</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
