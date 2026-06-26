import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatLongDate } from "@/lib/format";
import "@/styles/pages/feedback.css";
import { StarRating } from "./StarRating";

const HERO_BG = "/assets/images/PUPBg4.jpg";

const STUDENT_DEPARTMENTS = [
  "Registrar",
  "Cashier",
  "Library",
  "Student Affairs",
  "Clinic",
  "Admission Office",
];

const VISITOR_DEPARTMENTS = [
  ["1", "Registrar"],
  ["2", "Cashier"],
  ["3", "Library"],
  ["4", "Student Affairs"],
  ["5", "Clinic"],
  ["6", "Admission Office"],
];

const SERVICE_TYPES = [
  ["Inquiry", "General Inquiry"],
  ["Application", "Application"],
  ["Document Request", "Document Request"],
  ["Campus Tour", "Campus Tour"],
  ["Meeting", "Meeting/Appointment"],
  ["Event", "Event/Activity"],
  ["Other", "Other"],
];

const RATING_LABELS: Record<number, string> = {
  5: "Excellent",
  4: "Good",
  3: "Average",
  2: "Poor",
  1: "Very Poor",
};

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
  overall_rating: null,
  processing_time: null,
  staff_assistance: null,
  clarity: null,
  facility: null,
};

function allRated(r: Ratings): boolean {
  return Object.values(r).every((v) => v !== null);
}

function isCommentAppropriate(text: string): boolean {
  const profanity = ["badword1", "badword2", "badword3"];
  const lower = text.toLowerCase();
  return !profanity.some((word) => lower.includes(word));
}

/** The overall star rating + 4 criteria rows, shared by both forms. */
function RatingsSection({
  prefix,
  ratings,
  setRatings,
}: {
  prefix: string;
  ratings: Ratings;
  setRatings: (next: Ratings) => void;
}) {
  const overall = ratings.overall_rating;
  return (
    <>
      <div className="form-group">
        <label className="form-label rating-label">
          <i className="fas fa-star" /> Overall Rating
        </label>
        <StarRating
          name={`${prefix}_overall_rating`}
          value={overall}
          onChange={(v) => setRatings({ ...ratings, overall_rating: v })}
        />
        <p
          className="rating-text"
          style={{
            color: overall
              ? overall >= 4
                ? "#4caf50"
                : overall === 3
                  ? "#ff9800"
                  : "#c62828"
              : undefined,
          }}
        >
          {overall ? RATING_LABELS[overall] : "Select a rating"}
        </p>
      </div>

      <div className="criteria-section">
        <h3 className="criteria-title">Rate Each Service Aspect</h3>
        {CRITERIA.map((criterion) => (
          <div className="criteria-item" key={criterion.key}>
            <label className="criteria-label">
              <i className={cx("fas", criterion.icon)} /> {criterion.label}
            </label>
            <StarRating
              name={`${prefix}_${criterion.key}`}
              size="small"
              value={ratings[criterion.key]}
              onChange={(v) => setRatings({ ...ratings, [criterion.key]: v })}
            />
          </div>
        ))}
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
  const [success, setSuccess] = useState<{ id: string; time: string } | null>(
    null,
  );

  // Student state
  const [validation, setValidation] = useState({
    transaction_id: "",
    student_number: "",
    department: "",
  });
  const [validated, setValidated] = useState<ValidatedTransaction | null>(null);
  const [studentRatings, setStudentRatings] = useState<Ratings>({ ...EMPTY_RATINGS });
  const [studentComments, setStudentComments] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  // Visitor state
  const [visitor, setVisitor] = useState({
    visitor_name: "",
    visitor_email: "",
    visitor_phone: "",
    department_id: "",
    service_type: "",
    visit_date: "",
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
        "/api/feedback/validate",
        validation,
      );
      if (result.success) setValidated(result.transaction);
      else window.alert(result.message || "Transaction not found or not eligible.");
    } catch (error) {
      window.alert(
        error instanceof ApiError ? error.message : "An error occurred during validation.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStudentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validated) return;
    if (!allRated(studentRatings)) {
      window.alert("Please rate all service aspects before submitting.");
      return;
    }
    if (studentComments && !isCommentAppropriate(studentComments)) {
      window.alert("Your comment contains inappropriate language. Please revise.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.post<{ success: boolean; feedback_id: string; message?: string }>(
        "/api/feedback",
        {
          transaction_id: validated.transaction_id,
          student_number: validated.student_number,
          department_id: validated.department_id,
          ...studentRatings,
          comments: studentComments || null,
          is_anonymous: anonymous,
        },
      );
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
    if (!allRated(visitorRatings)) {
      window.alert("Please rate all service aspects before submitting.");
      return;
    }
    if (visitorComments && !isCommentAppropriate(visitorComments)) {
      window.alert("Your comment contains inappropriate language. Please revise.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.post<{ success: boolean; feedback_id: string; message?: string }>(
        "/api/feedback/visitor",
        {
          ...visitor,
          visitor_email: visitor.visitor_email || null,
          visitor_phone: visitor.visitor_phone || null,
          department_id: parseInt(visitor.department_id, 10),
          ...visitorRatings,
          comments: visitorComments || null,
        },
      );
      if (result.success) showSuccess(result.feedback_id);
      else window.alert(result.message || "Failed to submit feedback.");
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "An error occurred.");
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="main">
      <section className="hero-section" style={{ backgroundImage: `url('${HERO_BG}')` }}>
        <div className="hero-content">
          <h1 className="hero-title">Service Feedback</h1>
        </div>
      </section>

      <section className="form-section">
        <div className="container">
          {/* Success step */}
          {success ? (
            <div className="form-container" id="successStep" style={{ display: "block" }}>
              <div className="form-header">
                <i className="fas fa-check-circle form-icon" style={{ color: "#4caf50" }} />
                <h2 className="form-title">Thank You for Your Feedback!</h2>
                <p className="form-subtitle">Your response has been recorded.</p>
              </div>
              <div className="transaction-info">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Reference:</span>
                    <span className="info-value">{success.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Submitted:</span>
                    <span className="info-value">{success.time}</span>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSuccess(null);
                  setValidated(null);
                  setValidation({ transaction_id: "", student_number: "", department: "" });
                  setStudentRatings({ ...EMPTY_RATINGS });
                  setStudentComments("");
                  setVisitorRatings({ ...EMPTY_RATINGS });
                }}
              >
                Submit Another Response
              </button>
            </div>
          ) : (
            <>
              <div className="feedback-tabs">
                <button
                  className={cx("tab-button", tab === "student" && "active")}
                  onClick={() => setTab("student")}
                >
                  <i className="fas fa-user-graduate" /> PUP Parañaque Student
                </button>
                <button
                  className={cx("tab-button", tab === "visitor" && "active")}
                  onClick={() => setTab("visitor")}
                >
                  <i className="fas fa-user-friends" /> Visitor / Guest
                </button>
              </div>

              {/* STUDENT */}
              {tab === "student" &&
                (!validated ? (
                  <div className="form-container">
                    <div className="form-header">
                      <i className="fas fa-shield-alt form-icon" />
                      <h2 className="form-title">Verify Your Transaction</h2>
                      <p className="form-subtitle">
                        Please enter your transaction details to provide feedback
                      </p>
                    </div>
                    <form className="feedback-form" onSubmit={handleValidate}>
                      <div className="form-group">
                        <label className="form-label">
                          <i className="fas fa-receipt" /> Transaction ID / Reference Number
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g., TXN-2026-001240"
                          required
                          value={validation.transaction_id}
                          onChange={(e) =>
                            setValidation({ ...validation, transaction_id: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <i className="fas fa-id-card" /> Student Number
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g., 2021-12345-PQ-0"
                          required
                          value={validation.student_number}
                          onChange={(e) =>
                            setValidation({ ...validation, student_number: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <i className="fas fa-building" /> Department
                        </label>
                        <select
                          className="form-select"
                          required
                          value={validation.department}
                          onChange={(e) =>
                            setValidation({ ...validation, department: e.target.value })
                          }
                        >
                          <option value="">Select Department</option>
                          {STUDENT_DEPARTMENTS.map((dept) => (
                            <option value={dept} key={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={busy}>
                        <i className="fas fa-check-circle" />{" "}
                        {busy ? "Verifying..." : "Verify Transaction"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="form-container">
                    <div className="form-header">
                      <i className="fas fa-comment-dots form-icon" />
                      <h2 className="form-title">Share Your Experience</h2>
                      <p className="form-subtitle">Your feedback is valuable to us</p>
                    </div>

                    <div className="transaction-info">
                      <h3 className="info-title">Transaction Details</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Transaction ID:</span>
                          <span className="info-value">{validated.transaction_id}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Department:</span>
                          <span className="info-value">{validated.department_name}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Date:</span>
                          <span className="info-value">
                            {formatLongDate(validated.transaction_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <form className="feedback-form" onSubmit={handleStudentSubmit}>
                      <RatingsSection
                        prefix="student"
                        ratings={studentRatings}
                        setRatings={setStudentRatings}
                      />

                      <div className="form-group">
                        <label className="form-label">
                          <i className="fas fa-comment" /> Additional Comments (Optional)
                        </label>
                        <textarea
                          className="form-textarea"
                          rows={5}
                          maxLength={500}
                          placeholder="Share specific details about your experience..."
                          value={studentComments}
                          onChange={(e) => setStudentComments(e.target.value)}
                        />
                        <small className="form-help">{studentComments.length}/500 characters</small>
                      </div>

                      <div className="form-group">
                        <div className="checkbox-wrapper">
                          <input
                            type="checkbox"
                            id="studentAnonymousToggle"
                            className="form-checkbox"
                            checked={anonymous}
                            onChange={(e) => setAnonymous(e.target.checked)}
                          />
                          <label htmlFor="studentAnonymousToggle" className="checkbox-label">
                            <i className="fas fa-user-secret" /> Submit feedback anonymously
                          </label>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setValidated(null)}
                        >
                          <i className="fas fa-arrow-left" /> Back
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={busy}>
                          <i className="fas fa-paper-plane" />{" "}
                          {busy ? "Submitting..." : "Submit Feedback"}
                        </button>
                      </div>
                    </form>
                  </div>
                ))}

              {/* VISITOR */}
              {tab === "visitor" && (
                <div className="form-container">
                  <div className="form-header">
                    <i className="fas fa-comment-dots form-icon" />
                    <h2 className="form-title">Visitor Feedback</h2>
                    <p className="form-subtitle">Tell us about your visit</p>
                  </div>
                  <form className="feedback-form" onSubmit={handleVisitorSubmit}>
                    <div className="visitor-info">
                      <h4>
                        <i className="fas fa-id-badge" /> Your Information
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            <i className="fas fa-user" /> Full Name *
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Juan Dela Cruz"
                            required
                            value={visitor.visitor_name}
                            onChange={(e) =>
                              setVisitor({ ...visitor, visitor_name: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            <i className="fas fa-envelope" /> Email (Optional)
                          </label>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="your.email@example.com"
                            value={visitor.visitor_email}
                            onChange={(e) =>
                              setVisitor({ ...visitor, visitor_email: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            <i className="fas fa-phone" /> Contact Number (Optional)
                          </label>
                          <input
                            type="tel"
                            className="form-input"
                            placeholder="09XX-XXX-XXXX"
                            value={visitor.visitor_phone}
                            onChange={(e) =>
                              setVisitor({ ...visitor, visitor_phone: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            <i className="fas fa-calendar" /> Date of Visit *
                          </label>
                          <input
                            type="date"
                            className="form-input"
                            max={today}
                            required
                            value={visitor.visit_date}
                            onChange={(e) =>
                              setVisitor({ ...visitor, visit_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">
                          <i className="fas fa-building" /> Department Visited *
                        </label>
                        <select
                          className="form-select"
                          required
                          value={visitor.department_id}
                          onChange={(e) =>
                            setVisitor({ ...visitor, department_id: e.target.value })
                          }
                        >
                          <option value="">Select Department</option>
                          {VISITOR_DEPARTMENTS.map(([id, name]) => (
                            <option value={id} key={id}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          <i className="fas fa-concierge-bell" /> Purpose of Visit *
                        </label>
                        <select
                          className="form-select"
                          required
                          value={visitor.service_type}
                          onChange={(e) =>
                            setVisitor({ ...visitor, service_type: e.target.value })
                          }
                        >
                          <option value="">Select Purpose</option>
                          {SERVICE_TYPES.map(([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <RatingsSection
                      prefix="visitor"
                      ratings={visitorRatings}
                      setRatings={setVisitorRatings}
                    />

                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-comment" /> Additional Comments (Optional)
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={5}
                        maxLength={500}
                        placeholder="Share specific details about your experience..."
                        value={visitorComments}
                        onChange={(e) => setVisitorComments(e.target.value)}
                      />
                      <small className="form-help">{visitorComments.length}/500 characters</small>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      <i className="fas fa-paper-plane" />{" "}
                      {busy ? "Submitting..." : "Submit Feedback"}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
