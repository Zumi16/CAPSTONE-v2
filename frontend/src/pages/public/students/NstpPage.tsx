import { AnnouncementFeed } from "@/features/announcements/AnnouncementFeed";
import { PageHero } from "@/components/PageHero";

export function NstpPage() {
  return (
    <main className="bg-gray-50">
      <PageHero
        title="NSTP Announcements"
        text="Stay updated with official National Service Training Program (NSTP) announcements, including schedules, requirements, orientations, and important reminders. All information posted here is released by the campus administration for enrolled students."
      />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <AnnouncementFeed
          endpoint="/api/nstp/posts"
          officeName="NSTP Office"
          emptyText="Check back later for updates from the NSTP Office regarding schedules, requirements, and activities."
        />
      </section>
    </main>
  );
}
