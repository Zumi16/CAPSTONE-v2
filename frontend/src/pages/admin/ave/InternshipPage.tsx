import { PostFeedPage } from "./PostFeedPage";

/** adminAve → Internship announcements feed (Separate from OJT). */
export function InternshipPage() {
  return (
    <PostFeedPage
      apiBase="/api/internship"
      adminId="adminave"
      emptyIcon="fa-graduation-cap"
      emptyTitle="No internship posts yet"
      emptyText="Share internship opportunities, requirements, and updates here."
    />
  );
}
