import { useNavigate } from "react-router-dom";

import { NewsGrid } from "@/features/news/NewsGrid";
import { PATHS, EXTERNAL_LINKS } from "@/routes/paths";
import "@/styles/pages/students.css";

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
    <main className="main">
      <div className="main-image">
        <img src={MAIN_IMAGE} alt="PUP campus" className="main-img" />
      </div>
      <hr className="hr-main" />

      <div className="main-container">
        <div className="main-content">
          {SERVICE_CARDS.map((card) => (
            <div
              key={card.title}
              className="content-box"
              onClick={() => openCard(card)}
              style={{ backgroundImage: `url('${card.image}')` }}
            >
              <h2 className="content-title">{card.title}</h2>
              <p className="content-text">{card.text}</p>
            </div>
          ))}
        </div>

        <ul className="social-links1">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.href} aria-label={link.label} target="_blank" rel="noreferrer">
                <i className={link.icon} />
              </a>
            </li>
          ))}
        </ul>

        <section className="news-section">
          <div className="container">
            <h2 className="section-title">News and Updates</h2>
            <hr
              style={{
                width: "90px",
                border: "2px solid black",
                margin: "auto",
                marginBottom: "50px",
              }}
            />
            <NewsGrid limit={3} />
          </div>
        </section>
      </div>
    </main>
  );
}
