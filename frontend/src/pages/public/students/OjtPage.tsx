import { AnnouncementFeed } from "@/features/announcements/AnnouncementFeed";
import { FacebookPageEmbed } from "@/components/FacebookPageEmbed";
import { Hero } from "@/components/Hero";
import "@/styles/pages/ojt-public.css";

// TODO: replace with the official OJT Facebook page URL
const OJT_FACEBOOK_PAGE = "https://www.facebook.com/profile.php?id=61573085073705";

export function OjtPage() {
  return (
    <main className="main ojt-page">
      <Hero
        title="OJT Announcements"
        text="Stay informed with official On-the-Job Training (OJT) announcements, including partner company postings, requirements, orientations, deployment schedules, and important reminders. All updates on this page are released by the campus administration."
        background="/assets/images/PUPBg11.jpg"
      />

      <section className="posts-section" data-aos="fade">
        <div className="posts-layout">
          <FacebookPageEmbed
            pageUrl={OJT_FACEBOOK_PAGE}
          />
          <div className="posts-container">
            <AnnouncementFeed
              endpoint="/api/ojt/posts"
              officeName="OJT Office"
              postClassName="ojt-public-post"
              emptyText="Check back later for updates from the OJT Office regarding partner companies, requirements, and deployment schedules."
            />
          </div>
        </div>
      </section>
    </main>
  );
}
