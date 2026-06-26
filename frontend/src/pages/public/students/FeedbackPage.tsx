import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatLongDate } from "@/lib/format";
import { StarRating } from "./StarRating";

const HERO_BG = "/assets/images/PUPBg4.jpg";

const STUDENT_DEPARTMENTS = ["Registrar", "Cashier", "Library", "Student Affairs", "Clinic", "Admission Office"];
const VISITOR_DEPARTMENTS = [
  ["1", "Registrar"], ["2", "Cashier"], ["3", "Library"],
  ["4", "Student Affairs"], ["5", "Clinic"], ["6", "Admission Office"],
];
const SERVICE_TYPES = [
  ["Inquiry", "General Inquiry"], ["Application", "Application"],
  ["Document Request", "Document Request"], ["Campus Tour", "Campus Tour"],
  ["Meeting", "Meeting/Appointment"], ["Event", "Event/Activity"], ["Other", "Other"],
];
const RATING_LABELS: Record<number, string> = { 5: "Excellent", 4: "Good", 3: "Average", 2: "Poor", 1: "Very Poor" };
const CRITERIA = [
  { key: "processing_time", icon: "fa-clock", label: "Processing Time" },
  { key: "staff_assistance", icon: "fa-user-tie", label: "Staff Assistance" },
  { key: "clarity", icon: "fa-clipboard-list", label: "Clarity of Instructions" },
  { key: "facility", icon: "fa-door-open", label: "Facility Condition" },
] as const;

type Ratings = {
  overall_rating: number | null;
  processing_time: number | null;
  staff_assistance: number | null;
  clarity: number | null;
  facility: number | null;
};
const EMPTY_RATINGS: Ratings = {
  overall_rating: null, processing_time: null, staff_assistance: null, clarity: null, facility: null,
};

const labelClass = "mb-1 block text-sm font-medium text-gray-700";
const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20";

const allRated = (r: Ratings) => Object.values(r).every((v) => v !== null);
const isCommentAppropriate = (text: string) =>
  !["badword1", "badword2", "badword3"].some((w) => text.toLowerCase().includes(w));

function RatingsSection({ ratings, setRatings }: { ratings: Ratings; setRatings: (r: Ratings) => void }) {
  const overall = ratings.overall_rating;
  return (
    <>
      <div>
        <label className={cx(labelClass, "flex items-center gap-1.5")}>
          <i className="fas fa-star text-amber-400" /> Overall Rating
        </label>
        <StarRating value={overall} onChange={(v) => setRatings({ ...ratings, overall_rating: v })} />
        <p
          className={cx(
            "mt-1 text-sm font-medium",
            overall ? (overall >= 4 ? "text-green-600" : overall === 3 ? "text-amber-500" : "text-red-600") : "text-gray-400",
          )}
        >
          {overall ? RATING_LABELS[overall] : "Select a rating"}
        </p>
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="mb-3 font-semibold text-gray-800">Rate Each Service Aspect</h3>
        <div className="space-y-3">
          {CRITERIA.map((c) => (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between" key={c.key}>
              <label className="text-sm text-gray-700">
                <i className={cx("fas", c.icon, "text-maroon")} /> {c.label}
              </label>
              <StarRating size="small" value={ratings[c.key]} onChange={(v) => setRatings({ ...ratings, [c.key]: v })} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

type ValidatedTransaction = {
  transaction_id: string;
  student_number: string;
  department_id: number;
  department_name: string;
  transaction_date: string;
};

export function FeedbackPage() {
  const [tab, setTab] = useState<"student" | "visitor">("student");
  const [success, setSuccess] = useState<{ id: string; time: string } | null>(null);

  const [validation, setValidation] = useState({ transaction_id: "", student_number: "", department: "" });
  const [validated, setValidated] = useState<ValidatedTransaction | null>(null);
  const [studentRatings, setStudentRatings] = useState<Ratings>({ ...EMPTY_RATINGS });
  const [studentComments, setStudentComments] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  const [visitor, setVisitor] = useState({
    visitor_name: "", visitor_email: "", visitor_phone: "", department_id: "", service_type: "", visit_date: "",
  });
  const [visitorRatings, setVisitorRatings] = useState<Ratings>({ ...EMPTY_RATINGS });
  const [visitorComments, setVisitorComments] = useState("");

  const showSuccess = (id: string) => {
    setSuccess({ id, time: formatLongDate(new Date()) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleValidate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await api.post<{ success: boolean; transaction: ValidatedTransaction; message?: string }>(
        "/api/feedback/validate", validation,
      );
      if (result.success) setValidated(result.transaction);
      else window.alert(result.message || "Transaction not found or not eligible.");
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "An error occurred during validation.");
    } finally {
      setBusy(false);
    }
  };

  const handleStudentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validated) return;
    if (!allRated(studentRatings)) return void window.alert("Please rate all service aspects before submitting.");
    if (studentComments && !isCommentAppropriate(studentComments))
      return void window.alert("Your comment contains inappropriate language. Please revise.");
    setBusy(true);
    try {
      const result = await api.post<{ success: boolean; feedback_id: string; message?: string }>("/api/feedback", {
        transaction_id: validated.transaction_id,
        student_number: validated.student_number,
        department_id: validated.department_id,
        ...studentRatings,
        comments: studentComments || null,
        is_anonymous: anonymous,
      });
      if (result.success) showSuccess(result.feedback_id);
      else window.alert(result.message || "Failed to submit feedback.");
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "An error occurred.");
    } finally {
      setBusy(false);
    }
  };

  const handleVisitorSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRated(visitorRatings)) return void window.alert("Please rate all service aspects before submitting.");
    if (visitorComments && !isCommentAppropriate(visitorComments))
      return void window.alert("Your comment contains inappropriate language. Please revise.");
    setBusy(true);
    try {
      const result = await api.post<{ success: boolean; feedback_id: string; message?: string }>("/api/feedback/visitor", {
        ...visitor,
        visitor_email: visitor.visitor_email || null,
        visitor_phone: visitor.visitor_phone || null,
        department_id: parseInt(visitor.department_id, 10),
        ...visitorRatings,
        comments: visitorComments || null,
      });
      if (result.success) showSuccess(result.feedback_id);
      else window.alert(result.message || "Failed to submit feedback.");
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "An error occurred.");
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const card = "rounded-xl bg-white p-6 shadow-sm";

  return (
    <main className="bg-gray-50">
      <section
        className="relative flex min-h-[220px] items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="w-full bg-black/70 px-6 py-12 text-center text-white">
          <h1 className="text-3xl font-bold sm:text-4xl">Service Feedback</h1>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-10">
        {success ? (
          <div className={cx(card, "text-center")}>
            <i className="fas fa-check-circle text-5xl text-green-600" />
            <h2 className="mt-4 text-2xl font-bold">Thank You for Your Feedback!</h2>
            <p className="mt-2 text-gray-600">Your response has been recorded.</p>
            <div className="mx-auto mt-4 max-w-xs rounded-lg bg-gray-50 p-4 text-left text-sm">
              <p><span className="text-gray-500">Reference:</span> <strong>{success.id}</strong></p>
              <p><span className="text-gray-500">Submitted:</span> {success.time}</p>
            </div>
            <button
              onClick={() => {
                setSuccess(null);
                setValidated(null);
                setValidation({ transaction_id: "", student_number: "", department: "" });
                setStudentRatings({ ...EMPTY_RATINGS });
                setStudentComments("");
                setVisitorRatings({ ...EMPTY_RATINGS });
              }}
              className="mt-6 rounded-md bg-maroon px-6 py-2.5 font-semibold text-white hover:bg-brand-light"
            >
              Submit Another Response
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex gap-2 border-b border-gray-200">
              {(["student", "visitor"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cx(
                    "flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium transition",
                    tab === t ? "border-maroon text-maroon" : "border-transparent text-gray-500 hover:text-gray-700",
                  )}
                >
                  <i className={t === "student" ? "fas fa-user-graduate" : "fas fa-user-friends"} />
                  {t === "student" ? "PUP Parañaque Student" : "Visitor / Guest"}
                </button>
              ))}
            </div>

            {/* STUDENT */}
            {tab === "student" &&
              (!validated ? (
                <form onSubmit={handleValidate} className={cx(card, "space-y-5")}>
                  <div className="text-center">
                    <i className="fas fa-shield-alt text-3xl text-maroon" />
                    <h2 className="mt-2 text-xl font-bold">Verify Your Transaction</h2>
                    <p className="text-sm text-gray-600">Enter your transaction details to provide feedback</p>
                  </div>
                  <div>
                    <label className={labelClass}><i className="fas fa-receipt" /> Transaction ID / Reference Number</label>
                    <input className={inputClass} required value={validation.transaction_id}
                      onChange={(e) => setValidation({ ...validation, transaction_id: e.target.value })} placeholder="e.g., TXN-2026-001240" />
                  </div>
                  <div>
                    <label className={labelClass}><i className="fas fa-id-card" /> Student Number</label>
                    <input className={inputClass} required value={validation.student_number}
                      onChange={(e) => setValidation({ ...validation, student_number: e.target.value })} placeholder="e.g., 2021-12345-PQ-0" />
                  </div>
                  <div>
                    <label className={labelClass}><i className="fas fa-building" /> Department</label>
                    <select className={inputClass} required value={validation.department}
                      onChange={(e) => setValidation({ ...validation, department: e.target.value })}>
                      <option value="">Select Department</option>
                      {STUDENT_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={busy} className="w-full rounded-md bg-maroon py-3 font-semibold text-white hover:bg-brand-light disabled:opacity-60">
                    <i className="fas fa-check-circle" /> {busy ? "Verifying..." : "Verify Transaction"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleStudentSubmit} className={cx(card, "space-y-5")}>
                  <div className="text-center">
                    <i className="fas fa-comment-dots text-3xl text-maroon" />
                    <h2 className="mt-2 text-xl font-bold">Share Your Experience</h2>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-sm">
                    <p><span className="text-gray-500">Transaction ID:</span> {validated.transaction_id}</p>
                    <p><span className="text-gray-500">Department:</span> {validated.department_name}</p>
                    <p><span className="text-gray-500">Date:</span> {formatLongDate(validated.transaction_date)}</p>
                  </div>

                  <RatingsSection ratings={studentRatings} setRatings={setStudentRatings} />

                  <div>
                    <label className={labelClass}><i className="fas fa-comment" /> Additional Comments (Optional)</label>
                    <textarea className={inputClass} rows={4} maxLength={500} value={studentComments}
                      onChange={(e) => setStudentComments(e.target.value)} placeholder="Share specific details..." />
                    <span className="text-xs text-gray-400">{studentComments.length}/500</span>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-maroon" />
                    <i className="fas fa-user-secret" /> Submit feedback anonymously
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => setValidated(null)} className="rounded-md border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-arrow-left" /> Back
                    </button>
                    <button type="submit" disabled={busy} className="flex-1 rounded-md bg-maroon py-2.5 font-semibold text-white hover:bg-brand-light disabled:opacity-60">
                      <i className="fas fa-paper-plane" /> {busy ? "Submitting..." : "Submit Feedback"}
                    </button>
                  </div>
                </form>
              ))}

            {/* VISITOR */}
            {tab === "visitor" && (
              <form onSubmit={handleVisitorSubmit} className={cx(card, "space-y-5")}>
                <div className="text-center">
                  <i className="fas fa-comment-dots text-3xl text-maroon" />
                  <h2 className="mt-2 text-xl font-bold">Visitor Feedback</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input className={inputClass} required value={visitor.visitor_name}
                      onChange={(e) => setVisitor({ ...visitor, visitor_name: e.target.value })} placeholder="Juan Dela Cruz" />
                  </div>
                  <div>
                    <label className={labelClass}>Email (Optional)</label>
                    <input type="email" className={inputClass} value={visitor.visitor_email}
                      onChange={(e) => setVisitor({ ...visitor, visitor_email: e.target.value })} placeholder="your.email@example.com" />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Number (Optional)</label>
                    <input type="tel" className={inputClass} value={visitor.visitor_phone}
                      onChange={(e) => setVisitor({ ...visitor, visitor_phone: e.target.value })} placeholder="09XX-XXX-XXXX" />
                  </div>
                  <div>
                    <label className={labelClass}>Date of Visit *</label>
                    <input type="date" className={inputClass} required max={today} value={visitor.visit_date}
                      onChange={(e) => setVisitor({ ...visitor, visit_date: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Department Visited *</label>
                    <select className={inputClass} required value={visitor.department_id}
                      onChange={(e) => setVisitor({ ...visitor, department_id: e.target.value })}>
                      <option value="">Select Department</option>
                      {VISITOR_DEPARTMENTS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Purpose of Visit *</label>
                    <select className={inputClass} required value={visitor.service_type}
                      onChange={(e) => setVisitor({ ...visitor, service_type: e.target.value })}>
                      <option value="">Select Purpose</option>
                      {SERVICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <RatingsSection ratings={visitorRatings} setRatings={setVisitorRatings} />

                <div>
                  <label className={labelClass}><i className="fas fa-comment" /> Additional Comments (Optional)</label>
                  <textarea className={inputClass} rows={4} maxLength={500} value={visitorComments}
                    onChange={(e) => setVisitorComments(e.target.value)} placeholder="Share specific details..." />
                  <span className="text-xs text-gray-400">{visitorComments.length}/500</span>
                </div>

                <button type="submit" disabled={busy} className="w-full rounded-md bg-maroon py-3 font-semibold text-white hover:bg-brand-light disabled:opacity-60">
                  <i className="fas fa-paper-plane" /> {busy ? "Submitting..." : "Submit Feedback"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
