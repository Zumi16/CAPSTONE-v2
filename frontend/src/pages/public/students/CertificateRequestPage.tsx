import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatLongDate } from "@/lib/format";
import "@/styles/pages/certificate-request.css";

const COURSES = [
  ["BSIT", "BS Information Technology"],
  ["BSCE", "BS Computer Engineering"],
  ["BSOA", "BS Office Administration"],
  ["BSHM", "BS Hospitality Management"],
];

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const CERTIFICATE_TYPES = [
  ["no_id", "Certificate of No ID"],
  ["no_pending_obligation", "Certificate of No Pending Obligation"],
];

const PURPOSE_OPTIONS = [
  ["scholarship", "Scholarship"],
  ["employment", "Employment"],
  ["legal", "Legal/Court Proceedings"],
  ["government", "Government Agency/Official"],
  ["personal", "Personal Use"],
  ["other", "Other (Please Specify)"],
];

const EMPTY_FORM = {
  fullName: "",
  studentNumber: "",
  course: "",
  yearLevel: "",
  section: "",
  certificateType: "",
  certificatePurpose: "",
  reason: "",
  contactEmail: "",
  contactNumber: "",
};

function certificateTypeLabel(type: string): string {
  return CERTIFICATE_TYPES.find(([value]) => value === type)?.[1] ?? type;
}

function statusMessage(status: string) {
  const messages: Record<string, JSX.Element> = {
    pending: (
      <p style={{ color: "#856404" }}>
        <i className="fa-solid fa-clock" /> Your request is being processed.
        Please check back later.
      </p>
    ),
    generated: (
      <p style={{ color: "#0c5460" }}>
        <i className="fa-solid fa-file-circle-check" /> Your certificate has been
        generated and is ready for printing.
      </p>
    ),
    printed: (
      <p style={{ color: "#004085" }}>
        <i className="fa-solid fa-print" /> Your certificate has been printed and
        is being prepared for release.
      </p>
    ),
    released: (
      <p style={{ color: "#155724" }}>
        <i className="fa-solid fa-check-double" /> Your certificate is ready for
        pickup. Please visit the office.
      </p>
    ),
  };
  return messages[status] ?? null;
}

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
      !form.certificatePurpose ||
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
      const message =
        error instanceof ApiError ? error.message : "Failed to submit request";
      window.alert(message);
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
      const message =
        error instanceof ApiError ? error.message : "Request not found";
      window.alert(message);
    } finally {
      setTracking(false);
    }
  };

  const reasonLength = form.reason.length;

  return (
    <main className="request-page">
      <div className="page-header">
        <div className="header-content">
          <img
            src="/assets/images/PUPLogo.webp"
            alt="PUP Logo"
            className="pup-logo"
          />
          <div className="header-text">
            <h1>Digital Certificate Request</h1>
            <p>Polytechnic University of the Philippines - Parañaque Campus</p>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="tab-container">
          <button
            className={cx("tab-btn", tab === "request" && "active")}
            onClick={() => setTab("request")}
          >
            <i className="fa-solid fa-file-circle-plus" /> Submit Request
          </button>
          <button
            className={cx("tab-btn", tab === "track" && "active")}
            onClick={() => setTab("track")}
          >
            <i className="fa-solid fa-magnifying-glass" /> Track Status
          </button>
        </div>

        {/* Submit Request tab */}
        <div className={cx("tab-content", tab === "request" && "active")}>
          <div className="info-box">
            <i className="fa-solid fa-circle-info" />
            <div>
              <strong>Important:</strong> Complete all required fields
              accurately. Your request will be processed within 2-3 business
              days.
            </div>
          </div>

          <form className="request-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>
                <i className="fa-solid fa-user" /> Student Information
              </h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="e.g., Juan Dela Cruz"
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="studentNumber">Student Number *</label>
                  <input
                    id="studentNumber"
                    type="text"
                    placeholder="e.g., 2021-12345-PR-0"
                    value={form.studentNumber}
                    onChange={(e) => update("studentNumber", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course">Course/Program *</label>
                  <select
                    id="course"
                    value={form.course}
                    onChange={(e) => update("course", e.target.value)}
                  >
                    <option value="">Select Course</option>
                    {COURSES.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="yearLevel">Year Level *</label>
                  <select
                    id="yearLevel"
                    value={form.yearLevel}
                    onChange={(e) => update("yearLevel", e.target.value)}
                  >
                    <option value="">Select Year</option>
                    {YEAR_LEVELS.map((year) => (
                      <option value={year} key={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="section">Section</label>
                  <input
                    id="section"
                    type="text"
                    placeholder="e.g., A, B, 1"
                    value={form.section}
                    onChange={(e) => update("section", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>
                <i className="fa-solid fa-certificate" /> Certificate Details
              </h2>
              <div className="form-group">
                <label htmlFor="certificateType">Certificate Type *</label>
                <select
                  id="certificateType"
                  value={form.certificateType}
                  onChange={(e) => update("certificateType", e.target.value)}
                >
                  <option value="">Select Certificate Type</option>
                  {CERTIFICATE_TYPES.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="certificatePurpose">Purpose of Certificate *</label>
                <select
                  id="certificatePurpose"
                  value={form.certificatePurpose}
                  onChange={(e) => update("certificatePurpose", e.target.value)}
                >
                  <option value="">Select Purpose</option>
                  {PURPOSE_OPTIONS.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="reason">Reason for Request *</label>
                <textarea
                  id="reason"
                  rows={4}
                  maxLength={500}
                  placeholder="Please explain why you need this certificate..."
                  value={form.reason}
                  onChange={(e) => update("reason", e.target.value)}
                />
                <span className="char-count">{reasonLength}/500</span>
              </div>
            </div>

            <div className="form-section">
              <h2>
                <i className="fa-solid fa-address-book" /> Contact Information
              </h2>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactEmail">Email Address</label>
                  <input
                    id="contactEmail"
                    type="email"
                    placeholder="your.email@example.com"
                    value={form.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contactNumber">Contact Number</label>
                  <input
                    id="contactNumber"
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    value={form.contactNumber}
                    onChange={(e) => update("contactNumber", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="reset"
                className="btn btn-secondary"
                onClick={() => setForm({ ...EMPTY_FORM })}
              >
                <i className="fa-solid fa-rotate-left" /> Clear Form
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <i className="fa-solid fa-paper-plane" />{" "}
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>

        {/* Track Status tab */}
        <div className={cx("tab-content", tab === "track" && "active")}>
          <div className="info-box">
            <i className="fa-solid fa-circle-info" />
            <div>
              <strong>How to track:</strong> Enter your request number (e.g.,
              CERT-20250115-0001) to check the status of your certificate
              request.
            </div>
          </div>

          <div className="track-form-container">
            <form className="track-form" onSubmit={handleTrack}>
              <div className="form-group-inline">
                <input
                  type="text"
                  placeholder="Enter Request Number (e.g., CERT-20250115-0001)"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={tracking}>
                  <i className="fa-solid fa-search" />{" "}
                  {tracking ? "Searching..." : "Track Status"}
                </button>
              </div>
            </form>

            {result && (
              <div className="status-result" style={{ display: "block" }}>
                <div className="status-header">
                  <h3>Request Details</h3>
                  <span className={cx("status-badge", `status-${result.request.status}`)}>
                    {result.request.status}
                  </span>
                </div>

                <div className="status-detail-grid">
                  <Detail label="Request Number">
                    <strong>{result.request.request_number}</strong>
                  </Detail>
                  <Detail label="Control Number">
                    <strong style={{ color: "#0c5460" }}>{result.request.control_number}</strong>
                    <small style={{ display: "block", color: "#666", marginTop: "5px" }}>
                      For verification and authenticity
                    </small>
                  </Detail>
                  <Detail label="Date Submitted">
                    {formatLongDate(result.request.created_at)}
                  </Detail>
                  <Detail label="Student Name">{result.request.full_name}</Detail>
                  <Detail label="Student Number">
                    {result.request.student_number}
                  </Detail>
                  <Detail label="Certificate Type">
                    {certificateTypeLabel(result.request.certificate_type)}
                  </Detail>
                  <Detail label="Certificate Purpose">
                    {result.request.certificate_purpose}
                  </Detail>
                  <Detail label="Current Status">{result.request.status}</Detail>
                  <div className="status-detail-item status-detail-full">
                    <span className="status-label">Reason for Request</span>
                    <span className="status-value reason">
                      {result.request.reason}
                    </span>
                  </div>
                  {result.request.admin_remarks && (
                    <div className="status-detail-item status-detail-full">
                      <span className="status-label">Admin Remarks</span>
                      <span className="status-value">
                        {result.request.admin_remarks}
                      </span>
                    </div>
                  )}
                </div>

                {result.activityLogs.length > 0 && (
                  <div className="status-timeline">
                    <h4>Activity Timeline</h4>
                    {result.activityLogs.map((log, index) => (
                      <div className="timeline-item" key={index}>
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-action">
                            {log.action.toUpperCase()}
                          </div>
                          <div className="timeline-details">
                            {log.performed_by}
                            {log.remarks ? ` - ${log.remarks}` : ""}
                          </div>
                          <div className="timeline-time">
                            {formatLongDate(log.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 25,
                    paddingTop: 20,
                    borderTop: "2px solid #f0f0f0",
                    textAlign: "center",
                  }}
                >
                  {statusMessage(result.request.status)}

                  {(result.request.status === 'generated' || result.request.status === 'released') &&
                    result.request.certificate_file_path && (
                    <div style={{ marginTop: 20 }}>
                      <a
                        href={result.request.certificate_file_path}
                        download
                        className="btn btn-primary"
                        style={{ textDecoration: 'none', display: 'inline-block' }}
                      >
                        <i className="fa-solid fa-download" /> Download Certificate
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success modal */}
      {successNumber && (
        <div className="modal show" id="successModal">
          <div className="modal-content">
            <i
              className="fa-solid fa-circle-check"
              style={{ fontSize: 56, color: "#155724" }}
            />
            <h2>Request Submitted!</h2>
            <p>Your request number is:</p>
            <p className="request-number-display">
              <strong>{successNumber}</strong>
            </p>
            <p>Please save this number to track your request status.</p>
            <button className="btn btn-primary" onClick={closeSuccess}>
              Track My Request
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="status-detail-item">
      <span className="status-label">{label}</span>
      <span className="status-value">{children}</span>
    </div>
  );
}
