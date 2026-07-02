import { AnnouncementFeed } from "@/features/announcements/AnnouncementFeed";
import { FacebookPageEmbed } from "@/components/FacebookPageEmbed";
import { Hero } from "@/components/Hero";
import "@/styles/pages/nstp-public.css";

// TODO: replace with the official NSTP Facebook page URL
const NSTP_FACEBOOK_PAGE = "https://www.facebook.com/profile.php?id=100087893514674";

export function NstpPage() {
  return (
    <main className="main nstp-page">
      <Hero
        title="NSTP Announcements"
        text="Stay updated with official National Service Training Program (NSTP) announcements, including schedules, requirements, orientations, and important reminders. All information posted here is released by the campus administration for enrolled students."
        background="/assets/images/PUPBg4.jpg"
      />

      <section className="posts-section" data-aos="fade">
        <div className="posts-layout">
          <FacebookPageEmbed
            pageUrl={NSTP_FACEBOOK_PAGE}
          />
          <div className="posts-container">
            <AnnouncementFeed
              endpoint="/api/nstp/posts"
              officeName="NSTP Office"
              postClassName="nstp-public-post"
              emptyText="Check back later for updates from the NSTP Office regarding schedules, requirements, and activities."
            />
          </div>
        </div>
      </section>
    </main>
  );
}
