import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";

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
];

function OrganizationCard({ org }: { org: Organization }) {
  const icon = CATEGORY_ICONS[org.category] ?? "fa-building";
  const color = CATEGORY_COLORS[org.category] ?? "#666";

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <span
        className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <i className={cx("fas", icon)} /> {org.category}
      </span>

      {org.logo_url ? (
        <img
          src={org.logo_url}
          alt={org.name}
          className="mx-auto h-20 w-auto object-contain"
        />
      ) : (
        <div className="flex h-20 items-center justify-center text-4xl text-gray-300">
          <i className={cx("fas", icon)} />
        </div>
      )}

      <div className="mt-4 flex-1">
        <h3 className="text-lg font-bold text-gray-900">{org.name}</h3>
        <p className="mt-1 text-sm text-gray-600">{org.description}</p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={org.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-light"
        >
          <i className="fas fa-globe" /> Visit Website
          <i className="fas fa-external-link-alt" />
        </a>
        {org.careers_page_url && (
          <a
            href={org.careers_page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-maroon px-4 py-2 text-sm font-semibold text-maroon transition hover:bg-rose-50"
          >
            <i className="fas fa-briefcase" /> View Careers Page
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
    <main className="bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-red-900 to-red-700 px-4 py-16 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Career &amp; Job Placement Directory
        </h1>
        <p className="mt-2 text-white/90">PUP Parañaque Campus</p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-maroon">
            Partner Organizations &amp; Career Resources
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-gray-600">
            Browse our curated list of trusted partner organizations where you can
            explore job opportunities and career resources.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mb-8 flex items-start gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-gray-700">
          <i className="fas fa-exclamation-triangle mt-0.5 text-amber-500" />
          <div>
            <strong>Important Notice:</strong> The campus serves as an{" "}
            <strong>information dissemination platform only</strong>. Job
            availability, requirements, and application processes are managed solely
            by partner organizations. Students are advised to visit the official
            websites for updated job listings.
          </div>
        </div>

        {/* Info cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {INFO_CARDS.map((card) => (
            <div key={card.title} className="rounded-xl bg-white p-5 text-center shadow-sm">
              <i className={cx("fas", card.icon, "text-3xl text-maroon")} />
              <h3 className="mt-3 font-bold text-gray-900">{card.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{card.text}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <i className="fas fa-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition",
                  category === cat.key
                    ? "bg-maroon text-white"
                    : "bg-white text-gray-700 shadow-sm hover:bg-gray-100",
                )}
              >
                <i className={cx("fas", cat.icon)} /> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {status === "loading" && (
          <div className="py-12 text-center text-gray-500">
            <i className="fas fa-spinner fa-spin text-3xl text-maroon" />
            <p className="mt-3">Loading partner organizations...</p>
          </div>
        )}

        {status !== "loading" && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((org) => (
              <OrganizationCard key={org.id} org={org} />
            ))}
          </div>
        )}

        {status === "ready" && filtered.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <i className="fas fa-search mb-3 text-4xl text-gray-300" />
            <h3 className="text-lg font-semibold">No Organizations Found</h3>
            <p>No partner organizations match your search criteria.</p>
          </div>
        )}

        {status === "error" && (
          <div className="py-12 text-center text-gray-500">
            <i className="fas fa-exclamation-triangle mb-3 text-4xl text-red-500" />
            <h3 className="text-lg font-semibold">Error Loading Organizations</h3>
            <p>Please refresh the page or try again later.</p>
          </div>
        )}
      </div>
    </main>
  );
}
