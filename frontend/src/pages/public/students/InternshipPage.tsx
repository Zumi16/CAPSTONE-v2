import { AnnouncementFeed } from "@/features/announcements/AnnouncementFeed";
import { FacebookPageEmbed } from "@/components/FacebookPageEmbed";
import { Hero } from "@/components/Hero";
import "@/styles/pages/internship-public.css";

// TODO: replace with the official Internship Facebook page URL
const INTERNSHIP_FACEBOOK_PAGE = "https://www.facebook.com/profile.php?id=61573085073705";

export function InternshipPage() {
  return (
    <main className="main internship-page">
      <Hero
        title="Internship Announcements"
        text="Stay informed with official Internship announcements, including internship opportunities, program details, requirements, schedules, and important updates. All announcements on this page are released by the campus administration."
        background="/assets/images/PUPBg11.jpg"
      />

      <section className="posts-section" data-aos="fade">
        <div className="posts-layout">
          <FacebookPageEmbed
            pageUrl={INTERNSHIP_FACEBOOK_PAGE}
          />
          <div className="posts-container">
            <AnnouncementFeed
              endpoint="/api/internship/posts"
              officeName="Internship Office"
              postClassName="internship-public-post"
              emptyText="Check back later for updates from the Internship Office regarding internship opportunities, requirements, and schedules."
            />
          </div>
        </div>
      </section>
    </main>
  );
}
