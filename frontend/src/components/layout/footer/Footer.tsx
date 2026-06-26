const LOGO_SRC = "/assets/images/PUPLogo.webp";

const SOCIALS = [
  { label: "Facebook", icon: "fas fa-lightbulb" },
  { label: "Twitter", icon: "fab fa-twitter" },
  { label: "Instagram", icon: "fab fa-instagram" },
  { label: "LinkedIn", icon: "fab fa-linkedin-in" },
  { label: "Globe", icon: "fas fa-globe" },
];

const QUICK_LINKS = ["Home", "About", "Programs", "Admission", "Extension Services"];
const RESOURCES = [
  "Forms",
  "Academic Calendar",
  "Faculty Resources",
  "Staff Resources",
  "University Policies",
];

/** Shared site footer. Fully responsive: 1 column on phones → 4 on desktop. */
export function Footer() {
  return (
    <section className="w-full bg-[#1c2737]">
      <footer className="mx-auto max-w-6xl px-5 py-10 font-sans">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo + description */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src={LOGO_SRC} alt="PUP logo" className="h-8 w-8" />
              <div className="text-xs leading-tight">
                <p className="text-slate-400">
                  Polytechnic University of the Philippines
                </p>
                <p className="text-sm font-bold text-white">PARAÑAQUE CAMPUS</p>
              </div>
            </div>
            <p className="my-4 text-xs text-slate-400">
              PUP Parañaque recognizes the vital contributions of its faculty and
              staff in delivering quality education and services to its students
              and the community.
            </p>
            <div className="flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  <i className={s.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-2.5 text-sm font-semibold text-white">Quick Links</h3>
            <ul className="space-y-1.5">
              {QUICK_LINKS.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-2.5 text-sm font-semibold text-white">Resources</h3>
            <ul className="space-y-1.5">
              {RESOURCES.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-2.5 text-sm font-semibold text-white">Contact</h3>
            <p className="text-xs text-slate-400">
              <a href="#" className="text-red-400 hover:underline">
                PUP Parañaque Campus
                <br />
                Col. E. De Leon St. Wawa, Brgy. Sto. Niño
                <br />
                Parañaque City, Philippines 1700,
                <br />
                Metro Manila
              </a>
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
              <i className="fas fa-phone-alt" /> (63 2) 553-8623
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
              <i className="fas fa-envelope" />{" "}
              <a href="mailto:paranaque@pup.edu.ph">paranaque@pup.edu.ph</a>
            </p>
          </div>
        </div>

        <hr className="my-8 border-slate-700" />
        <p className="text-center text-xs text-slate-500">
          © 2025 Polytechnic University of the Philippines Parañaque Campus. All
          rights reserved.
        </p>
      </footer>
    </section>
  );
}
