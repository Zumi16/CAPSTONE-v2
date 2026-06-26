import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "@/lib/api";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/alumni-survey.css";

const HERO_BG = "/assets/images/buttonimage/alumni.jpg";

const PROGRAMS = [
  ["BSIT", "BSIT - BS Information Technology"],
  ["BSCpE", "BSCpE - BS Civil Engineering"],
  ["BSOA", "BSOA - BS Office Administration"],
  ["BSHM", "BSHM - BS Hospitality Management"],
];

const EMPLOYMENT_OPTIONS = [
  { value: "Employed", icon: "fa-briefcase", label: "Employed" },
  {
    value: "Self-Employed",
    icon: "fa-user-tie",
    label: "Self-Employed / Business Owner",
  },
  { value: "Unemployed", icon: "fa-user-slash", label: "Unemployed" },
];

const TIMELINES = [
  "Within 3 months",
  "Within 6 months",
  "Within 1 year",
  "More than 1 year",
];

export function AlumniPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [batch, setBatch] = useState("");
  const [program, setProgram] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [workType, setWorkType] = useState("");
  const [timeline, setTimeline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Employment details only matter when the person is working.
  const showEmploymentDetails =
    employmentStatus === "Employed" || employmentStatus === "Self-Employed";

  const validate = (): boolean => {
    if (!fullName.trim()) return fail("Please enter your full name");
    if (!batch.trim()) return fail("Please enter your graduation year");
    if (!/^\d{4}$/.test(batch.trim()))
      return fail("Please enter a valid 4-digit graduation year (e.g., 2023)");

    const year = parseInt(batch, 10);
    const currentYear = new Date().getFullYear();
    if (year < 2000 || year > currentYear + 1)
      return fail(`Please enter a graduation year between 2000 and ${currentYear + 1}`);

    if (!program) return fail("Please select your program/course");
    if (!employmentStatus) return fail("Please select your current employment status");
    return true;
  };

  function fail(message: string): false {
    window.alert(message);
    return false;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const data = await api.post<{ success: boolean; message?: string }>(
        "/api/alumni-employment/submit",
        {
          full_name: fullName.trim(),
          batch: batch.trim(),
          program,
          employment_status: employmentStatus,
          work_type: workType.trim() || null,
          employment_timeline: timeline || null,
        },
      );

      if (data.success) {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.alert(data.message || "Failed to submit response. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      window.alert(
        "An error occurred while submitting your response. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="main">
      <section
        className="hero-section"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="hero-content">
          <h1 className="hero-title" data-aos="fade-in">
            Alumni Employment Survey
          </h1>
          <hr className="hero-divider" />
          <p className="hero-text" data-aos="fade-in">
            We invite our valued alumni to participate in this employment
            survey. Your responses will provide important insights that will
            help the university better understand career trends, employment
            outcomes, and the professional journeys of our graduates, ultimately
            guiding future programs and initiatives.
          </p>
        </div>
      </section>

      <div className="survey-container">
        {submitted ? (
          <div className="success-card" style={{ display: "block" }}>
            <div className="success-icon">
              <i className="fa-solid fa-check-circle" />
            </div>
            <h2>Thank You!</h2>
            <p>
              Your response has been successfully submitted. We appreciate your
              participation in helping us track alumni career progress.
            </p>
            <button className="back-btn" onClick={() => navigate(PATHS.home)}>
              <i className="fa-solid fa-home" /> Back to Homepage
            </button>
          </div>
        ) : (
          <div className="survey-form-card">
            <div className="form-intro">
              <i className="fa-solid fa-clipboard-list" />
              <h2>Help Us Track Your Career Progress</h2>
              <p>
                This survey takes less than 2 minutes to complete. Your
                information helps us improve our programs and meet institutional
                reporting requirements.
              </p>
            </div>

            <form className="form-container" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">
                  Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  placeholder="e.g., Juan Gabriel Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="batch">
                    Graduation Year <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="batch"
                    placeholder="e.g., 2023"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="program">
                    Program / Course <span className="required">*</span>
                  </label>
                  <select
                    id="program"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                  >
                    <option value="">Select your program</option>
                    {PROGRAMS.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Current Employment Status <span className="required">*</span>
                </label>
                <div className="radio-group">
                  {EMPLOYMENT_OPTIONS.map((option) => (
                    <label className="radio-option" key={option.value}>
                      <input
                        type="radio"
                        name="employmentStatus"
                        value={option.value}
                        checked={employmentStatus === option.value}
                        onChange={(e) => setEmploymentStatus(e.target.value)}
                      />
                      <span className="radio-label">
                        <i className={`fa-solid ${option.icon}`} /> {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {showEmploymentDetails && (
                <div>
                  <div className="form-group">
                    <label htmlFor="workType">
                      Type of Work <span className="optional">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="workType"
                      placeholder="e.g., Software Engineer, Business Owner"
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="timeline">
                      How long after graduation did you find employment?
                    </label>
                    <select
                      id="timeline"
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                    >
                      <option value="">Select timeline</option>
                      {TIMELINES.map((option) => (
                        <option value={option} key={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-notice">
                <i className="fa-solid fa-shield-alt" />
                <p>
                  <strong>Privacy Notice:</strong> Your information will be used
                  solely for institutional reporting and program improvement. We
                  respect your privacy.
                </p>
              </div>

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane" /> Submit Response
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
