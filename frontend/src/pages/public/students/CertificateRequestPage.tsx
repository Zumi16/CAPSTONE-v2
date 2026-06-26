import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatLongDate } from "@/lib/format";

const COURSES = [
  ["BSIT", "BS Information Technology"],
  ["BSCE", "BS Computer Engineering"],
  ["BSOA", "BS Office Administration"],
  ["BSHM", "BS Hospitality Management"],
];
const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const CERTIFICATE_TYPES = [
  ["no_id", "Certificate of No ID"],
  ["clearance", "Clearance from Admin"],
  ["gres_form", "GRES Form"],
  ["no_pending_obligation", "Certificate of No Pending Obligation"],
];

const EMPTY_FORM = {
  fullName: "",
  studentNumber: "",
  course: "",
  yearLevel: "",
  section: "",
  certificateType: "",
  reason: "",
  contactEmail: "",
  contactNumber: "",
};

const labelClass = "mb-1 block text-sm font-medium text-gray-700";
const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20";

function certificateTypeLabel(type: string): string {
  return CERTIFICATE_TYPES.find(([value]) => value === type)?.[1] ?? type;
}

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Your request is being processed. Please check back later.",
  generated: "Your certificate has been generated and is ready for printing.",
  printed: "Your certificate has been printed and is being prepared for release.",
  released: "Your certificate is ready for pickup. Please visit the office.",
};

type RequestRecord = {
  request_number: string;
  created_at: string;
  full_name: string;
  student_number: string;
  certificate_type: string;
  status: string;
  reason: string;
  admin_remarks?: string | null;
};

type ActivityLog = {
  action: string;
  performed_by: string;
  remarks?: string | null;
  created_at: string;
};

export function CertificateRequestPage() {
  const [tab, setTab] = useState<"request" | "track">("request");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [successNumber, setSuccessNumber] = useState<string | null>(null);

  const [trackNumber, setTrackNumber] = useState("");
  const [tracking, setTracking] = useState(false);
  const [result, setResult] = useState<{
    request: RequestRecord;
    activityLogs: ActivityLog[];
  } | null>(null);

  const update = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.fullName ||
      !form.studentNumber ||
      !form.course ||
      !form.yearLevel ||
      !form.certificateType ||
      !form.reason
    ) {
      window.alert("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post<{ success: boolean; requestNumber: string }>(
        "/api/certificate-requests/submit",
        { ...form, section: form.section || null },
      );
      setSuccessNumber(data.requestNumber);
      setForm({ ...EMPTY_FORM });
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const closeSuccess = () => {
    const number = successNumber;
    setSuccessNumber(null);
    setTab("track");
    if (number) setTrackNumber(number);
  };

  const handleTrack = async (event: FormEvent) => {
    event.preventDefault();
    if (!trackNumber.trim()) {
      window.alert("Please enter a request number");
      return;
    }
    setTracking(true);
    setResult(null);
    try {
      const data = await api.get<{
        success: boolean;
        request: RequestRecord;
        activityLogs: ActivityLog[];
      }>(`/api/certificate-requests/status/${trackNumber.trim()}`);
      setResult({ request: data.request, activityLogs: data.activityLogs });
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "Request not found");
    } finally {
      setTracking(false);
    }
  };

  return (
    <main className="bg-gray-50">
      <div className="bg-gradient-to-r from-red-900 to-red-700 px-4 py-10 text-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <img src="/assets/images/PUPLogo.webp" alt="PUP Logo" className="h-14 w-14" />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Digital Certificate Request</h1>
            <p className="text-sm text-white/90">
              Polytechnic University of the Philippines - Parañaque Campus
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {(["request", "track"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium transition",
                tab === t
                  ? "border-maroon text-maroon"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              <i className={t === "request" ? "fa-solid fa-file-circle-plus" : "fa-solid fa-magnifying-glass"} />
              {t === "request" ? "Submit Request" : "Track Status"}
            </button>
          ))}
        </div>

        {tab === "request" ? (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-gray-700">
              <i className="fa-solid fa-circle-info mt-0.5 text-blue-500" />
              <div>
                <strong>Important:</strong> Complete all required fields accurately.
                Your request will be processed within 2-3 business days.
              </div>
            </div>

            <fieldset>
              <legend className="mb-3 text-lg font-semibold text-gray-800">
                <i className="fa-solid fa-user text-maroon" /> Student Information
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input className={inputClass} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="e.g., Juan Dela Cruz" />
                </div>
                <div>
                  <label className={labelClass}>Student Number *</label>
                  <input className={inputClass} value={form.studentNumber} onChange={(e) => update("studentNumber", e.target.value)} placeholder="e.g., 2021-12345-PR-0" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Course/Program *</label>
                  <select className={inputClass} value={form.course} onChange={(e) => update("course", e.target.value)}>
                    <option value="">Select Course</option>
                    {COURSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Year Level *</label>
                  <select className={inputClass} value={form.yearLevel} onChange={(e) => update("yearLevel", e.target.value)}>
                    <option value="">Select Year</option>
                    {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Section</label>
                  <input className={inputClass} value={form.section} onChange={(e) => update("section", e.target.value)} placeholder="e.g., A, B, 1" />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-lg font-semibold text-gray-800">
                <i className="fa-solid fa-certificate text-maroon" /> Certificate Details
              </legend>
              <div>
                <label className={labelClass}>Certificate Type *</label>
                <select className={inputClass} value={form.certificateType} onChange={(e) => update("certificateType", e.target.value)}>
                  <option value="">Select Certificate Type</option>
                  {CERTIFICATE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="mt-4">
                <label className={labelClass}>Reason for Request *</label>
                <textarea className={inputClass} rows={4} maxLength={500} value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder="Please explain why you need this certificate..." />
                <span className="text-xs text-gray-400">{form.reason.length}/500</span>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-lg font-semibold text-gray-800">
                <i className="fa-solid fa-address-book text-maroon" /> Contact Information
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" className={inputClass} value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} placeholder="your.email@example.com" />
                </div>
                <div>
                  <label className={labelClass}>Contact Number</label>
                  <input type="tel" className={inputClass} value={form.contactNumber} onChange={(e) => update("contactNumber", e.target.value)} placeholder="09XXXXXXXXX" />
                </div>
              </div>
            </fieldset>

            <div className="flex flex-col justify-end gap-3 sm:flex-row">
              <button type="reset" onClick={() => setForm({ ...EMPTY_FORM })} className="rounded-md border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 hover:bg-gray-50">
                <i className="fa-solid fa-rotate-left" /> Clear Form
              </button>
              <button type="submit" disabled={submitting} className="rounded-md bg-maroon px-6 py-2.5 font-semibold text-white hover:bg-brand-light disabled:opacity-60">
                <i className="fa-solid fa-paper-plane" /> {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-gray-700">
              <i className="fa-solid fa-circle-info mt-0.5 text-blue-500" />
              <div>
                <strong>How to track:</strong> Enter your request number (e.g.,
                CERT-20250115-0001) to check the status of your request.
              </div>
            </div>

            <form onSubmit={handleTrack} className="flex flex-col gap-2 sm:flex-row">
              <input
                className={inputClass}
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
                placeholder="Enter Request Number (e.g., CERT-20250115-0001)"
              />
              <button type="submit" disabled={tracking} className="rounded-md bg-maroon px-6 py-2.5 font-semibold text-white hover:bg-brand-light disabled:opacity-60">
                <i className="fa-solid fa-search" /> {tracking ? "Searching..." : "Track Status"}
              </button>
            </form>

            {result && (
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Request Details</h3>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-medium capitalize text-maroon">
                    {result.request.status}
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Detail label="Request Number" value={result.request.request_number} bold />
                  <Detail label="Date Submitted" value={formatLongDate(result.request.created_at)} />
                  <Detail label="Student Name" value={result.request.full_name} />
                  <Detail label="Student Number" value={result.request.student_number} />
                  <Detail label="Certificate Type" value={certificateTypeLabel(result.request.certificate_type)} />
                  <Detail label="Current Status" value={result.request.status} />
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-gray-500">Reason for Request</dt>
                    <dd className="text-gray-800">{result.request.reason}</dd>
                  </div>
                  {result.request.admin_remarks && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-gray-500">Admin Remarks</dt>
                      <dd className="text-gray-800">{result.request.admin_remarks}</dd>
                    </div>
                  )}
                </dl>

                {result.activityLogs.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 font-semibold">Activity Timeline</h4>
                    <ol className="space-y-3 border-l-2 border-gray-200 pl-4">
                      {result.activityLogs.map((log, i) => (
                        <li key={i}>
                          <div className="font-medium uppercase text-maroon">{log.action}</div>
                          <div className="text-sm text-gray-600">
                            {log.performed_by}
                            {log.remarks ? ` - ${log.remarks}` : ""}
                          </div>
                          <div className="text-xs text-gray-400">{formatLongDate(log.created_at)}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <p className="mt-6 border-t pt-4 text-center text-sm text-gray-600">
                  {STATUS_MESSAGES[result.request.status]}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success modal */}
      {successNumber && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
            <i className="fa-solid fa-circle-check text-5xl text-green-600" />
            <h2 className="mt-4 text-2xl font-bold">Request Submitted!</h2>
            <p className="mt-2 text-gray-600">Your request number is:</p>
            <p className="my-2 text-xl font-bold text-maroon">{successNumber}</p>
            <p className="text-sm text-gray-600">
              Please save this number to track your request status.
            </p>
            <button onClick={closeSuccess} className="mt-6 rounded-md bg-maroon px-6 py-2.5 font-semibold text-white hover:bg-brand-light">
              Track My Request
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Detail({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className={cx("text-gray-800", bold && "font-bold")}>{value}</dd>
    </div>
  );
}
