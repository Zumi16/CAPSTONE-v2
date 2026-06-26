import { AnnouncementFeed } from "@/features/announcements/AnnouncementFeed";
import "@/styles/pages/nstp-public.css";

const HERO_BG = "/assets/images/PUPBg4.jpg";

export function NstpPage() {
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
              <h1 className="hero-title">NSTP Announcements</h1>
              <p className="hero-text">
                Stay updated with official National Service Training Program
                (NSTP) announcements, including schedules, requirements,
                orientations, and important reminders. All information posted
                here is released by the campus administration for enrolled
                students.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="posts-section" data-aos="fade">
        <div className="posts-container">
          <AnnouncementFeed
            endpoint="/api/nstp/posts"
            officeName="NSTP Office"
            postClassName="nstp-public-post"
            emptyText="Check back later for updates from the NSTP Office regarding schedules, requirements, and activities."
          />
        </div>
      </section>
    </main>
  );
}
