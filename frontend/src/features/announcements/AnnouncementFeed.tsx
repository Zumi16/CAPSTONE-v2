import { assetUrl } from "@/lib/config";
import { cx } from "@/lib/cx";
import {
  formatFileSize,
  formatPostDate,
  getFileIcon,
  isImageFile,
  sortFilesByType,
  useAnnouncements,
  type PostFile,
} from "./announcements.api";

type AnnouncementFeedProps = {
  /** Backend endpoint, e.g. "/api/nstp/posts". */
  endpoint: string;
  /** Office name shown as the author, e.g. "NSTP Office". */
  officeName: string;
  /** Post CSS class from the page's stylesheet, e.g. "nstp-public-post". */
  postClassName: string;
  /** Friendly text for the empty state. */
  emptyText: string;
};

/** One attached file: an image with overlay, or a document with an icon. */
function FileAttachment({ file }: { file: PostFile }) {
  const href = assetUrl(file.file_path);

  if (isImageFile(file.file_type)) {
    return (
      <div className="post-file-item image">
        <img src={href} alt={file.file_name} loading="lazy" />
        <div className="download-icon">
          <i className="fa fa-download" />
        </div>
        <div className="image-overlay">
          <a href={href} target="_blank" rel="noreferrer" download={file.file_name}>
            {file.file_name}
          </a>
          <span className="file-size">{formatFileSize(file.file_size)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="post-file-item document">
      <i className={cx("fa", getFileIcon(file.file_type), "file-icon")} />
      <div className="file-details">
        <a href={href} target="_blank" rel="noreferrer" download={file.file_name}>
          {file.file_name}
        </a>
        <span className="file-size">{formatFileSize(file.file_size)}</span>
      </div>
    </div>
  );
}

/**
 * The shared feed used by the NSTP and OJT announcement pages. It loads posts
 * from the given endpoint and renders them as a list of cards, matching the
 * old `nstp-public.js` / `ojt-public.js` markup.
 */
export function AnnouncementFeed({
  endpoint,
  officeName,
  postClassName,
  emptyText,
}: AnnouncementFeedProps) {
  const { posts, status, reload } = useAnnouncements(endpoint);

  if (status === "loading") {
    return (
      <div className="loading-container" style={{ textAlign: "center", padding: "60px 20px", color: "#605e5c" }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 48, color: "#822020", marginBottom: 20 }} />
        <p style={{ fontSize: 16 }}>Loading announcements...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="error-state" style={{ textAlign: "center", padding: "60px 20px" }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: 64, color: "#d13438", marginBottom: 20 }} />
        <h2 style={{ fontSize: 24, marginBottom: 12, color: "#323130" }}>
          Unable to Load Announcements
        </h2>
        <p style={{ fontSize: 16, color: "#605e5c", marginBottom: 20 }}>
          Please check your connection and try again.
        </p>
        <button
          onClick={reload}
          style={{
            padding: "10px 24px",
            background: "#822020",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <i className="fas fa-redo" /> Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="empty-state" style={{ textAlign: "center", padding: "80px 20px", color: "#605e5c" }}>
        <i className="fas fa-inbox" style={{ fontSize: 64, color: "#d2d0ce", marginBottom: 20 }} />
        <h2 style={{ fontSize: 24, marginBottom: 12, color: "#323130" }}>
          No Announcements Yet
        </h2>
        <p style={{ fontSize: 16, maxWidth: 500, margin: "0 auto" }}>{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      {posts.map((post) => (
        <article className={postClassName} key={post.id}>
          <div className="post-header">
            <div className="post-author-info">
              <div className="author-avatar">
                <i className="fas fa-university" />
              </div>
              <div className="author-details">
                <h3 className="author-name">{officeName}</h3>
                <p className="post-timestamp">{formatPostDate(post.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="post-body">
            <h2 className="post-title">{post.title || "Untitled Post"}</h2>
            <div
              className="post-content"
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />
            {post.files && post.files.length > 0 && (
              <div className="post-files">
                {sortFilesByType(post.files).map((file) => (
                  <FileAttachment key={file.file_path} file={file} />
                ))}
              </div>
            )}
          </div>

          <div className="post-footer">
            <div className="post-interactions">
              <button className="interaction-btn like-btn" disabled>
                <i className="far fa-thumbs-up" />
                <span>Like</span>
              </button>
              <button className="interaction-btn comment-btn" disabled>
                <i className="far fa-comment" />
                <span>Comment</span>
              </button>
            </div>

            <div className="comment-section">
              <div className="comment-input-wrapper">
                <div className="comment-avatar">
                  <i className="fas fa-user-circle" />
                </div>
                <input
                  type="text"
                  className="comment-input"
                  placeholder="Comments are currently disabled"
                  disabled
                />
              </div>
              <p className="comment-notice">
                <i className="fas fa-info-circle" /> Interaction features coming
                soon
              </p>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
