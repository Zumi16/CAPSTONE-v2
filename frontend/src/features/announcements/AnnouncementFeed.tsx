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
  endpoint: string;
  officeName: string;
  emptyText: string;
};

/** One attached file: an image with overlay, or a document with an icon. */
function FileAttachment({ file }: { file: PostFile }) {
  const href = assetUrl(file.file_path);

  if (isImageFile(file.file_type)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        download={file.file_name}
        className="group relative block overflow-hidden rounded-lg border border-gray-200"
      >
        <img src={href} alt={file.file_name} loading="lazy" className="w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-xs text-white opacity-0 transition group-hover:opacity-100">
          {file.file_name} · {formatFileSize(file.file_size)}
        </div>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={file.file_name}
      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50"
    >
      <i className={cx("fa", getFileIcon(file.file_type), "text-2xl text-maroon")} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-gray-800">{file.file_name}</div>
        <div className="text-xs text-gray-500">{formatFileSize(file.file_size)}</div>
      </div>
    </a>
  );
}

/**
 * The shared feed used by the NSTP and OJT announcement pages. Loads posts and
 * renders them as a responsive list of cards.
 */
export function AnnouncementFeed({ endpoint, officeName, emptyText }: AnnouncementFeedProps) {
  const { posts, status, reload } = useAnnouncements(endpoint);

  if (status === "loading") {
    return (
      <div className="py-16 text-center text-gray-500">
        <i className="fas fa-spinner fa-spin text-5xl text-maroon" />
        <p className="mt-4">Loading announcements...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="py-16 text-center text-gray-600">
        <i className="fas fa-exclamation-circle text-5xl text-red-500" />
        <h2 className="mt-4 text-xl font-semibold">Unable to Load Announcements</h2>
        <p className="mt-2">Please check your connection and try again.</p>
        <button
          onClick={reload}
          className="mt-4 rounded bg-maroon px-6 py-2.5 font-semibold text-white hover:bg-brand-light"
        >
          <i className="fas fa-redo" /> Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <i className="fas fa-inbox text-5xl text-gray-300" />
        <h2 className="mt-4 text-xl font-semibold text-gray-700">No Announcements Yet</h2>
        <p className="mx-auto mt-2 max-w-md">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post) => (
        <article key={post.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-maroon text-white">
              <i className="fas fa-university" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{officeName}</h3>
              <p className="text-xs text-gray-500">{formatPostDate(post.created_at)}</p>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900">{post.title || "Untitled Post"}</h2>
            <div
              className="prose mt-3 max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />
            {post.files && post.files.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sortFilesByType(post.files).map((file) => (
                  <FileAttachment key={file.file_path} file={file} />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-gray-100 p-4 text-sm text-gray-400">
            <span>
              <i className="far fa-thumbs-up" /> Like
            </span>
            <span>
              <i className="far fa-comment" /> Comment
            </span>
            <span className="ml-auto text-xs">
              <i className="fas fa-info-circle" /> Interaction features coming soon
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
