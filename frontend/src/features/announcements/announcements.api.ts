import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/** A file attached to an announcement post. */
export type PostFile = {
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

/** A single announcement post (NSTP / OJT share this shape). */
export type AnnouncementPost = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string;
  files?: PostFile[];
};

type PostsResponse = {
  success: boolean;
  posts: AnnouncementPost[];
};

/** Human-readable file size, e.g. 1.5 MB. */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/** Pick a Font Awesome icon based on the file's MIME type. */
export function getFileIcon(mimeType: string): string {
  if (mimeType.includes("pdf")) return "fa-file-pdf";
  if (mimeType.includes("word")) return "fa-file-word";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation"))
    return "fa-file-powerpoint";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
    return "fa-file-excel";
  if (mimeType.includes("image")) return "fa-file-image";
  if (mimeType.includes("text")) return "fa-file-alt";
  return "fa-file";
}

export function isImageFile(mimeType: string | undefined): boolean {
  return Boolean(mimeType && mimeType.includes("image/"));
}

/** Images first, then everything else (keeps the old visual order). */
export function sortFilesByType(files: PostFile[]): PostFile[] {
  return [...files].sort((a, b) => {
    const aImage = isImageFile(a.file_type);
    const bImage = isImageFile(b.file_type);
    if (aImage && !bImage) return -1;
    if (!aImage && bImage) return 1;
    return 0;
  });
}

/** "June 26, 2026, 2:05 PM" */
export function formatPostDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Loads announcement posts from an endpoint (e.g. "/api/nstp/posts").
 * Returns the posts, a status, and a `reload` function for the retry button.
 */
export function useAnnouncements(endpoint: string) {
  const [posts, setPosts] = useState<AnnouncementPost[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const load = useCallback(() => {
    setStatus("loading");
    api
      .get<PostsResponse>(endpoint)
      .then((data) => {
        setPosts(data.success && data.posts ? data.posts : []);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error loading announcements:", err);
        setStatus("error");
      });
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, status, reload: load };
}
