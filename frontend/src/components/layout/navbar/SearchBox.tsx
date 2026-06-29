import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { PATHS } from "@/routes/paths";
import { navbarClasses as c } from "./navbar.classes";

/**
 * Navbar search input with a lightweight type-ahead. As the user types it
 * filters a small static list of public pages and shows quick links; pressing
 * Enter still runs the full `/search?q=` query. Used by both the desktop search
 * and the hamburger-menu search.
 */
type Suggestion = { label: string; to: string };

const SUGGESTIONS: Suggestion[] = [
  { label: "Home", to: PATHS.home },
  { label: "History", to: PATHS.about.history },
  { label: "Research & Extension", to: PATHS.about.researchExtension },
  { label: "Administrative Officials", to: PATHS.about.administrativeOfficials },
  { label: "Vicinity Map", to: PATHS.about.vicinityMap },
  { label: "Admission", to: PATHS.admission },
  { label: "Students", to: PATHS.students.index },
  { label: "NSTP Announcements", to: PATHS.students.nstp },
  { label: "OJT Announcements", to: PATHS.students.ojt },
  { label: "Service Feedback", to: PATHS.students.feedback },
  { label: "Scholarship Opportunities", to: PATHS.students.scholarships },
  { label: "Career & Job Placement", to: PATHS.students.careers },
  { label: "Digital Certificate Request", to: PATHS.students.certificateRequest },
  { label: "Campus Life", to: PATHS.campusLife },
  { label: "Alumni & Services", to: PATHS.alumni },
  { label: "Contact/Support", to: PATHS.contact },
  { label: "News & Updates", to: PATHS.news },
];

export function SearchBox({
  formClassName,
  onNavigate,
}: {
  formClassName: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const q = value.trim().toLowerCase();
  const matches = q
    ? SUGGESTIONS.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 6)
    : [];

  const goTo = (to: string) => {
    setValue("");
    setOpen(false);
    onNavigate?.();
    navigate(to);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = value.trim();
    if (term.length < 2) {
      window.alert("Please enter at least 2 characters to search");
      return;
    }
    setOpen(false);
    onNavigate?.();
    navigate(`${PATHS.search}?q=${encodeURIComponent(term)}`);
  };

  return (
    <form
      className={formClassName}
      onSubmit={submit}
      autoComplete="off"
      onBlur={() => setOpen(false)}
    >
      <input
        type="text"
        name="search"
        placeholder="Search"
        className={c.searchBox}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      <button type="submit" className={c.searchButton}>
        <i className="fa fa-search" />
      </button>

      {open && matches.length > 0 && (
        <ul className="search-suggestions">
          {matches.map((s) => (
            <li key={s.to}>
              {/* onMouseDown keeps focus so the click registers before blur closes the list */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goTo(s.to)}
              >
                <i className="fa fa-arrow-right" />
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
