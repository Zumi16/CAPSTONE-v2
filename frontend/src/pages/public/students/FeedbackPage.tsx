import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatLongDate } from "@/lib/format";
import "@/styles/pages/feedback.css";
import { StarRating } from "./StarRating";

const DEPARTMENTS = [
  ["1", "Registrar"],
  ["2", "Cashier"],
  ["3", "Library"],
  ["4", "Student Affairs"],
  ["5", "Clinic"],
  ["6", "Admission Office"],
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

export function FeedbackPage() {
  const [tab, setTab] = useState<"student" | "visitor">("student");
  const [success, setSuccess] = useState<{ id: string; time: string } | null>(
    null,
  );

  // Student state
  const [student, setStudent] = useState({
    submitter_name: "",
    submitter_email: "",
    submitter_phone: "",
    department_id: "",
  });
  const [studentIsAnonymous, setStudentIsAnonymous] = useState(false);
  const [studentRatings, setStudentRatings] = useState<Ratings>({ ...EMPTY_RATINGS });
  const [studentComments, setStudentComments] = useState("");
  const [busy, setBusy] = useState(false);

  // Visitor state
  const [visitor, setVisitor] = useState({
    submitter_name: "",
    submitter_email: "",
    submitter_phone: "",
    department_id: "",
  });
  const [visitorIsAnonymous, setVisitorIsAnonymous] = useState(false);
  const [visitorRatings, setVisitorRatings] = useState<Ratings>({ ...EMPTY_RATINGS });
  const [visitorComments, setVisitorComments] = useState("");

  const showSuccess = (id: string) => {
    setSuccess({ id, time: formatLongDate(new Date()) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStudentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRated(studentRatings)) {
      window.alert("Please rate all service aspects before submitting.");
      return;
    }
    if (!student.department_id) {
      window.alert("Please select a department.");
      return;
    }
    if (!studentIsAnonymous && !student.submitter_name) {
      window.alert("Please enter your name.");
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
          submitter_name: studentIsAnonymous ? null : student.submitter_name,
          submitter_email: studentIsAnonymous ? null : student.submitter_email || null,
          submitter_phone: studentIsAnonymous ? null : student.submitter_phone || null,
          department_id: parseInt(student.department_id, 10),
          ...studentRatings,
          comments: studentComments || null,
          is_anonymous: studentIsAnonymous,
          user_type: 'student'
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
    if (!visitor.department_id) {
      window.alert("Please select a department.");
      return;
    }
    if (!visitorIsAnonymous && !visitor.submitter_name) {
      window.alert("Please enter your name.");
      return;
    }
    if (visitorComments && !isCommentAppropriate(visitorComments)) {
      window.alert("Your comment contains inappropriate language. Please revise.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.post<{ success: boolean; feedback_id: string; message?: string }>(
        "/api/feedback",
        {
          submitter_name: visitorIsAnonymous ? null : visitor.submitter_name,
          submitter_email: visitorIsAnonymous ? null : visitor.submitter_email || null,
          submitter_phone: visitorIsAnonymous ? null : visitor.submitter_phone || null,
          department_id: parseInt(visitor.department_id, 10),
          ...visitorRatings,
          comments: visitorComments || null,
          is_anonymous: visitorIsAnonymous,
          user_type: 'visitor'
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

  return (
    <main className="main feedback-page">
      <div className="hero-banner">
        <div className="hero-overlay">
          <h1 className="hero-title">Service Feedback</h1>
          <p className="hero-subtitle">PUP Parañaque Campus</p>
        </div>
      </div>

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
                  setStudent({ submitter_name: "", submitter_email: "", submitter_phone: "", department_id: "" });
                  setStudentIsAnonymous(false);
                  setStudentRatings({ ...EMPTY_RATINGS });
                  setStudentComments("");
                  setVisitor({ submitter_name: "", submitter_email: "", submitter_phone: "", department_id: "" });
                  setVisitorIsAnonymous(false);
                  setVisitorRatings({ ...EMPTY_RATINGS });
                  setVisitorComments("");
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
              {tab === "student" && (
                <div className="form-container">
                  <div className="form-header">
                    <i className="fas fa-comment-dots form-icon" />
                    <h2 className="form-title">Student Feedback</h2>
                    <p className="form-subtitle">Your feedback is valuable to us</p>
                  </div>

                  <form className="feedback-form" onSubmit={handleStudentSubmit}>
                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-question-circle" /> How would you like to submit?
                      </label>
                      <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="submission_type"
                            checked={!studentIsAnonymous}
                            onChange={() => setStudentIsAnonymous(false)}
                          />
                          <span><i className="fas fa-user" /> With My Name</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="submission_type"
                            checked={studentIsAnonymous}
                            onChange={() => setStudentIsAnonymous(true)}
                          />
                          <span><i className="fas fa-user-secret" /> Anonymous</span>
                        </label>
                      </div>
                      <small className="form-help" style={{ marginTop: 10 }}>
                        {studentIsAnonymous
                          ? "Your identity will not be stored or displayed."
                          : "Only Super Admin can see your identity."}
                      </small>
                    </div>

                    {!studentIsAnonymous && (
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
                              value={student.submitter_name}
                              onChange={(e) =>
                                setStudent({ ...student, submitter_name: e.target.value })
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
                              value={student.submitter_email}
                              onChange={(e) =>
                                setStudent({ ...student, submitter_email: e.target.value })
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
                              value={student.submitter_phone}
                              onChange={(e) =>
                                setStudent({ ...student, submitter_phone: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">
                              <i className="fas fa-building" /> Department *
                            </label>
                            <select
                              className="form-select"
                              value={student.department_id}
                              onChange={(e) =>
                                setStudent({ ...student, department_id: e.target.value })
                              }
                            >
                              <option value="">Select Department</option>
                              {DEPARTMENTS.map(([id, name]) => (
                                <option value={id} key={id}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {studentIsAnonymous && (
                      <div className="visitor-info">
                        <h4>
                          <i className="fas fa-user-secret" /> Anonymous Submission
                        </h4>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">
                              <i className="fas fa-building" /> Department *
                            </label>
                            <select
                              className="form-select"
                              value={student.department_id}
                              onChange={(e) =>
                                setStudent({ ...student, department_id: e.target.value })
                              }
                            >
                              <option value="">Select Department</option>
                              {DEPARTMENTS.map(([id, name]) => (
                                <option value={id} key={id}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

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

                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      <i className="fas fa-paper-plane" />{" "}
                      {busy ? "Submitting..." : "Submit Feedback"}
                    </button>
                  </form>
                </div>
              )}

              {/* VISITOR */}
              {tab === "visitor" && (
                <div className="form-container">
                  <div className="form-header">
                    <i className="fas fa-comment-dots form-icon" />
                    <h2 className="form-title">Visitor Feedback</h2>
                    <p className="form-subtitle">Tell us about your visit</p>
                  </div>
                  <form className="feedback-form" onSubmit={handleVisitorSubmit}>
                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-question-circle" /> How would you like to submit?
                      </label>
                      <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="submission_type"
                            checked={!visitorIsAnonymous}
                            onChange={() => setVisitorIsAnonymous(false)}
                          />
                          <span><i className="fas fa-user" /> With My Name</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="submission_type"
                            checked={visitorIsAnonymous}
                            onChange={() => setVisitorIsAnonymous(true)}
                          />
                          <span><i className="fas fa-user-secret" /> Anonymous</span>
                        </label>
                      </div>
                      <small className="form-help" style={{ marginTop: 10 }}>
                        {visitorIsAnonymous
                          ? "Your identity will not be stored or displayed."
                          : "Only Super Admin can see your identity."}
                      </small>
                    </div>

                    {!visitorIsAnonymous && (
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
                              value={visitor.submitter_name}
                              onChange={(e) =>
                                setVisitor({ ...visitor, submitter_name: e.target.value })
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
                              value={visitor.submitter_email}
                              onChange={(e) =>
                                setVisitor({ ...visitor, submitter_email: e.target.value })
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
                              value={visitor.submitter_phone}
                              onChange={(e) =>
                                setVisitor({ ...visitor, submitter_phone: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-building" /> Department Visited *
                      </label>
                      <select
                        className="form-select"
                        value={visitor.department_id}
                        onChange={(e) =>
                          setVisitor({ ...visitor, department_id: e.target.value })
                        }
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map(([id, name]) => (
                          <option value={id} key={id}>
                            {name}
                          </option>
                        ))}
                      </select>
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
