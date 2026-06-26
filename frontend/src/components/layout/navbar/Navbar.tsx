import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { cx } from "@/lib/cx";
import { PATHS, EXTERNAL_LINKS } from "@/routes/paths";

import "@/styles/layout/navbar.css";
import "./navbar-home.css";
import { navbarClasses as c } from "./navbar.classes";

const LOGO_SRC = "/assets/images/PUPLogo.webp";

type NavbarProps = {
  /** "home" = transparent overlay that turns solid on scroll. "default" = solid. */
  variant?: "home" | "default";
};

export function Navbar({ variant = "default" }: NavbarProps) {
  const navigate = useNavigate();

  // Is the mobile (hamburger) menu open?
  const [menuOpen, setMenuOpen] = useState(false);
  // Has the user scrolled down? (only used by the homepage variant)
  const [scrolled, setScrolled] = useState(false);

  // Add the "scrolled" class after scrolling past the hero, like the old site.
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

  return (
    <header className={c.header}>
      <nav
        className={cx(
          c.nav,
          variant === "home" && c.navHome,
          variant === "home" && scrolled && c.scrolled,
          menuOpen && c.active,
        )}
      >
        {/* Logo + title */}
        <div className={c.logo}>
          <img className={c.logoImage} src={LOGO_SRC} alt="PUP logo" />
          <div className={c.logoTitleWrap}>
            <h1 className={c.logoTitle}>
              Polytechnic University of the Philippines
            </h1>
            <h2 className={c.logoTitle2}>PARAÑAQUE CITY CAMPUS</h2>
          </div>
        </div>

        <hr className={c.divider} />

        {/* Nav items */}
        <ul className={cx(c.navMenu, menuOpen && c.active)}>
          {/* Search — appears at the top of the mobile menu, above "Home" */}
          <li className={c.navSearch}>
            <form className={c.navSearchForm} onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search"
                name="search"
                className={c.searchBox}
              />
              <button type="submit" className={c.searchButton}>
                <i className="fa fa-search" />
              </button>
            </form>
          </li>

          <li className={c.navItem}>
            <Link to={PATHS.home} onClick={closeMenu}>
              Home
            </Link>
          </li>

          <li className={cx(c.navItem, c.dropdownButton)}>
            <a href="#about">
              About <span className={c.arrow}>&#11206;</span>
            </a>
            <div className={c.dropdownContent}>
              <Link to={PATHS.about.history} onClick={closeMenu}>
                History
              </Link>
              <Link to={PATHS.about.researchExtension} onClick={closeMenu}>
                Research &amp; Extension
              </Link>
              <Link
                to={PATHS.about.administrativeOfficials}
                onClick={closeMenu}
              >
                Administrative Officials
              </Link>
              <Link to={PATHS.about.vicinityMap} onClick={closeMenu}>
                Vicinity Map
              </Link>
            </div>
          </li>

          <li className={c.navItem}>
            <Link to={PATHS.admission} onClick={closeMenu}>
              Admission
            </Link>
          </li>

          <li className={cx(c.navItem, c.dropdownButton)}>
            <Link to={PATHS.students.index} onClick={closeMenu}>
              Students <span className={c.arrow}>&#11206;</span>
            </Link>
            <div className={c.dropdownContent}>
              <Link to={PATHS.students.nstp} onClick={closeMenu}>
                NSTP Announcements
              </Link>
              <Link to={PATHS.students.ojt} onClick={closeMenu}>
                OJT Announcements
              </Link>
              <Link to={PATHS.students.feedback} onClick={closeMenu}>
                Service Feedback
              </Link>
              <Link to={PATHS.students.scholarships} onClick={closeMenu}>
                Scholarship Opportunities
              </Link>
              <Link to={PATHS.students.careers} onClick={closeMenu}>
                Career &amp; Job Placement
              </Link>
              <Link to={PATHS.students.certificateRequest} onClick={closeMenu}>
                Digital Certificate Request
              </Link>
              <a href={EXTERNAL_LINKS.pupSinta} target="_blank" rel="noreferrer">
                PUP Sinta
              </a>
              <a
                href={EXTERNAL_LINKS.studentPortal}
                target="_blank"
                rel="noreferrer"
              >
                PUP Student Portal
              </a>
            </div>
          </li>

          <li className={c.navItem}>
            <Link to={PATHS.campusLife} onClick={closeMenu}>
              Campus Life
            </Link>
          </li>

          <li className={c.navItem}>
            <Link to={PATHS.alumni} onClick={closeMenu}>
              Alumni &amp; Services
            </Link>
          </li>

          <li className={c.navItem}>
            <Link to={PATHS.contact} onClick={closeMenu}>
              Contact/Support
            </Link>
          </li>
        </ul>

        {/* Hamburger (mobile only) — opens the menu that holds the search above Home */}
        <div className={c.searchHamburger}>
          <div
            className={cx(c.hamburger, menuOpen && c.active)}
            role="button"
            tabIndex={0}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMenuOpen((open) => !open);
              }
            }}
          >
            <span className={c.bar} />
            <span className={c.bar} />
            <span className={c.bar} />
          </div>

          {/* Desktop search (right side of the bar; hidden on mobile, which
              uses the search inside the hamburger menu instead). */}
          <div className={c.searchBar}>
            <form className={c.searchForm} onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search"
                name="search"
                className={c.searchBox}
              />
              <button type="submit" className={c.searchButton}>
                <i className="fa fa-search" />
              </button>
            </form>
          </div>
        </div>
      </nav>
    </header>
  );
}
