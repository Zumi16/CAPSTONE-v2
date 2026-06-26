import { AnnouncementFeed } from "@/features/announcements/AnnouncementFeed";
import { PageHero } from "@/components/PageHero";

export function OjtPage() {
  return (
    <main className="bg-gray-50">
      <PageHero
        title="OJT Announcements"
        text="Stay informed with official On-the-Job Training (OJT) announcements, including partner company postings, requirements, orientations, deployment schedules, and important reminders. All updates on this page are released by the campus administration."
      />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <AnnouncementFeed
          endpoint="/api/ojt/posts"
          officeName="OJT Office"
          emptyText="Check back later for updates from the OJT Office regarding partner companies, requirements, and deployment schedules."
        />
      </section>
    </main>
  );
}
