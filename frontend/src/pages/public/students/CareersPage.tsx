import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import "@/styles/pages/careers-public.css";

type Organization = {
  id: number;
  name: string;
  description: string;
  category: string;
  logo_url: string | null;
  website_url: string;
  careers_page_url: string | null;
};

type OrgResponse = { success: boolean; organizations: Organization[] };

const CATEGORIES = [
  { key: "all", label: "All Organizations", icon: "fa-th" },
  { key: "Government", label: "Government", icon: "fa-landmark" },
  { key: "University Unit", label: "University Unit", icon: "fa-university" },
  { key: "Private Company", label: "Private Company", icon: "fa-building" },
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  Government: "fa-landmark",
  "University Unit": "fa-university",
  "Private Company": "fa-building",
};
const CATEGORY_COLORS: Record<string, string> = {
  Government: "#1e88e5",
  "University Unit": "#43a047",
  "Private Company": "#e53935",
};

const INFO_CARDS = [
  {
    icon: "fa-handshake",
    title: "Trusted Partners",
    text: "All listed organizations are verified partners of PUP Parañaque Campus.",
  },
  {
    icon: "fa-link",
    title: "Direct Access",
    text: "Click on any organization to visit their official website or careers page directly.",
  },
  {
    icon: "fa-sync",
    title: "Regular Updates",
    text: "Our partner directory is regularly updated to ensure accuracy and relevance.",
  },
  {
    icon: "fa-briefcase",
    title: "Additional Employment Resources",
    text: "Explore government employment service offices like PESO and DOLE NCR for additional job opportunities and career support.",
  },
];

function OrganizationCard({ org }: { org: Organization }) {
  const icon = CATEGORY_ICONS[org.category] ?? "fa-building";
  const color = CATEGORY_COLORS[org.category] ?? "#666";

  return (
    <div className="org-card">
      <div
        className="org-category-badge"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <i className={cx("fas", icon)} /> {org.category}
      </div>

      {org.logo_url ? (
        <div className="org-logo-container">
          <img src={org.logo_url} alt={org.name} className="org-logo" />
        </div>
      ) : (
        <div className="org-logo-placeholder">
          <i className={cx("fas", icon)} />
        </div>
      )}

      <div className="org-content">
        <h3 className="org-name">{org.name}</h3>
        <p className="org-description">{org.description}</p>
      </div>

      <div className="org-actions">
        <a
          href={org.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="org-btn org-btn-primary"
        >
          <i className="fas fa-globe" /> Visit Website{" "}
          <i className="fas fa-external-link-alt" />
        </a>
        {org.careers_page_url && (
          <a
            href={org.careers_page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="org-btn org-btn-secondary"
          >
            <i className="fas fa-briefcase" /> View Careers Page{" "}
            <i className="fas fa-external-link-alt" />
          </a>
        )}
      </div>
    </div>
  );
}

export function CareersPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<OrgResponse>("/api/career/public/organizations")
      .then((data) => {
        setOrganizations(data.success ? data.organizations : []);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error loading organizations:", err);
        setStatus("error");
      });
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return organizations.filter((org) => {
      const matchesCategory = category === "all" || org.category === category;
      const matchesSearch =
        !term ||
        org.name.toLowerCase().includes(term) ||
        org.description.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [organizations, category, search]);

  return (
    <main className="main careers-page">
      <div className="hero-banner">
        <div className="hero-overlay">
          <h1 className="hero-title">Career &amp; Job Placement Directory</h1>
          <p className="hero-subtitle">PUP Parañaque Campus</p>
        </div>
      </div>

      <section className="page-header">
        <div className="container">
          <h2 className="section-title">
            Partner Organizations &amp; Career Resources
          </h2>
          <p className="section-description">
            Browse our curated list of trusted partner organizations where you
            can explore job opportunities and career resources.
          </p>
        </div>
      </section>

      <section className="disclaimer-banner">
        <div className="container">
          <div className="disclaimer-content">
            <i className="fas fa-exclamation-triangle disclaimer-icon" />
            <div className="disclaimer-text">
              <strong>Important Notice:</strong> The campus serves as an{" "}
              <strong>information dissemination platform only</strong>. Job
              availability, requirements, and application processes are managed
              solely by partner organizations. Students are advised to visit the
              official websites for updated job listings.
            </div>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="container">
          <div className="info-grid">
            {INFO_CARDS.map((card) => (
              <div className="info-card" key={card.title}>
                <i className={cx("fas", card.icon, "info-icon")} />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="filter-section">
        <div className="container">
          <div className="filter-container">
            <div className="search-container">
              <i className="fas fa-search search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search organizations by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="category-filters">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  className={cx("category-btn", category === cat.key && "active")}
                  onClick={() => setCategory(cat.key)}
                >
                  <i className={cx("fas", cat.icon)} /> {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="organizations-section">
        <div className="container">
          {status === "loading" && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading partner organizations...</p>
            </div>
          )}

          {status !== "loading" && filtered.length > 0 && (
            <div className="organizations-grid" style={{ display: "grid" }}>
              {filtered.map((org) => (
                <OrganizationCard key={org.id} org={org} />
              ))}
            </div>
          )}

          {status === "ready" && filtered.length === 0 && (
            <div className="empty-state" style={{ display: "flex" }}>
              <i className="fas fa-search empty-icon" />
              <h3 className="empty-title">No Organizations Found</h3>
              <p className="empty-text">
                No partner organizations match your search criteria. Please try
                adjusting your filters or search terms.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="empty-state" style={{ display: "flex" }}>
              <i
                className="fas fa-exclamation-triangle empty-icon"
                style={{ color: "#e53935" }}
              />
              <h3 className="empty-title">Error Loading Organizations</h3>
              <p className="empty-text">
                Unable to load partner organizations. Please refresh the page or
                try again later.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
