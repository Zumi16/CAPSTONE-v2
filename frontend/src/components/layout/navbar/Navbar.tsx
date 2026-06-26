import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { cx } from "@/lib/cx";
import { PATHS, EXTERNAL_LINKS } from "@/routes/paths";

const LOGO_SRC = "/assets/images/PUPLogo.webp";
const MAROON = "#6f2323";

type SubLink =
  | { label: string; to: string }
  | { label: string; href: string };

type NavEntry = {
  label: string;
  to?: string;
  children?: SubLink[];
};

/** The whole menu described as data, so desktop + mobile render from one source. */
const NAV: NavEntry[] = [
  { label: "Home", to: PATHS.home },
  {
    label: "About",
    children: [
      { label: "History", to: PATHS.about.history },
      { label: "Research & Extension", to: PATHS.about.researchExtension },
      { label: "Administrative Officials", to: PATHS.about.administrativeOfficials },
      { label: "Vicinity Map", to: PATHS.about.vicinityMap },
    ],
  },
  { label: "Admission", to: PATHS.admission },
  {
    label: "Students",
    to: PATHS.students.index,
    children: [
      { label: "NSTP Announcements", to: PATHS.students.nstp },
      { label: "OJT Announcements", to: PATHS.students.ojt },
      { label: "Service Feedback", to: PATHS.students.feedback },
      { label: "Scholarship Opportunities", to: PATHS.students.scholarships },
      { label: "Career & Job Placement", to: PATHS.students.careers },
      { label: "Digital Certificate Request", to: PATHS.students.certificateRequest },
      { label: "PUP Sinta", href: EXTERNAL_LINKS.pupSinta },
      { label: "PUP Student Portal", href: EXTERNAL_LINKS.studentPortal },
    ],
  },
  { label: "Campus Life", to: PATHS.campusLife },
  { label: "Alumni & Services", to: PATHS.alumni },
  { label: "Contact/Support", to: PATHS.contact },
];

const linkClass = "font-serif text-white transition-colors hover:text-[#ffc66b]";

type NavbarProps = {
  /** "home" = transparent overlay that turns solid on scroll. "default" = solid. */
  variant?: "home" | "default";
};

export function Navbar({ variant = "default" }: NavbarProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem(
      "search",
    ) as HTMLInputElement | null;
    const query = input?.value.trim() ?? "";
    if (query.length < 2) {
      window.alert("Please enter at least 2 characters to search");
      return;
    }
    navigate(`${PATHS.search}?q=${encodeURIComponent(query)}`);
    closeMenu();
  };

  // The bar is transparent only on the homepage hero, before scrolling.
  const transparent = variant === "home" && !scrolled && !menuOpen;

  return (
    <header
      className={cx(
        "top-0 left-0 z-50 w-full transition-colors duration-300",
        variant === "home" ? "fixed" : "sticky",
        transparent ? "bg-transparent" : "shadow-md",
      )}
      style={transparent ? undefined : { backgroundColor: MAROON }}
    >
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 px-4 py-3 lg:flex-nowrap">
        {/* Logo */}
        <Link to={PATHS.home} className="flex items-center gap-2.5" onClick={closeMenu}>
          <img src={LOGO_SRC} alt="PUP logo" className="h-12 w-12" />
          <span className="text-white">
            <span className="block text-sm font-bold leading-tight sm:text-base">
              Polytechnic University of the Philippines
            </span>
            <span className="block text-xs leading-tight">PARAÑAQUE CITY CAMPUS</span>
          </span>
        </Link>

        {/* Desktop menu */}
        <ul className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAV.map((entry) =>
            entry.children ? (
              <li key={entry.label} className="group relative">
                {entry.to ? (
                  <Link to={entry.to} className={linkClass}>
                    {entry.label} <span className="text-xs">▾</span>
                  </Link>
                ) : (
                  <span className={cx(linkClass, "cursor-pointer")}>
                    {entry.label} <span className="text-xs">▾</span>
                  </span>
                )}
                {/* Dropdown */}
                <div className="invisible absolute left-0 top-full z-10 min-w-[230px] translate-y-2 rounded-md border border-[#6f2323] bg-white/95 opacity-0 shadow-lg transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {entry.children.map((child) =>
                    "to" in child ? (
                      <Link
                        key={child.label}
                        to={child.to}
                        className="block px-4 py-2.5 text-[13px] text-gray-600 hover:rounded hover:bg-rose-50 hover:text-[#6f2323] hover:underline"
                      >
                        {child.label}
                      </Link>
                    ) : (
                      <a
                        key={child.label}
                        href={child.href}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-4 py-2.5 text-[13px] text-gray-600 hover:rounded hover:bg-rose-50 hover:text-[#6f2323] hover:underline"
                      >
                        {child.label}
                      </a>
                    ),
                  )}
                </div>
              </li>
            ) : (
              <li key={entry.label}>
                <Link to={entry.to!} className={linkClass}>
                  {entry.label}
                </Link>
              </li>
            ),
          )}
        </ul>

        {/* Right side: search (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="hidden items-center gap-2 lg:flex">
            <input
              type="text"
              name="search"
              placeholder="Search"
              className="h-9 w-44 rounded-lg border border-white/70 bg-transparent px-4 text-white outline-none placeholder:text-white/80"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white text-white"
            >
              <i className="fa fa-search" />
            </button>
          </form>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center text-2xl text-white lg:hidden"
          >
            <i className={menuOpen ? "fas fa-times" : "fas fa-bars"} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="w-full lg:hidden" style={{ backgroundColor: MAROON }}>
            <ul className="flex flex-col gap-1 py-3">
              {NAV.map((entry) => (
                <li key={entry.label}>
                  {entry.to ? (
                    <Link
                      to={entry.to}
                      onClick={closeMenu}
                      className="block py-2 font-serif text-white hover:text-[#ffc66b]"
                    >
                      {entry.label}
                    </Link>
                  ) : (
                    <span className="block py-2 font-serif font-semibold text-white">
                      {entry.label}
                    </span>
                  )}
                  {entry.children && (
                    <ul className="ml-4 border-l border-white/20 pl-3">
                      {entry.children.map((child) => (
                        <li key={child.label}>
                          {"to" in child ? (
                            <Link
                              to={child.to}
                              onClick={closeMenu}
                              className="block py-1.5 text-sm text-white/90 hover:text-[#ffc66b]"
                            >
                              {child.label}
                            </Link>
                          ) : (
                            <a
                              href={child.href}
                              target="_blank"
                              rel="noreferrer"
                              className="block py-1.5 text-sm text-white/90 hover:text-[#ffc66b]"
                            >
                              {child.label}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            <form onSubmit={handleSearch} className="flex items-center gap-2 pb-4">
              <input
                type="text"
                name="search"
                placeholder="Search"
                className="h-9 flex-1 rounded-lg border border-white/70 bg-transparent px-4 text-white outline-none placeholder:text-white/80"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white text-white"
              >
                <i className="fa fa-search" />
              </button>
            </form>
          </div>
        )}
      </nav>
    </header>
  );
}
