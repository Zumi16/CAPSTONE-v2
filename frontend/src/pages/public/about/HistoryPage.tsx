import { Hero } from "@/components/Hero";
import "@/styles/pages/history.css";

/** Academic programs listed on the History page. */
const PROGRAMS = [
  "Bachelor of Science in Computer Engineering (BSCPE)",
  "Bachelor of Science in Hospitality Management (BSHM)",
  "Bachelor of Science in Information Technology (BSIT)",
  "Bachelor of Science in Office Administration (BSOA)",
];

export function HistoryPage() {
  return (
    <main className="main">
      <Hero
        title="History"
        text="Explore the rich history of PUP Parañaque, from its humble beginnings to its growth as a center of learning and innovation. This page highlights the key milestones, achievements, and transformations that have shaped the campus into what it is today."
        background="/assets/images/PUPBg4.jpg"
      />

      <section className="history-section">
        <div className="img-container">
          <div className="img" />

          <div className="history-description">
            <p>
              With the same mission as the Polytechnic University of the
              Philippines (PUP) in Sta. Mesa, Manila which is helping the poor
              but deserving students, PUP Parañaque was established on May 12,
              2011, through the effort of the former Parañaque City Mayor, Hon.
              Florencio Bernabe Jr.
            </p>
            <p>
              The Parañaque City government and Polytechnic University of the
              Philippines partnership started on May 10, 1990, when then PUP
              President Dr. Nemesio Prudente and Mayor Walfrido Ferrer signed a
              Memorandum of Agreement (MOA) establishing Parañaque as Center for
              PUP's Pamantasang Bayan.
            </p>
            <p>
              This came into fruition with the Ordinance no. 91-107 and 11-03
              and Resolution no. 04-35 and 07-39 authored by Councilor Edwin
              Benzon. This ordinance states that the present Pamantasang Bayan
              Center of the Polytechnic University of the Philippines (PUP) in
              Parañaque be converted into a regular campus.
            </p>
            <p>
              True to its commitment of providing quality and accessible
              education for the citizens of Parañaque, the City Government,
              headed by Hon. Mayor Edwin L. Olivarez, extends the operation of
              PUP in Parañaque City for 12 years. The Memorandum of Agreement
              was signed by Hon. Mayor Olivarez on October 11, 2021.
            </p>

            <ul className="program-list">
              <li>
                <h2 style={{ color: "maroon" }}>Academic Program Offerings</h2>
              </li>
              {PROGRAMS.map((program, index) => (
                <li key={program}>
                  &#11208; {program}
                  {index < PROGRAMS.length - 1 && <hr className="broken-line" />}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
