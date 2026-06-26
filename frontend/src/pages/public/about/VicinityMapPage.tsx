import { PageHero } from "@/components/PageHero";

const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1624.0785994185621!2d120.99496305457!3d14.500088376228124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397ce995e3816ff%3A0x8dafbf0159892769!2sPolytechnic%20University%20of%20the%20Philippines%20-%20Para%C3%B1aque!5e0!3m2!1sen!2sph!4v1759058369260!5m2!1sen!2sph";

export function VicinityMapPage() {
  return (
    <main className="bg-white font-sans">
      <PageHero
        title="Vicinity Map"
        text="Locate PUP Parañaque with ease. This map provides a clear view of the campus and its surrounding area, helping visitors navigate nearby landmarks, main roads, and transportation routes."
      />

      <section className="flex justify-center px-4 py-10" data-aos="fade">
        <div className="w-full max-w-4xl">
          <iframe
            title="PUP Parañaque location map"
            src={MAP_EMBED}
            className="h-[360px] w-full rounded-lg border-0 sm:h-[500px] lg:h-[600px]"
          />
        </div>
      </section>
    </main>
  );
}
