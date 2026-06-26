import { AnnouncementFeed } from "@/features/announcements/AnnouncementFeed";
import "@/styles/pages/ojt-public.css";

const HERO_BG = "/assets/images/PUPBg4.jpg";

export function OjtPage() {
  return (
    <main className="main">
      <section
        className="hero-section"
        style={{ backgroundImage: `url('${HERO_BG}')` }}
      >
        <div className="hero-content">
          <div className="hero-title-design">
            <div className="vl1" />
            <div className="hero-title&desc" data-aos="fade">
              <h1 className="hero-title">OJT Announcements</h1>
              <p className="hero-text">
                Stay informed with official On-the-Job Training (OJT)
                announcements, including partner company postings, requirements,
                orientations, deployment schedules, and important reminders. All
                updates on this page are released by the campus administration.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="posts-section" data-aos="fade">
        <div className="posts-container">
          <AnnouncementFeed
            endpoint="/api/ojt/posts"
            officeName="OJT Office"
            postClassName="ojt-public-post"
            emptyText="Check back later for updates from the OJT Office regarding partner companies, requirements, and deployment schedules."
          />
        </div>
      </section>
    </main>
  );
}
