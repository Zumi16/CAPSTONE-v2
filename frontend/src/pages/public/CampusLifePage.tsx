import { Hero } from "@/components/Hero";
import "@/styles/pages/campus-life.css";

const HERO_BG = "/assets/images/PUPBg2.jpg";

const FACILITIES = [
  { title: "Laboratory", image: "/assets/images/facilities/hmlab1.jpg" },
  { title: "Gym", image: "/assets/images/facilities/gymnasium.jpg" },
];

const ORGANIZATIONS = [
  { title: "AICTS", image: "/assets/images/org/aicts-logo.jpg" },
  { title: "SCENE", image: "/assets/images/org/scene-logo.jpg" },
  { title: "HMSOC", image: "/assets/images/org/hmsoc-logo.jpg" },
  { title: "PASOA", image: "/assets/images/org/pasoa-logo.jpg" },
];

const SPOTLIGHTS = [
  {
    quote:
      '"Campus life at PUP Parañaque is truly unforgettable. The experiences I gained here shaped who I am today."',
    author: "– Kisses B., BSIT 2025",
  },
  {
    quote:
      '"My journey at PUP Parañaque has been life-changing. The memories and lessons I’ve gained here will always stay with me."',
    author: "– Zumi A., BSHM 2025",
  },
];

export function CampusLifePage() {
  return (
    <main className="main campus-life-page">
        <Hero
        title="Campus Life"
        text="Welcome to PUP Parañaque Campus Life where learning goes beyond the
            classroom. Discover a vibrant academic environment filled with
            student organizations, events, cultural activities, and
            opportunities for leadership and personal growth. Here, we nurture
            not just scholars, but well-rounded individuals who contribute to a
            dynamic and inclusive university community.."
        background="/assets/images/PUPBg2.jpg"
      />

      <div className="main-container">
        <section className="campus-facilities">
          <h2 className="campus-facilities-title" data-aos="fade-in">
            Campus Facilities
          </h2>
          <div className="facilities-list">
            {FACILITIES.map((facility, index) => (
              <div className="facility-image-wrapper" data-aos="fade-in" key={facility.title}>
                <div
                  className="facility-image"
                  style={{ backgroundImage: `url('${facility.image}')` }}
                />
                <div className="facultycard-title" data-aos="fade-in">
                  {facility.title}
                </div>
                {index === 0}
              </div>
            ))}
          </div>
        </section>

        <section className="student-orgs">
          <h2 className="org-title" data-aos="fade-right">
            Student Organizations
          </h2>
          <hr className="hr" />
          <div className="orgs-list" data-aos="fade-in">
            {ORGANIZATIONS.map((org, index) => (
              <div style={{ display: "contents" }} key={org.title}>
                <div className="orgcard-container">
                  <div
                    className="org-image"
                    style={{ backgroundImage: `url('${org.image}')` }}
                  />
                  <div className="orgcard-title">{org.title}</div>
                </div>
                {index < ORGANIZATIONS.length - 1 }
              </div>
            ))}
          </div>
        </section>

        <section className="student-spotlight">
          <h2 className="student-spotlight-title">Student Spotlight</h2>
          <div className="spotlight-container">
            {SPOTLIGHTS.map((spotlight) => (
              <blockquote
                className="content-text"
                style={{ fontStyle: "italic" }}
                data-aos="fade-in"
                key={spotlight.author}
              >
                {spotlight.quote}
                <br />
                <span style={{ fontWeight: "bold" }}>{spotlight.author}</span>
              </blockquote>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
