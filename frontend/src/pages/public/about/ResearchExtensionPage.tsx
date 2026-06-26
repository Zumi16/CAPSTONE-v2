import { useState } from "react";

import { useNews, type NewsArticle } from "@/features/news/news.api";
import { assetUrl } from "@/lib/config";
import { extractTextPreview, formatLongDate, formatShortDate } from "@/lib/format";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { Hero } from "@/components/Hero";
import "@/styles/pages/research&extension-public.css";

const DESCRIPTION_PARAGRAPHS = [
  "PUP Parañaque Campus researchers comprising dedicated faculty members, scholars, students, and extension partners work collaboratively to produce research that deepens academic understanding and responds to real societal needs. Drawing from diverse disciplines and local contexts, their work explores educational innovation, technology development, social issues, and community-based solutions that contribute to national and local development.",
  "Guided by a commitment to inclusivity, public service, and shared knowledge, PUP Parañaque's research and extension initiatives transform ideas into meaningful action. By integrating research with community engagement, these efforts help address complex challenges, support evidence-based decision-making, and create positive, lasting impact for individuals, communities, and society.",
  "What defines our researchers? A shared purpose to ensure that knowledge serves the people and contributes to a better future.",
];

/** Full-article popup, styled by `.article-modal` in the page CSS. */
function ArticleModal({
  article,
  onClose,
}: {
  article: NewsArticle | null;
  onClose: () => void;
}) {
  useEscapeToClose(Boolean(article), onClose);
  if (!article) return null;

  return (
    <div
      className="article-modal"
      style={{ display: "block" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="article-modal-content">
        <span className="article-close" onClick={onClose}>
          &times;
        </span>
        <div className="article-full-header">
          <h1 className="article-full-title">{article.title}</h1>
          <div className="article-full-meta">
            <span>
              <i className="fa fa-calendar" /> {formatLongDate(article.created_at)}
            </span>
            <span>
              <i className="fa fa-building" /> PUP Parañaque
            </span>
          </div>
        </div>
        {article.thumbnail_path && (
          <div className="article-full-image">
            <img src={assetUrl(article.thumbnail_path)} alt={article.title} />
          </div>
        )}
        <div
          className="article-full-body"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>
    </div>
  );
}

export function ResearchExtensionPage() {
  const { articles, status } = useNews(); // reuses the same posts shape
  const [selected, setSelected] = useState<NewsArticle | null>(null);

  return (
    <main className="main">
      <Hero
        title="Research and Extension"
        text="Through faculty-led research and community extension programs, PUP Parañaque Campus generates knowledge-driven solutions that address real-world challenges. Our initiatives span education, technology, innovation, and public service—strengthening communities today while shaping a sustainable and inclusive future."
        background="/assets/images/PUPBg3.jpg"
      />

      <section className="posts-section">
        <div className="posts-container" data-aos="fade-up">
          {status === "loading" && (
            <div className="posts-empty">
              <i className="fa fa-spinner fa-spin" />
            </div>
          )}

          {status === "error" && (
            <div className="posts-empty">
              <i className="fa fa-exclamation-triangle" />
              <h2>Error Loading Articles</h2>
              <p>Please refresh the page and try again.</p>
            </div>
          )}

          {status === "ready" && articles.length === 0 && (
            <div className="posts-empty">
              <i className="fa fa-newspaper" />
              <h2>No Articles Yet</h2>
              <p>
                Check back soon for Research &amp; Extension articles from PUP
                Parañaque Campus.
              </p>
            </div>
          )}

          {status === "ready" &&
            articles.map((post) => (
              <div
                className="article-card"
                key={post.id}
                onClick={() => setSelected(post)}
              >
                {post.thumbnail_path ? (
                  <div className="article-featured-image">
                    <img src={assetUrl(post.thumbnail_path)} alt={post.title} />
                  </div>
                ) : (
                  <div className="article-no-image">
                    <i className="fa fa-book" />
                  </div>
                )}
                <div className="article-content">
                  <h2 className="article-title">{post.title}</h2>
                  <p className="article-excerpt">
                    {extractTextPreview(post.content)}
                  </p>
                  <div className="article-meta">
                    <span className="article-date">
                      <i className="fa fa-calendar" />{" "}
                      {formatShortDate(post.created_at)}
                    </span>
                    <span className="article-read-more">
                      Read article <i className="fa fa-arrow-right" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="text-section">
        <div className="text-content">
          <div className="text-description" data-aos="fade">
            {DESCRIPTION_PARAGRAPHS.map((paragraph, index) => (
              <p className="desc-box" key={index}>
                <span className="desc-text-content">{paragraph}</span>
              </p>
            ))}
          </div>
        </div>
      </section>

      <ArticleModal article={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
