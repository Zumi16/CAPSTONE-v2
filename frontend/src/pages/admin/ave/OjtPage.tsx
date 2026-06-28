import { PostFeedPage } from "./PostFeedPage";

/** adminAve → OJT announcements feed. */
export function OjtPage() {
  return (
    <PostFeedPage
      apiBase="/api/ojt"
      adminId="adminave"
      emptyIcon="fa-briefcase"
      emptyTitle="No OJT posts yet"
      emptyText="Share OJT updates and files here to keep everyone informed."
    />
  );
}
