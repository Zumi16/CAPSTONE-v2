import { useEffect, useState, type CSSProperties } from "react";

import { cx } from "@/lib/cx";
import { Hero } from "@/components/Hero";
import "@/styles/pages/administrativeofficials.css";

type Official = {
  name: string;
  role: string[];
  image: string;
};

const OFFICIALS: Official[] = [
  {
    name: "Atty. Ernesto C. Salao, LL.M.",
    role: ["Campus Director"],
    image: "/assets/images/facultyimage/DirekSalao.png",
  },
  {
    name: "Jefferson F. Serrano, MPES",
    role: ["Assistant Professor I", "Head, Academic Programs"],
    image: "/assets/images/facultyimage/serranojf.jpg",
  },
  {
    name: "Mila Joy J. Martinez, MS HRM",
    role: ["Instructor III", "Head, Student Affairs and Services"],
    image: "/assets/images/facultyimage/martinezmjj.jpg",
  },
  {
    name: "Ribert R. Enierga, MIT",
    role: ["Assistant Professor IV", "Registrar and Head of Admission"],
    image: "/assets/images/facultyimage/eniergarr.jpg",
  },
  {
    name: "Avegail Jean M. Avilado",
    role: ["Instructor I", "Research and Extension Coordinator"],
    image: "/assets/images/facultyimage/aviladoajm.jpg",
  },
  {
    name: "Elizabeth L. Pambuena, PhD",
    role: ["Associate Professor IV", "Collecting and Disbursing Officer"],
    image: "/assets/images/facultyimage/pambuenael.jpg",
  },
];

const total = OFFICIALS.length;

/** Compute the look of one card relative to the active index (from the old JS). */
function cardStyle(index: number, current: number): {
  style: CSSProperties;
  active: boolean;
  side: boolean;
} {
  let position = index - current;
  if (position > total / 2) position -= total;
  else if (position < -total / 2) position += total;

  const active = position === 0;
  const side = Math.abs(position) === 1;
  const offset = position * 430;

  return {
    active,
    side,
    style: {
      left: "50%",
      transform: active
        ? "translateX(-50%) scale(1)"
        : `translateX(calc(-50% + ${offset}px)) scale(0.85)`,
      opacity: active ? 1 : side ? 0.6 : 0.3,
      zIndex: active ? 5 : 1,
      pointerEvents: active ? "auto" : "none",
      display: Math.abs(position) <= 2 ? "block" : "none",
    },
  };
}

export function AdministrativeOfficialsPage() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => (c + 1) % total);
  const prev = () => setCurrent((c) => (c - 1 + total) % total);

  // Auto-advance every 5 seconds, like the original carousel.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(next, 5000);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <main className="main admin-officials-page">
      <Hero
        title="Administrative Officials"
        text="Get to know the dedicated officials behind the academic excellence of PUP Parañaque. Explore our directory to learn about their professional backgrounds, academic achievements, research contributions, and roles within the university. These are the individuals who guide, support, and inspire the next generation of PUP scholars."
        background="/assets/images/PUPBg13.jpg"
      />

      <section className="carousel-section">
        <h2 className="carousel-title" data-aos="fade-up">
          Our Dedicated Officials
        </h2>

        <div
          className="carousel-container"
          data-aos="fade"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="nav-button prev" onClick={prev}>
            <i className="fas fa-chevron-left fa-2x" />
          </div>

          <div className="carousel-track">
            {OFFICIALS.map((official, index) => {
              const { style, active, side } = cardStyle(index, current);
              return (
                <div
                  className={cx("official-card", active && "active", side && "side")}
                  style={style}
                  key={official.name}
                >
                  <img
                    src={official.image}
                    alt={official.name}
                    className="card-image"
                  />
                  <div className="card-content">
                    <h3 className="official-name">{official.name}</h3>
                    <p className="official-role">
                      {official.role.map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < official.role.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="nav-button next" onClick={next}>
            <i className="fas fa-chevron-right fa-2x" />
          </div>
        </div>

        <div className="dots-container">
          {OFFICIALS.map((official, index) => (
            <div
              key={official.name}
              className={cx("dot", index === current && "active")}
              onClick={() => setCurrent(index)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
