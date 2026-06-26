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
            <div className={c.logoWrapper}>
              <img src={LOGO_SRC} alt="PUP logo" className={c.logoImg} />
              <div className={c.logoText}>
                <p className={c.logoName}>
                  Polytechnic University of the Philippines
                </p>
                <p className={c.logoBranch}>PARAÑAQUE CAMPUS</p>
              </div>
            </div>
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
                <a href="#">Home</a>
              </li>
              <li>
                <a href="#">About</a>
              </li>
              <li>
                <a href="#">Programs</a>
              </li>
              <li>
                <a href="#">Admission</a>
              </li>
              <li>
                <a href="#">Extension Services</a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className={c.section}>
            <h3>Resources</h3>
            <ul className={c.links}>
              <li>
                <a href="#">Forms</a>
              </li>
              <li>
                <a href="#">Academic Calendar</a>
              </li>
              <li>
                <a href="#">Faculty Resources</a>
              </li>
              <li>
                <a href="#">Staff Resources</a>
              </li>
              <li>
                <a href="#">University Policies</a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className={c.section}>
            <h3>Contact</h3>
            <p className={c.contactText}>
              <a href="#" className={c.contactLink}>
                PUP Parañaque Campus
                <br />
                Col. E. De Leon St. Wawa, Brgy. Sto. Niño
                <br />
                Parañaque City, Philippines 1700,
                <br />
                Metro Manila
              </a>
            </p>
            <p className={c.contactInfo}>
              <i className="fas fa-phone-alt" /> (63 2) 553-8623
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
