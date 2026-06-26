import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { formatLongDate } from "@/lib/format";

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
  contact_info?: string;
  amount?: string;
  slots?: number;
  files?: { file_path: string; file_name: string; file_type: string }[];
  eligible_courses?: string;
};

type Scholarship = ReturnType<typeof transformScholarship>;

function splitLines(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(/\n|•/).map((i) => i.trim()).filter((i) => i.length > 0);
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
    documents: documents.length > 0 ? documents : ["Certificate of Enrollment", "Transcript of Records", "Valid ID", "Other requirements as specified"],
    process: process.length > 0 ? process : ["Submit required documents to the Student Affairs Office", "Wait for application review", "Attend interview if required", "Receive notification of application status"],
    externalLinks: db.external_links ? db.external_links.split(/\n/).map((l) => l.trim()).filter(Boolean) : [],
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

const STATUS_BADGE: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  upcoming: "bg-amber-100 text-amber-700",
  closed: "bg-gray-200 text-gray-600",
};

function ScholarshipCard({ s, onOpen }: { s: Scholarship; onOpen: (s: Scholarship) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(s)}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
      <p className="mt-1 text-sm text-gray-500">
        <i className="fas fa-building" /> {s.provider}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className={cx("rounded-full px-2.5 py-0.5 font-medium", STATUS_BADGE[s.status.toLowerCase()] ?? "bg-gray-100")}>
          {s.status}
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5">{s.type}</span>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-maroon">
          <i className="fas fa-graduation-cap" /> {s.eligibleCourses}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 flex-1 text-sm text-gray-600">{s.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          <i className="fas fa-clock" /> Deadline: {s.deadline}
        </span>
        <span className="text-sm font-semibold text-maroon">View Details</span>
      </div>
    </button>
  );
}

function ModalList({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className="mb-5">
      <h3 className="mb-2 font-semibold text-maroon">{title}</h3>
      <List className={cx("space-y-1 text-sm text-gray-700", ordered ? "list-decimal pl-5" : "list-disc pl-5")}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </List>
    </div>
  );
}

function ScholarshipModal({ s, onClose }: { s: Scholarship | null; onClose: () => void }) {
  useEscapeToClose(Boolean(s), onClose);
  if (!s) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{s.title}</h2>
            <p className="mt-1 text-sm text-gray-500"><i className="fas fa-building" /> {s.provider}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-gray-400 hover:text-gray-700">&times;</button>
        </div>

        <div className="mb-5">
          <h3 className="mb-2 font-semibold text-maroon">Description</h3>
          <p className="text-sm text-gray-700">{s.description}</p>
        </div>

        {s.requirements.length > 0 && <ModalList title="Eligibility Requirements" items={s.requirements} />}
        {s.benefits.length > 0 && <ModalList title="Benefits" items={s.benefits} />}
        <ModalList title="Required Documents" items={s.documents} />
        <ModalList title="Application Process" items={s.process} ordered />

        <div className="mb-5 text-sm text-gray-700">
          <h3 className="mb-2 font-semibold text-maroon">Details</h3>
          <p><strong>Deadline:</strong> {s.deadline}</p>
          {s.amount && <p><strong>Amount:</strong> {s.amount}</p>}
          {s.slots != null && <p><strong>Slots:</strong> {s.slots}</p>}
          <p><strong>Contact:</strong> {s.contact}</p>
        </div>

        {s.externalLinks.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 font-semibold text-maroon">Links</h3>
            {s.externalLinks.map((link) => (
              <a key={link} href={link} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 hover:underline">{link}</a>
            ))}
          </div>
        )}

        {s.files.length > 0 && (
          <div>
            <h3 className="mb-2 font-semibold text-maroon">Attachments</h3>
            {s.files.map((file) => (
              <a key={file.file_path} href={assetUrl(file.file_path)} target="_blank" rel="noreferrer" download className="block text-sm text-blue-600 hover:underline">
                <i className="fas fa-file" /> {file.file_name}
              </a>
            ))}
          </div>
        )}
      </div>
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
      const matchesSearch = !term || s.title.toLowerCase().includes(term) || s.provider.toLowerCase().includes(term);
      const matchesStatus = !statusFilter || s.status === statusFilter;
      const matchesCourse = !courseFilter || s.eligibleCourses === "All Programs" || s.eligibleCourses.includes(courseFilter);
      const matchesProvider = !providerFilter || s.providerType === providerFilter;
      const matchesType = !typeFilter || s.type === typeFilter;
      return matchesSearch && matchesStatus && matchesCourse && matchesProvider && matchesType;
    });
  }, [scholarships, search, statusFilter, courseFilter, providerFilter, typeFilter]);

  const selectClass = "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-maroon";

  return (
    <main className="bg-gray-50">
      <div className="bg-gradient-to-br from-red-900 to-red-700 px-4 py-16 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">Scholarship Opportunities</h1>
        <p className="mt-2 text-white/90">PUP Parañaque Campus</p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-maroon">Financial Aid &amp; Scholarship Programs</h2>
          <p className="mx-auto mt-2 max-w-2xl text-gray-600">
            Official scholarship announcements applicable to{" "}
            <strong>PUP Parañaque students only</strong>.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4 text-sm text-gray-700">
          <i className="fas fa-info-circle mt-0.5 text-blue-500" />
          <p>
            <strong>Important Notice:</strong> Only scholarships applicable to PUP
            Parañaque Campus are posted here.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <i className="fas fa-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by scholarship name or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className={selectClass} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">All Programs</option>
              {COURSE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className={selectClass} value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
              <option value="">All Providers</option>
              {PROVIDER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className={selectClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <button
              onClick={() => { setSearch(""); setStatusFilter(""); setCourseFilter(""); setProviderFilter(""); setTypeFilter(""); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <i className="fas fa-times" /> Clear
            </button>
          </div>
        </div>

        {/* Grid */}
        {status === "loading" && (
          <div className="py-12 text-center text-gray-500">
            <i className="fas fa-spinner fa-spin text-3xl text-maroon" />
            <p className="mt-3">Loading scholarships...</p>
          </div>
        )}
        {status !== "loading" && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => <ScholarshipCard key={s.id} s={s} onOpen={setSelected} />)}
          </div>
        )}
        {status === "ready" && filtered.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <i className="fas fa-search mb-3 text-4xl text-gray-300" />
            <h3 className="text-lg font-semibold">No Scholarships Found</h3>
            <p>Try adjusting your filters.</p>
          </div>
        )}
        {status === "error" && (
          <div className="py-12 text-center text-gray-500">
            <i className="fas fa-exclamation-triangle mb-3 text-4xl text-red-500" />
            <h3 className="text-lg font-semibold">Error Loading Scholarships</h3>
          </div>
        )}
      </div>

      <ScholarshipModal s={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
