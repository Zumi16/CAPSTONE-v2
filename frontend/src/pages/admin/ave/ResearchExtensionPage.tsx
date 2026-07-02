import { PostFeedPage } from "./PostFeedPage";

/** adminAve → Research & Extension announcements feed. */
export function ResearchExtensionPage() {
  return (
    <PostFeedPage
      apiBase="/api/researchextension"
      adminId="adminave"
      emptyIcon="fa-book"
      emptyTitle="No Research & Extension posts yet"
      emptyText="Share research and extension updates and files here to keep everyone informed."
      maxFiles={1}
      accept=".jpg,.jpeg,.png,.gif,.webp"
    />
  );
}
