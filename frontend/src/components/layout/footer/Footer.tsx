import { Link } from "react-router-dom";

import { PATHS, EXTERNAL_LINKS } from "@/routes/paths";
import "@/styles/layout/footer.css";
import { footerClasses as c } from "./footer.classes";

const LOGO_SRC = "/assets/images/PUPLogo.webp";

export function Footer() {
  return (
    <section className={c.box}>
      <footer className={c.footer}>
        <div className={c.container}>
          {/* Logo + description */}
          <div className={c.section}>
            <Link className={c.logoWrapper} to={PATHS.home}>
              <img src={LOGO_SRC} alt="PUP logo" className={c.logoImg} />
              <div className={c.logoText}>
                <p className={c.logoName}>
                  Polytechnic University of the Philippines
                </p>
                <p className={c.logoBranch}>PARAÑAQUE CAMPUS</p>
              </div>
            </Link>
            <p className={c.desc}>
              PUP Parañaque recognizes the vital contributions of its faculty
              and staff in delivering quality education and services to its
              students and the community.
            </p>
            <div className={c.socialLinks}>
              <a href="#" aria-label="Facebook">
                <i className="fas fa-lightbulb" />
              </a>
              <a href="#" aria-label="Twitter">
                <i className="fab fa-twitter" />
              </a>
              <a href="#" aria-label="Instagram">
                <i className="fab fa-instagram" />
              </a>
              <a href="#" aria-label="LinkedIn">
                <i className="fab fa-linkedin-in" />
              </a>
              <a href="#" aria-label="Globe">
                <i className="fas fa-globe" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div className={c.section}>
            <h3>Quick Links</h3>
            <ul className={c.links}>
              <li>
                <Link to={PATHS.home}>Home</Link>
              </li>
              <li>
                <Link to={PATHS.about.history}>About</Link>
              </li>
              <li>
                <Link to={PATHS.admission}>Admission</Link>
              </li>
              <li>
                <Link to={PATHS.about.researchExtension}>Extension Services</Link>
              </li>
              <li>
                <Link to={PATHS.news}>News &amp; Updates</Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className={c.section}>
            <h3>Resources</h3>
            <ul className={c.links}>
              <li>
                <Link to={PATHS.students.scholarships}>Scholarships</Link>
              </li>
              <li>
                <Link to={PATHS.students.careers}>Career &amp; Job Placement</Link>
              </li>
              <li>
                <Link to={PATHS.students.certificateRequest}>
                  Certificate Request
                </Link>
              </li>
              <li>
                <Link to={PATHS.students.feedback}>Service Feedback</Link>
              </li>
              <li>
                <a
                  href={EXTERNAL_LINKS.studentPortal}
                  target="_blank"
                  rel="noreferrer"
                >
                  PUP Student Portal
                </a>
              </li>
              <li>
                <Link to={PATHS.students.downloadableForms}>
                  Downloadable Forms
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className={c.section}>
            <h3>Contact</h3>
            <p className={c.contactText}>
              <Link to={PATHS.about.vicinityMap} className={c.contactLink}>
                PUP Parañaque Campus
                <br />
                Col. E. De Leon St. Wawa, Brgy. Sto. Niño
                <br />
                Parañaque City, Philippines 1700,
                <br />
                Metro Manila
              </Link>
            </p>
            <p className={c.contactInfo}>
              <a href="tel:+6325538623">
                <i className="fas fa-phone-alt" /> (63 2) 553-8623
              </a>
            </p>
            <p className={c.contactInfo}>
              <i className="fas fa-envelope" />{" "}
              <a href="mailto:paranaque@pup.edu.ph">paranaque@pup.edu.ph</a>
            </p>
          </div>
        </div>

        <hr className={c.divider} />
        <p className={c.copy}>
          © 2025 Polytechnic University of the Philippines Parañaque Campus. All
          rights reserved.
        </p>
      </footer>
    </section>
  );
}
