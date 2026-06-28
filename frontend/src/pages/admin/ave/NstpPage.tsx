import { PostFeedPage } from "./PostFeedPage";

/** adminAve → NSTP announcements feed. */
export function NstpPage() {
  return (
    <PostFeedPage
      apiBase="/api/nstp"
      adminId="adminave"
      emptyIcon="fa-scroll"
      emptyTitle="No NSTP posts yet"
      emptyText="Share NSTP updates and files here to keep everyone informed."
    />
  );
}
