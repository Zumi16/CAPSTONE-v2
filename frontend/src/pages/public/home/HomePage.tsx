import { Link } from "react-router-dom";

import { NewsGrid } from "@/features/news/NewsGrid";
import { PATHS } from "@/routes/paths";
import "@/styles/pages/home.css";
import { CounterStat } from "./CounterStat";

const HERO_VIDEO = "/assets/videos/pupvid.mp4";

/** Strategic goals shown on the homepage, grouped by category. */
const STRATEGIC_GOALS = [
  {
    number: 1,
    title: "Teaching and Learning",
    items: [
      ["SG 1:", "Innovative Curricula and Instruction"],
      ["SG 2:", "Empowered, Expert, and Productive Faculty Members"],
      ["SG 3:", "Holistic Student Development"],
    ],
  },
  {
    number: 2,
    title: "Research and Extension",
    items: [
      ["SG 4:", "Intensified Research Innovation, Dissemination and Utilization"],
      ["SG 5:", "Strengthened Sustainable and Impactful Extension Program"],
      [
        "SG 6:",
        "Expanded Research and Extension Networks with Local, National, and International Partners",
      ],
    ],
  },
  {
    number: 3,
    title: "Internal Governance",
    items: [
      ["SG 7:", "Transformational University Leadership"],
      [
        "SG 8:",
        "Judicious and Ethical Stewardship of Physical and Financial Resources",
      ],
      ["SG 9:", "Effective and Efficient Human Resource Management"],
      ["SG 10:", "Excellent Citizen/Client Satisfaction"],
      ["SG 11:", "Smart Campuses"],
    ],
  },
] as const;

/** Core values: the letters of "INSPIRED". */
const CORE_VALUES = [
  ["I", "Integrity and Accountability"],
  ["N", "Nationalism"],
  ["S", "Sense of Service"],
  ["P", "Passion for Learning and Innovation"],
  ["I", "Inclusivity"],
  ["R", "Respect for Human Rights and the Environment"],
  ["E", "Excellence"],
  ["D", "Democracy"],
] as const;

const GLANCE_STATS = [
  { target: 20, label: "Faculty Members" },
  { target: 2052, label: "Students" },
  { target: 4, label: "Academic Programs" },
  { target: 4, label: "Student Organizations" },
] as const;

export function HomePage() {
  return (
    <main className="main">
      {/* Hero */}
      <section className="hero-section">
        <div className="overlay">
          <div className="overlay-text">
            <h1>"MULA SA'YO, PARA SA BAYAN"</h1>
            <p>Official Website of PUP Parañaque Campus</p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="about-section" id="about">
        <h1 className="about-title" data-aos="fade-up">
          About PUP Parañaque
        </h1>
        <p className="subtitle" data-aos="fade-up">
          Committed to Excellence in Education
        </p>

        <div className="about-content">
          <div className="about-text" data-aos="fade-right">
            <h2>Vision</h2>
            <p>A Leading Comprehensive Polytechnic University in Asia</p>

            <h2>Mission</h2>
            <p>
              Advance an inclusive, equitable, and globally relevant polytechnic
              education towards national development.
            </p>

            <div className="about-features">
              <div className="feature-item">
                <i className="fas fa-award" />
                <span>CHED Recognized Excellence</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-globe" />
                <span>International Partnerships</span>
              </div>
            </div>
          </div>

          <div className="about-image" data-aos="fade-left">
            <video src={HERO_VIDEO} autoPlay muted loop playsInline />
          </div>
        </div>
      </section>

      {/* Goals + values */}
      <section className="goals-values-section">
        <div className="goals-container" data-aos="fade-right">
          <div className="goal-header">
            <h2 className="section-title">Strategic Goals</h2>
            <hr className="title-underline" />
          </div>

          {STRATEGIC_GOALS.map((goal) => (
            <div className="goal-category" key={goal.number}>
              <div className="goal-number">{goal.number}</div>
              <h3>{goal.title}</h3>
              <div className="goal-items">
                {goal.items.map(([code, text]) => (
                  <div className="goal-box" key={code}>
                    <strong>{code}</strong> {text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="values-container" data-aos="fade-right">
          <div className="values-header">
            <h2 className="section-title">Core Values</h2>
            <hr className="title-underline" />
          </div>
          <h1 className="inspire-title">INSPIRED</h1>

          {CORE_VALUES.map(([letter, text], index) => (
            <div className="value-box" key={`${letter}-${index}`}>
              <span className="value-letter">{letter}</span> {text}
            </div>
          ))}
        </div>
      </section>

      {/* At a glance */}
      <section className="glance-section">
        <div className="glance-header">
          <h2>PUP PQ AT A GLANCE</h2>
          <p>
            PUP Parañaque continuously advances its academic environment through
            active collaboration and meaningful engagement with experts and
            educators, supporting its commitment to excellence in education.
          </p>
        </div>

        <div className="glance-stats">
          {GLANCE_STATS.map((stat) => (
            <CounterStat key={stat.label} target={stat.target} label={stat.label} />
          ))}
        </div>
      </section>

      {/* News */}
      <section className="news-section">
        <div className="container" data-aos="fade-up">
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
          <div className="view-more">
            <Link to={PATHS.news} className="button">
              View All News
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
