import { PageHero } from "@/components/PageHero";

const HISTORY_IMG = "/assets/images/history-img.jpg";

const PROGRAMS = [
  "Bachelor of Science in Computer Engineering (BSCPE)",
  "Bachelor of Science in Hospitality Management (BSHM)",
  "Bachelor of Science in Information Technology (BSIT)",
  "Bachelor of Science in Office Administration (BSOA)",
];

const PARAGRAPHS = [
  "With the same mission as the Polytechnic University of the Philippines (PUP) in Sta. Mesa, Manila which is helping the poor but deserving students, PUP Parañaque was established on May 12, 2011, through the effort of the former Parañaque City Mayor, Hon. Florencio Bernabe Jr.",
  "The Parañaque City government and Polytechnic University of the Philippines partnership started on May 10, 1990, when then PUP President Dr. Nemesio Prudente and Mayor Walfrido Ferrer signed a Memorandum of Agreement (MOA) establishing Parañaque as Center for PUP's Pamantasang Bayan.",
  "This came into fruition with the Ordinance no. 91-107 and 11-03 and Resolution no. 04-35 and 07-39 authored by Councilor Edwin Benzon. This ordinance states that the present Pamantasang Bayan Center of the Polytechnic University of the Philippines (PUP) in Parañaque be converted into a regular campus.",
  "True to its commitment of providing quality and accessible education for the citizens of Parañaque, the City Government, headed by Hon. Mayor Edwin L. Olivarez, extends the operation of PUP in Parañaque City for 12 years. The Memorandum of Agreement was signed by Hon. Mayor Olivarez on October 11, 2021.",
];

export function HistoryPage() {
  return (
    <main className="bg-white font-sans">
      <PageHero
        title="History"
        text="Explore the rich history of PUP Parañaque, from its humble beginnings to its growth as a center of learning and innovation. This page highlights the key milestones, achievements, and transformations that have shaped the campus into what it is today."
      />

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div
          className="mb-8 h-56 w-full rounded-lg bg-cover bg-center sm:h-80 lg:h-[420px]"
          style={{ backgroundImage: `url('${HISTORY_IMG}')` }}
        />

        <div className="flex flex-col gap-6 text-base leading-relaxed text-gray-900 sm:text-lg">
          {PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}

          <ul className="flex flex-col gap-2.5 text-gray-700">
            <li>
              <h2 className="text-xl font-bold text-maroon sm:text-2xl">
                Academic Program Offerings
              </h2>
            </li>
            {PROGRAMS.map((program, index) => (
              <li key={program}>
                &#11208; {program}
                {index < PROGRAMS.length - 1 && (
                  <hr className="mt-2 max-w-[60%] border-dashed border-gray-300" />
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
