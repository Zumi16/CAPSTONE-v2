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
    <main className="bg-white">
      {/* Hero */}
      <section
        className="relative flex min-h-[320px] items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="w-full bg-black/80 px-6 py-16 text-center text-white">
          <h1 className="text-3xl font-bold sm:text-5xl" data-aos="fade-in">
            Campus Life
          </h1>
          <p
            className="mx-auto mt-6 max-w-3xl text-base leading-relaxed sm:text-lg"
            data-aos="fade-in"
          >
            Welcome to PUP Parañaque Campus Life where learning goes beyond the
            classroom. Discover a vibrant academic environment filled with student
            organizations, events, cultural activities, and opportunities for
            leadership and personal growth. Here, we nurture not just scholars, but
            well-rounded individuals who contribute to a dynamic and inclusive
            university community.
          </p>
        </div>
      </section>

      {/* Facilities */}
      <section className="bg-white px-4 py-10">
        <h2
          className="mb-8 text-center text-2xl font-bold uppercase tracking-wide text-maroon sm:text-4xl"
          data-aos="fade-in"
        >
          Campus Facilities
        </h2>
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-8">
          {FACILITIES.map((facility) => (
            <div key={facility.title} data-aos="fade-in" className="text-center">
              <div
                className="h-52 w-full rounded-lg border border-gray-300 bg-cover bg-center shadow-md sm:h-64 sm:w-[420px]"
                style={{ backgroundImage: `url('${facility.image}')` }}
              />
              <div className="mt-4 text-xl font-bold tracking-widest">
                {facility.title}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Organizations */}
      <section className="bg-neutral-900 px-6 py-10 font-serif">
        <h2
          className="text-2xl font-bold uppercase tracking-wide text-white sm:text-4xl"
          data-aos="fade-right"
        >
          Student Organizations
        </h2>
        <hr className="mt-2 w-12 border-2 border-amber-500" />
        <div
          className="mt-6 flex flex-wrap items-start justify-center gap-10"
          data-aos="fade-in"
        >
          {ORGANIZATIONS.map((org) => (
            <div key={org.title} className="text-center">
              <div
                className="mx-auto h-44 w-44 rounded-full bg-cover bg-center sm:h-56 sm:w-56"
                style={{ backgroundImage: `url('${org.image}')` }}
              />
              <div className="mt-4 text-lg font-bold tracking-widest text-white">
                {org.title}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spotlight */}
      <section className="bg-white px-6 py-10">
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide sm:text-4xl">
          Student Spotlight
        </h2>
        <div className="flex flex-col items-stretch justify-center gap-6 lg:flex-row">
          {SPOTLIGHTS.map((spotlight) => (
            <blockquote
              key={spotlight.author}
              data-aos="fade-in"
              className="max-w-lg rounded-lg border-l-4 border-maroon bg-gray-100 px-7 py-5 italic text-gray-700 shadow-sm"
            >
              {spotlight.quote}
              <br />
              <span className="font-bold not-italic">{spotlight.author}</span>
            </blockquote>
          ))}
        </div>
      </section>
    </main>
  );
}
