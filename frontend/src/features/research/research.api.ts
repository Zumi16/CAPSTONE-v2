import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** A single research/extension article as returned by the backend. */
export type ResearchArticle = {
  id: number;
  title: string;
  content: string; // rich HTML
  thumbnail_path: string | null;
  created_at: string;
};

type ResearchResponse = {
  success: boolean;
  posts: ResearchArticle[];
};

/**
 * Loads research & extension articles from the backend.
 * Pass a `limit` to only keep the first N.
 */
export function useResearchExtension(limit?: number) {
  const [articles, setArticles] = useState<ResearchArticle[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let active = true;

    api
      .get<ResearchResponse>("/api/researchextension/posts")
      .then((data) => {
        if (!active) return;
        const posts = data.success ? data.posts : [];
        setArticles(limit ? posts.slice(0, limit) : posts);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error loading research & extension:", err);
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [limit]);

  return { articles, status };
}
