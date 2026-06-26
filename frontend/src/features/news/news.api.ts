import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** A single news article as returned by the backend. */
export type NewsArticle = {
  id: number;
  title: string;
  content: string; // rich HTML
  thumbnail_path: string | null;
  created_at: string;
};

type NewsResponse = {
  success: boolean;
  posts: NewsArticle[];
};

/**
 * Loads news articles from the backend.
 * Pass a `limit` to only keep the first N (the homepage shows 3).
 */
export function useNews(limit?: number) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let active = true;

    api
      .get<NewsResponse>("/api/news/posts")
      .then((data) => {
        if (!active) return;
        const posts = data.success ? data.posts : [];
        setArticles(limit ? posts.slice(0, limit) : posts);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error loading news:", err);
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [limit]);

  return { articles, status };
}
