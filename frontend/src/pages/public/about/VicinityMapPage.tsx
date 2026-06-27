import { Hero } from "@/components/Hero";
import "@/styles/pages/vicinitymap.css";

const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1624.0785994185621!2d120.99496305457!3d14.500088376228124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397ce995e3816ff%3A0x8dafbf0159892769!2sPolytechnic%20University%20of%20the%20Philippines%20-%20Para%C3%B1aque!5e0!3m2!1sen!2sph!4v1759058369260!5m2!1sen!2sph";

export function VicinityMapPage() {
  return (
    <main className="main vicinity-page">
      <Hero
        title="Vicinity Map"
        text="Locate PUP Parañaque with ease. This map provides a clear view of the campus and its surrounding area, helping visitors navigate nearby landmarks, main roads, and transportation routes."
        background="/assets/images/PUPBg2.jpg"
      />

      <section className="maps-section" data-aos="fade">
        <div className="maps-container">
          <iframe
            title="PUP Parañaque location map"
            src={MAP_EMBED}
            width={1000}
            height={600}
          />
        </div>
        <div className="view-button" />
      </section>
    </main>
  );
}
