import { useNavigate } from "react-router-dom";

import { NewsGrid } from "@/features/news/NewsGrid";
import { PATHS, EXTERNAL_LINKS } from "@/routes/paths";

const MAIN_IMAGE = "/assets/images/PUPBg1.webp";

/** The clickable service cards. `external: true` means a full page navigation. */
const SERVICE_CARDS = [
  {
    title: "Scholarships",
    text: "Find scholarship opportunities",
    image: "/assets/images/buttonimage/student&resources.jpg",
    href: PATHS.students.scholarships,
  },
  {
    title: "Career Directory",
    text: "Explore partner organizations offering job opportunities and career resources",
    image: "/assets/images/buttonimage/career-directory.jpg",
    href: PATHS.students.careers,
  },
  {
    title: "PUP Sinta",
    text: "Online service dedicated to answer queries and reports of the students concerning admission, enrollment, library processes and more",
    image: "/assets/images/buttonimage/studentservices.jpg",
    href: EXTERNAL_LINKS.pupSinta,
    external: true,
  },
  {
    title: "PUP Student Portal",
    text: "Access academic records, enrollment services, class schedules, and important student updates",
    image: "/assets/images/buttonimage/pupportal.jpg",
    href: EXTERNAL_LINKS.studentPortal,
    external: true,
  },
  {
    title: "Student Feedback",
    text: "Send your feedback and help improve campus services, and student support.",
    image: "/assets/images/buttonimage/studentorg.jpg",
    href: PATHS.students.feedback,
  },
] as const;

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/puppq", label: "Facebook", icon: "fab fa-facebook-f" },
  {
    href: "https://www.instagram.com/pupparanaqueofficial/",
    label: "Instagram",
    icon: "fab fa-instagram",
  },
  {
    href: "https://www.linkedin.com/school/polytechnic-university-of-the-philippines/posts/?feedView=all",
    label: "LinkedIn",
    icon: "fab fa-linkedin-in",
  },
];

export function StudentsPage() {
  const navigate = useNavigate();

  const openCard = (card: (typeof SERVICE_CARDS)[number]) => {
    if ("external" in card && card.external) {
      window.location.href = card.href;
    } else {
      navigate(card.href);
    }
  };

  return (
    <main className="bg-white">
      <div className="w-full">
        <img src={MAIN_IMAGE} alt="PUP campus" className="h-48 w-full object-cover sm:h-72 lg:h-96" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Service cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CARDS.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={() => openCard(card)}
              className="group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-xl bg-cover bg-center p-5 text-left text-white shadow-md transition hover:scale-[1.02]"
              style={{ backgroundImage: `url('${card.image}')` }}
            >
              <span className="absolute inset-0 bg-black/50 transition group-hover:bg-black/60" />
              <span className="relative">
                <span className="block text-xl font-bold">{card.title}</span>
                <span className="mt-1 block text-sm text-white/90">{card.text}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Socials */}
        <ul className="my-10 flex items-center justify-center gap-8">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                aria-label={link.label}
                target="_blank"
                rel="noreferrer"
                className="text-3xl text-gray-700 transition hover:scale-110 hover:text-maroon"
              >
                <i className={link.icon} />
              </a>
            </li>
          ))}
        </ul>

        {/* News */}
        <section>
          <h2 className="text-center text-2xl font-bold text-brand sm:text-3xl">
            News and Updates
          </h2>
          <hr className="mx-auto mt-2.5 mb-10 h-1 w-20 rounded border-0 bg-maroon" />
          <NewsGrid limit={3} />
        </section>
      </div>
    </main>
  );
}
