import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PATHS } from "@/routes/paths";

const HERO_BG = "/assets/images/buttonimage/alumni.jpg";

const PROGRAMS = [
  ["BSIT", "BSIT - BS Information Technology"],
  ["BSCpE", "BSCpE - BS Civil Engineering"],
  ["BSOA", "BSOA - BS Office Administration"],
  ["BSHM", "BSHM - BS Hospitality Management"],
];

const EMPLOYMENT_OPTIONS = [
  { value: "Employed", icon: "fa-briefcase", label: "Employed" },
  { value: "Self-Employed", icon: "fa-user-tie", label: "Self-Employed / Business Owner" },
  { value: "Unemployed", icon: "fa-user-slash", label: "Unemployed" },
];

const TIMELINES = ["Within 3 months", "Within 6 months", "Within 1 year", "More than 1 year"];

const labelClass = "mb-1 block font-medium text-gray-700";
const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20";

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

  const showEmploymentDetails =
    employmentStatus === "Employed" || employmentStatus === "Self-Employed";

  const fail = (message: string): false => {
    window.alert(message);
    return false;
  };

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
      window.alert("An error occurred. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-gray-50">
      <section
        className="relative flex min-h-[280px] items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="w-full bg-black/70 px-6 py-14 text-center text-white" data-aos="fade-in">
          <h1 className="text-3xl font-bold sm:text-4xl">Alumni Employment Survey</h1>
          <hr className="mx-auto my-3 w-1/5 border-white/70" />
          <p className="mx-auto max-w-3xl text-base leading-relaxed sm:text-lg">
            We invite our valued alumni to participate in this employment survey.
            Your responses help the university understand career trends, employment
            outcomes, and the professional journeys of our graduates.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-10">
        {submitted ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-md">
            <i className="fa-solid fa-circle-check text-5xl text-green-600" />
            <h2 className="mt-4 text-2xl font-bold">Thank You!</h2>
            <p className="mt-2 text-gray-600">
              Your response has been successfully submitted. We appreciate your
              participation in helping us track alumni career progress.
            </p>
            <button
              onClick={() => navigate(PATHS.home)}
              className="mt-6 rounded-md bg-maroon px-6 py-2.5 font-semibold text-white hover:bg-brand-light"
            >
              <i className="fa-solid fa-home" /> Back to Homepage
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-md sm:p-8">
            <div className="mb-6 text-center">
              <i className="fa-solid fa-clipboard-list text-3xl text-maroon" />
              <h2 className="mt-2 text-xl font-bold">Help Us Track Your Career Progress</h2>
              <p className="mt-1 text-sm text-gray-600">
                This survey takes less than 2 minutes to complete.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g., Juan Gabriel Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="batch" className={labelClass}>
                    Graduation Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="batch"
                    type="text"
                    placeholder="e.g., 2023"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="program" className={labelClass}>
                    Program / Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="program"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className={inputClass}
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

              <div>
                <label className={labelClass}>
                  Current Employment Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {EMPLOYMENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cx(
                        "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition",
                        employmentStatus === option.value
                          ? "border-maroon bg-rose-50"
                          : "border-gray-300 hover:bg-gray-50",
                      )}
                    >
                      <input
                        type="radio"
                        name="employmentStatus"
                        value={option.value}
                        checked={employmentStatus === option.value}
                        onChange={(e) => setEmploymentStatus(e.target.value)}
                        className="accent-maroon"
                      />
                      <i className={`fa-solid ${option.icon}`} /> {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {showEmploymentDetails && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="workType" className={labelClass}>
                      Type of Work <span className="text-gray-400">(Optional)</span>
                    </label>
                    <input
                      id="workType"
                      type="text"
                      placeholder="e.g., Software Engineer"
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="timeline" className={labelClass}>
                      Time to find employment
                    </label>
                    <select
                      id="timeline"
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className={inputClass}
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

              <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <i className="fa-solid fa-shield-alt mt-0.5 text-maroon" />
                <p>
                  <strong>Privacy Notice:</strong> Your information will be used
                  solely for institutional reporting and program improvement.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-maroon py-3 font-semibold text-white transition hover:bg-brand-light disabled:opacity-60"
              >
                <i className="fa-solid fa-paper-plane" />{" "}
                {submitting ? "Submitting..." : "Submit Response"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
