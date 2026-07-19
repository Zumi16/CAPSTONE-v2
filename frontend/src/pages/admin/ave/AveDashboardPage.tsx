import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/admin/ave-dashboard.css";

type Post = { title?: string; created_at?: string };

function timeAgo(ts?: string): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ACTIVITY_META = {
  ojt: { icon: "fa-briefcase", color: "#3b82f6" },
  internship: { icon: "fa-graduation-cap", color: "#f6ad55" },
  nstp: { icon: "fa-handshake-angle", color: "#10b981" },
  research: { icon: "fa-book", color: "#d97706" },
} as const;
type ActivityType = keyof typeof ACTIVITY_META;

const STATIC_NOTIFICATIONS = [
  { level: "high", icon: "fa-thumbs-up", title: "Memo Approved by SAS", text: "Your memo has been approved and published", time: "30 minutes ago" },
  { level: "medium", icon: "fa-user-plus", title: "Announcement Returned", text: "SAS requested edits on your announcement", time: "2 hours ago" },
  { level: "low", icon: "fa-sync", title: "New Form Added", text: "A new downloadable form was added to the system", time: "1 day ago" },
] as const;

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function AveDashboardPage() {
  const navigate = useNavigate();
  const now = useNow();

  const [counts, setCounts] = useState({ recentUploads: 0, ojt: 0, internship: 0, nstp: 0, research: 0, forms: 0 });
  const [activity, setActivity] = useState<Array<{ type: ActivityType; title: string; time?: string }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const getPosts = (path: string) =>
          api.get<{ posts?: Post[] }>(path).catch(() => ({ posts: [] as Post[] }));
        const [recent, ojt, internship, nstp, research, forms] = await Promise.all([
          api
            .get<{ totalRecentUploads?: number }>("/api/recent-uploads")
            .catch(() => ({ totalRecentUploads: 0 })),
          getPosts("/api/ojt/posts"),
          getPosts("/api/internship/posts"),
          getPosts("/api/nstp/posts"),
          getPosts("/api/researchextension/posts"),
          api
            .get<{ folders?: unknown[] }>("/api/forms/folders?all=true")
            .catch(() => ({ folders: [] as unknown[] })),
        ]);

        const ojtPosts = ojt.posts ?? [];
        const internshipPosts = internship.posts ?? [];
        const nstpPosts = nstp.posts ?? [];
        const researchPosts = research.posts ?? [];

        setCounts({
          recentUploads: recent.totalRecentUploads ?? 0,
          ojt: ojtPosts.length,
          internship: internshipPosts.length,
          nstp: nstpPosts.length,
          research: researchPosts.length,
          forms: forms.folders?.length ?? 0,
        });

        const acts = [
          ...ojtPosts.slice(0, 3).map((p) => ({ type: "ojt" as const, title: p.title || "Untitled OJT Post", time: p.created_at })),
          ...internshipPosts.slice(0, 3).map((p) => ({ type: "internship" as const, title: p.title || "Untitled Internship Post", time: p.created_at })),
          ...nstpPosts.slice(0, 3).map((p) => ({ type: "nstp" as const, title: p.title || "Untitled NSTP Post", time: p.created_at })),
          ...researchPosts.slice(0, 3).map((p) => ({ type: "research" as const, title: p.title || "Untitled Article", time: p.created_at })),
        ]
          .sort((a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime())
          .slice(0, 5);
        setActivity(acts);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const totalPosts = counts.ojt + counts.internship + counts.nstp + counts.research;
  const breakdownTotal = totalPosts || 1;
  const pct = (n: number) => Math.round((n / breakdownTotal) * 100);

  const dateText = now.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", hour12: true,
  });

  return (
    <div className="ave-dashboard">
      <h1>Welcome, Admin Avegail!</h1>
      <p className="datetime">{dateText}</p>

      {/* Summary cards */}
      <section className="summary-cards">
        <div className="card-grid">
          <div className="summary-card alumni">
            <div className="card-icon alumni"><i className="fas fa-newspaper" /></div>
            <div className="card-content">
              <h3 className="card-number">{counts.recentUploads}</h3>
              <p className="card-label">Recent Uploads</p>
            </div>
          </div>
          <div className="summary-card faculty">
            <div className="card-icon faculty"><i className="fas fa-file-alt" /></div>
            <div className="card-content">
              <h3 className="card-number">{totalPosts}</h3>
              <p className="card-label">Total Posts</p>
            </div>
          </div>
          <div className="summary-card research">
            <div className="card-icon research"><i className="fas fa-folder" /></div>
            <div className="card-content">
              <h3 className="card-number">{counts.forms}</h3>
              <p className="card-label">Forms Repository</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="quick-actions">
        <div className="section-header">
          <h2><i className="fas fa-bolt" /> Quick Actions</h2>
        </div>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => setShowPostModal(true)}>
            <i className="fas fa-plus" /> <span>Add Post</span>
          </button>
          <button className="action-btn" onClick={() => navigate(PATHS.admin.ave.forms)}>
            <i className="fas fa-file" /> <span>View Repository</span>
          </button>
          <button className="action-btn" onClick={() => window.alert("Audit Trail feature coming soon")}>
            <i className="fas fa-history" /> <span>Audit Trail</span>
          </button>
        </div>
      </section>

      {/* Recent activity */}
      <section className="recent-activity">
        <div className="section-header">
          <h2><i className="fas fa-history" /> Recent Activity</h2>
        </div>
        {!loaded ? (
          <div className="empty-activity"><i className="fas fa-spinner fa-spin" /><p>Loading activities...</p></div>
        ) : activity.length === 0 ? (
          <div className="empty-activity"><i className="fas fa-inbox" /><p>No recent activity</p></div>
        ) : (
          activity.map((a, i) => (
            <div className={cx("activity-item", a.type)} key={i}>
              <div className="activity-icon" style={{ background: ACTIVITY_META[a.type].color }}>
                <i className={cx("fas", ACTIVITY_META[a.type].icon)} />
              </div>
              <div className="activity-content">
                <div className="activity-title">{a.title}</div>
                <div className="activity-meta">
                  <span><i className="far fa-clock" /> {timeAgo(a.time)}</span>
                  <span><i className="fas fa-tag" /> {a.type.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Two-column: content breakdown + notifications */}
      <div className="two-col">
        <section className="notifications-panel">
          <div className="section-header"><h2><i className="fas fa-chart-pie" /> Content Breakdown</h2></div>
          {totalPosts === 0 ? (
            <div className="empty-breakdown"><p>No content yet</p></div>
          ) : (
            <>
              {([
                ["OJT", counts.ojt, "#667eea", "fa-briefcase"],
                ["Internship", counts.internship, "#f6ad55", "fa-graduation-cap"],
                ["NSTP", counts.nstp, "#48bb78", "fa-handshake-angle"],
                ["Research & Extension", counts.research, "#ed8936", "fa-book"],
              ] as const).map(([label, n, color, icon]) => (
                <div className="breakdown-item" key={label}>
                  <div className="breakdown-info">
                    <i className={cx("fas", icon)} style={{ color }} />
                    <span className="breakdown-label">{label}</span>
                  </div>
                  <div className="breakdown-stats">
                    <span>{n} post{n === 1 ? "" : "s"}</span>
                    <span>{pct(n)}% of total</span>
                  </div>
                  <div className="breakdown-bar">
                    <div className="breakdown-fill" style={{ width: `${pct(n)}%`, background: color }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="notifications-panel">
          <div className="section-header">
            <h2><i className="fas fa-bell" /> Notifications</h2>
            <span className="notification-badge">3</span>
          </div>
          <div className="notifications-list">
            {STATIC_NOTIFICATIONS.map((n) => (
              <div className={cx("notification-item", n.level)} key={n.title}>
                <div className="notification-icon"><i className={cx("fas", n.icon)} /></div>
                <div className="notification-content">
                  <h4>{n.title}</h4>
                  <p>{n.text}</p>
                  <span className="notification-time">{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Add-post type modal */}
      {showPostModal && (
        <div className="post-modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="post-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Choose Post Type</h3>
            <div className="post-type-options">
              <Link to={PATHS.admin.ave.ojt} className="post-type-card">
                <i className="fas fa-briefcase" /> <span>OJT</span>
              </Link>
              <Link to={PATHS.admin.ave.internship} className="post-type-card">
                <i className="fas fa-graduation-cap" /> <span>Internship</span>
              </Link>
              <Link to={PATHS.admin.ave.nstp} className="post-type-card">
                <i className="fas fa-handshake-angle" /> <span>NSTP</span>
              </Link>
              <Link to={PATHS.admin.ave.research} className="post-type-card">
                <i className="fas fa-book" /> <span>Research & Extension</span>
              </Link>
            </div>
            <button className="modal-close-btn" onClick={() => setShowPostModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
