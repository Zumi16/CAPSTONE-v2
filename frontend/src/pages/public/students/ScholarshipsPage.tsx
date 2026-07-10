import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { formatLongDate } from "@/lib/format";
import "@/styles/pages/scholarships.css";

/** Raw scholarship row from the backend. */
type DbScholarship = {
  id: number;
  title: string;
  provider: string;
  status: string;
  description: string;
  eligibility?: string;
  benefits?: string;
  required_documents?: string;
  application_process?: string;
  external_links?: string;
  deadline?: string;
  open_date?: string;
  contact_info?: string;
  amount?: string;
  slots?: number;
  files?: { file_path: string; file_name: string; file_type: string }[];
  eligible_courses?: string;
};

/** Display-friendly scholarship after parsing the text fields into lists. */
type Scholarship = ReturnType<typeof transformScholarship>;

/** Split a textarea field ("a\nb•c") into a clean list of lines. */
function splitLines(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\n|•/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function transformScholarship(db: DbScholarship) {
  const requirements = splitLines(db.eligibility);
  const documents = splitLines(db.required_documents);
  const process = splitLines(db.application_process);

  return {
    id: db.id,
    title: db.title,
    provider: db.provider,
    providerType: "Government",
    type: "Academic",
    status: db.status.charAt(0).toUpperCase() + db.status.slice(1),
    description: db.description,
    eligibility: requirements[0] || db.eligibility || "",
    requirements,
    benefits: splitLines(db.benefits),
    documents:
      documents.length > 0
        ? documents
        : [
            "Certificate of Enrollment",
            "Transcript of Records",
            "Valid ID",
            "Other requirements as specified",
          ],
    process:
      process.length > 0
        ? process
        : [
            "Submit required documents to the Student Affairs Office",
            "Wait for application review",
            "Attend interview if required",
            "Receive notification of application status",
          ],
    externalLinks: db.external_links
      ? db.external_links.split(/\n/).map((l) => l.trim()).filter(Boolean)
      : [],
    deadline: db.deadline ? formatLongDate(db.deadline) : "N/A",
    contact: db.contact_info || "Student Affairs Office - PUP Parañaque",
    amount: db.amount,
    slots: db.slots,
    files: db.files ?? [],
    eligibleCourses: db.eligible_courses || "All Programs",
  };
}

const STATUS_OPTIONS = ["Open", "Upcoming", "Closed"];
const COURSE_OPTIONS = ["BSIT", "BSCpE", "BSOA", "BSHM"];
const PROVIDER_OPTIONS = ["Government", "Private", "School-based"];
const TYPE_OPTIONS = ["Academic", "Financial Assistance", "Grant", "Allowance-based"];

function ScholarshipCard({
  scholarship,
  onOpen,
}: {
  scholarship: Scholarship;
  onOpen: (s: Scholarship) => void;
}) {
  return (
    <div className="scholarship-card" onClick={() => onOpen(scholarship)}>
      <div className="card-header">
        <h3 className="card-title">{scholarship.title}</h3>
        <p className="card-provider">
          <i className="fas fa-building" /> {scholarship.provider}
        </p>
      </div>
      <div className="card-body">
        <div className="card-badges">
          <span className={cx("badge badge-status", scholarship.status.toLowerCase())}>
            {scholarship.status}
          </span>
          <span className="badge badge-type">{scholarship.type}</span>
          <span className="badge badge-campus">
            <i className="fas fa-map-marker-alt" /> PUP Parañaque
          </span>
          <span
            className={cx(
              "badge badge-courses",
              scholarship.eligibleCourses === "All Programs" && "badge-all-programs",
            )}
          >
            <i className="fas fa-graduation-cap" /> {scholarship.eligibleCourses}
          </span>
        </div>

        <div className="card-info">
          <div className="info-item">
            <i className="fas fa-graduation-cap info-icon" />
            <span>{scholarship.eligibility}</span>
          </div>
          {scholarship.amount && (
            <div className="info-item">
              <i className="fas fa-money-bill-wave info-icon" />
              <span>{scholarship.amount}</span>
            </div>
          )}
        </div>

        <p className="card-description">{scholarship.description}</p>

        <div className="card-footer">
          <div className="deadline-info">
            <i className="fas fa-clock deadline-icon" />
            <span>Deadline: {scholarship.deadline}</span>
          </div>
          <button className="view-details-btn">View Details</button>
        </div>
      </div>
    </div>
  );
}

function ScholarshipModal({
  scholarship,
  onClose,
}: {
  scholarship: Scholarship | null;
  onClose: () => void;
}) {
  useEscapeToClose(Boolean(scholarship), onClose);
  if (!scholarship) return null;

  return (
    <div className="modal active" id="scholarshipModal" style={{ display: "flex" }}>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <button className="modal-close" id="closeModal" onClick={onClose}>
          <i className="fas fa-times" />
        </button>
        <div className="modal-body" id="modalBody">
          <div className="modal-header">
            <h2 className="modal-title">{scholarship.title}</h2>
            <p className="modal-provider">
              <i className="fas fa-building" /> {scholarship.provider}
            </p>
            <span className={cx("badge badge-status", scholarship.status.toLowerCase())}>
              {scholarship.status}
            </span>
          </div>

          <div className="modal-section">
            <h3 className="modal-section-title">Description</h3>
            <p>{scholarship.description}</p>
          </div>

          {scholarship.requirements.length > 0 && (
            <ModalList title="Eligibility Requirements" items={scholarship.requirements} />
          )}
          {scholarship.benefits.length > 0 && (
            <ModalList title="Benefits" items={scholarship.benefits} />
          )}
          <ModalList title="Required Documents" items={scholarship.documents} />
          <ModalList title="Application Process" items={scholarship.process} ordered />

          <div className="modal-section">
            <h3 className="modal-section-title">Details</h3>
            <p>
              <strong>Deadline:</strong> {scholarship.deadline}
            </p>
            {scholarship.amount && (
              <p>
                <strong>Amount:</strong> {scholarship.amount}
              </p>
            )}
            {scholarship.slots != null && (
              <p>
                <strong>Slots:</strong> {scholarship.slots}
              </p>
            )}
            <p>
              <strong>Contact:</strong> {scholarship.contact}
            </p>
          </div>

          {scholarship.externalLinks.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">Links</h3>
              {scholarship.externalLinks.map((link) => (
                <p key={link}>
                  <a href={link} target="_blank" rel="noreferrer">
                    {link}
                  </a>
                </p>
              ))}
            </div>
          )}

          {scholarship.files.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">Attachments</h3>
              {scholarship.files.map((file) => (
                <p key={file.file_path}>
                  <a href={assetUrl(file.file_path)} target="_blank" rel="noreferrer" download>
                    <i className="fas fa-file" /> {file.file_name}
                  </a>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalList({
  title,
  items,
  ordered,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className="modal-section">
      <h3 className="modal-section-title">{title}</h3>
      <List>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </List>
    </div>
  );
}

export function ScholarshipsPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<Scholarship | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    api
      .get<{ success: boolean; scholarships: DbScholarship[] }>("/api/scholarships/public")
      .then((data) => {
        setScholarships((data.success ? data.scholarships : []).map(transformScholarship));
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error loading scholarships:", err);
        setStatus("error");
      });
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return scholarships.filter((s) => {
      const matchesSearch =
        !term ||
        s.title.toLowerCase().includes(term) ||
        s.provider.toLowerCase().includes(term);
      const matchesStatus = !statusFilter || s.status === statusFilter;
      const matchesCourse =
        !courseFilter ||
        s.eligibleCourses === "All Programs" ||
        s.eligibleCourses.includes(courseFilter);
      const matchesProvider = !providerFilter || s.providerType === providerFilter;
      const matchesType = !typeFilter || s.type === typeFilter;
      return (
        matchesSearch &&
        matchesStatus &&
        matchesCourse &&
        matchesProvider &&
        matchesType
      );
    });
  }, [scholarships, search, statusFilter, courseFilter, providerFilter, typeFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCourseFilter("");
    setProviderFilter("");
    setTypeFilter("");
  };

  return (
    <main className="main scholarships-page">
      <div className="hero-banner">
        <div className="hero-overlay">
          <h1 className="hero-title">Scholarship Opportunities</h1>
          <p className="hero-subtitle">PUP Parañaque Campus</p>
        </div>
      </div>

      <section className="page-header">
        <div className="container">
          <h2 className="section-title">Financial Aid &amp; Scholarship Programs</h2>
          <p className="section-description">
            Official scholarship announcements and financial aid opportunities
            applicable to <strong>PUP Parañaque students only</strong>.
          </p>
        </div>
      </section>

      <section className="notice-banner">
        <div className="container">
          <div className="notice-content">
            <i className="fas fa-info-circle notice-icon" />
            <p className="notice-text">
              <strong>Important Notice:</strong> Only scholarships applicable to
              PUP Parañaque Campus are posted here. Opportunities from other PUP
              branches are intentionally excluded to avoid confusion.
            </p>
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
                placeholder="Search by scholarship name or provider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filters">
              <FilterSelect value={statusFilter} onChange={setStatusFilter} all="All Status" options={STATUS_OPTIONS} />
              <FilterSelect value={courseFilter} onChange={setCourseFilter} all="All Programs" options={COURSE_OPTIONS} />
              <FilterSelect value={providerFilter} onChange={setProviderFilter} all="All Providers" options={PROVIDER_OPTIONS} />
              <FilterSelect value={typeFilter} onChange={setTypeFilter} all="All Types" options={TYPE_OPTIONS} />
              <button className="clear-btn" onClick={clearFilters}>
                <i className="fas fa-times" /> Clear Filters
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="scholarship-section">
        <div className="container">
          {status === "loading" && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading scholarships...</p>
            </div>
          )}

          {status !== "loading" && filtered.length > 0 && (
            <div className="scholarship-grid">
              {filtered.map((scholarship) => (
                <ScholarshipCard
                  key={scholarship.id}
                  scholarship={scholarship}
                  onOpen={setSelected}
                />
              ))}
            </div>
          )}

          {status === "ready" && filtered.length === 0 && (
            <div className="empty-state" style={{ display: "flex" }}>
              <i className="fas fa-search empty-icon" />
              <h3 className="empty-title">No Scholarships Found</h3>
              <p className="empty-text">
                There are currently no active scholarship opportunities matching
                your filters for PUP Parañaque Campus. Please check back regularly
                or adjust your filters.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="empty-state" style={{ display: "flex" }}>
              <i className="fas fa-exclamation-triangle empty-icon" style={{ color: "#e53935" }} />
              <h3 className="empty-title">Error Loading Scholarships</h3>
              <p className="empty-text">Please refresh the page or try again later.</p>
            </div>
          )}
        </div>
      </section>

      <ScholarshipModal scholarship={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

function FilterSelect({
  value,
  onChange,
  all,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  all: string;
  options: string[];
}) {
  return (
    <select className="filter-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{all}</option>
      {options.map((option) => (
        <option value={option} key={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
