import { PageHero } from "@/components/PageHero";

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

export function AdministrativeOfficialsPage() {
  return (
    <main className="bg-white">
      <PageHero
        title="Administrative Officials"
        text="Get to know the dedicated officials behind the academic excellence of PUP Parañaque. Explore our directory to learn about their professional backgrounds, academic achievements, research contributions, and roles within the university."
      />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-10 text-center text-2xl font-bold text-maroon sm:text-3xl" data-aos="fade-up">
          Our Dedicated Officials
        </h2>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICIALS.map((official) => (
            <div
              key={official.name}
              data-aos="fade-up"
              className="overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <img
                src={official.image}
                alt={official.name}
                className="h-72 w-full object-cover object-top"
              />
              <div className="p-5 text-center">
                <h3 className="text-lg font-bold text-gray-900">{official.name}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {official.role.map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < official.role.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
