import { Link } from "react-router-dom";

import { NewsGrid } from "@/features/news/NewsGrid";
import { PATHS } from "@/routes/paths";
import { CounterStat } from "./CounterStat";

const HERO_VIDEO = "/assets/videos/pupvid.mp4";
const HERO_BG = "/assets/images/PUPBg11.jpg";
const GLANCE_BG = "/assets/images/PUPBg13.jpg";

/** A reusable maroon section heading with the little underline. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-brand sm:text-3xl">
        {children}
      </h2>
      <hr className="mx-auto mt-2.5 mb-10 h-1 w-20 rounded border-0 bg-maroon" />
    </>
  );
}

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
    <main className="bg-white">
      {/* Hero */}
      <section
        className="relative min-h-[75vh] w-full bg-cover bg-center md:min-h-screen"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="absolute inset-0 flex items-center bg-black/60 px-5 md:px-12">
          <div className="mt-28 max-w-2xl border-l-4 border-gold pl-5 font-serif text-white md:mt-64">
            <h1 className="text-2xl leading-snug md:text-4xl">
              "MULA SA'YO, PARA SA BAYAN"
            </h1>
            <p className="mt-2 indent-5 text-base md:text-lg">
              Official Website of PUP Parañaque Campus
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-6xl px-5 py-12" id="about">
        <h1
          className="text-center text-3xl font-bold text-ink sm:text-4xl"
          data-aos="fade-up"
        >
          About PUP Parañaque
        </h1>
        <p className="mb-12 text-center text-lg text-gray-500" data-aos="fade-up">
          Committed to Excellence in Education
        </p>

        <div className="flex flex-col items-start gap-8 lg:flex-row lg:justify-between">
          <div className="flex-1 lg:pr-8" data-aos="fade-right">
            <h2 className="mb-2.5 text-2xl font-bold text-brand sm:text-3xl">Vision</h2>
            <p className="mb-7 text-lg leading-relaxed text-gray-600">
              A Leading Comprehensive Polytechnic University in Asia
            </p>

            <h2 className="mb-2.5 text-2xl font-bold text-brand sm:text-3xl">Mission</h2>
            <p className="mb-7 text-lg leading-relaxed text-gray-600">
              Advance an inclusive, equitable, and globally relevant polytechnic
              education towards national development.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center gap-4 rounded-lg bg-white px-5 py-4 shadow-sm">
                <i className="fas fa-award text-xl text-brand" />
                <span className="font-medium text-slate-800">
                  CHED Recognized Excellence
                </span>
              </div>
              <div className="flex items-center gap-4 rounded-lg bg-white px-5 py-4 shadow-sm">
                <i className="fas fa-globe text-xl text-brand" />
                <span className="font-medium text-slate-800">
                  International Partnerships
                </span>
              </div>
            </div>
          </div>

          <div className="w-full lg:flex-1" data-aos="fade-left">
            <video
              src={HERO_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              className="block w-full rounded-2xl bg-gray-200 object-cover"
            />
          </div>
        </div>
      </section>

      {/* Goals + values */}
      <section className="flex flex-wrap gap-6 bg-neutral-100 p-5 text-ink sm:p-10">
        <div
          className="min-w-0 flex-1 rounded-2xl bg-white p-6 shadow-md sm:p-8 lg:basis-[45%]"
          data-aos="fade-right"
        >
          <div className="-mx-6 -mt-6 mb-4 rounded-t-2xl bg-gradient-to-r from-rose-100 to-rose-50 pt-2.5 sm:-mx-8 sm:-mt-8">
            <SectionHeading>Strategic Goals</SectionHeading>
          </div>

          {STRATEGIC_GOALS.map((goal) => (
            <div className="mb-7" key={goal.number}>
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-white">
                {goal.number}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-brand sm:text-2xl">
                {goal.title}
              </h3>
              <div>
                {goal.items.map(([code, text]) => (
                  <div
                    className="mb-2.5 rounded-lg border-l-4 border-brand bg-slate-50 p-4"
                    key={code}
                  >
                    <strong>{code}</strong> {text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="min-w-0 flex-1 rounded-2xl bg-white p-6 shadow-md sm:p-8 lg:basis-[45%]"
          data-aos="fade-right"
        >
          <div className="-mx-6 -mt-6 mb-4 rounded-t-2xl bg-gradient-to-r from-rose-100 to-rose-50 pt-2.5 sm:-mx-8 sm:-mt-8">
            <SectionHeading>Core Values</SectionHeading>
          </div>
          <h1 className="mb-10 text-center text-3xl font-bold text-brand drop-shadow sm:text-4xl">
            INSPIRED
          </h1>

          {CORE_VALUES.map(([letter, text], index) => (
            <div
              className="mb-3 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-lg sm:p-5 sm:text-xl"
              key={`${letter}-${index}`}
            >
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand font-bold text-white sm:h-11 sm:w-11">
                {letter}
              </span>
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* At a glance */}
      <section
        className="w-full bg-cover bg-center px-4 py-14 text-center font-serif text-white"
        style={{ backgroundImage: `url('${GLANCE_BG}')` }}
      >
        <div>
          <h2 className="mb-2.5 text-3xl font-bold sm:text-4xl lg:text-5xl">
            PUP PQ AT A GLANCE
          </h2>
          <p className="mx-auto mb-10 max-w-3xl text-base sm:text-lg">
            PUP Parañaque continuously advances its academic environment through
            active collaboration and meaningful engagement with experts and
            educators, supporting its commitment to excellence in education.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 sm:gap-10">
          {GLANCE_STATS.map((stat) => (
            <CounterStat key={stat.label} target={stat.target} label={stat.label} />
          ))}
        </div>
      </section>

      {/* News */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-5" data-aos="fade-up">
          <SectionHeading>News and Updates</SectionHeading>
          <NewsGrid limit={3} />
          <div className="mt-10 text-center">
            <Link
              to={PATHS.news}
              className="inline-block rounded-lg bg-maroon px-7 py-3 font-semibold text-white transition hover:bg-brand-light"
            >
              View All News
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
