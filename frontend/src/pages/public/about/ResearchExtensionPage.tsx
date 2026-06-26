import { useState } from "react";

import { PageHero } from "@/components/PageHero";
import { useNews, type NewsArticle } from "@/features/news/news.api";
import { NewsCard } from "@/features/news/NewsCard";
import { NewsModal } from "@/features/news/NewsModal";

const DESCRIPTION_PARAGRAPHS = [
  "PUP Parañaque Campus researchers comprising dedicated faculty members, scholars, students, and extension partners work collaboratively to produce research that deepens academic understanding and responds to real societal needs. Drawing from diverse disciplines and local contexts, their work explores educational innovation, technology development, social issues, and community-based solutions that contribute to national and local development.",
  "Guided by a commitment to inclusivity, public service, and shared knowledge, PUP Parañaque's research and extension initiatives transform ideas into meaningful action. By integrating research with community engagement, these efforts help address complex challenges, support evidence-based decision-making, and create positive, lasting impact for individuals, communities, and society.",
  "What defines our researchers? A shared purpose to ensure that knowledge serves the people and contributes to a better future.",
];

export function ResearchExtensionPage() {
  const { articles, status } = useNews();
  const [selected, setSelected] = useState<NewsArticle | null>(null);

  return (
    <main className="bg-white">
      <PageHero
        title="Research and Extension"
        text="Through faculty-led research and community extension programs, PUP Parañaque Campus generates knowledge-driven solutions that address real-world challenges. Our initiatives span education, technology, innovation, and public service—strengthening communities today while shaping a sustainable and inclusive future."
      />

      <section className="mx-auto max-w-6xl px-4 py-10" data-aos="fade-up">
        {status === "loading" && (
          <div className="py-12 text-center text-gray-500">
            <i className="fa fa-spinner fa-spin text-3xl text-maroon" />
          </div>
        )}
        {status === "error" && (
          <div className="py-12 text-center text-gray-500">
            <i className="fa fa-exclamation-triangle mb-3 text-4xl text-red-500" />
            <h2 className="text-lg font-semibold">Error Loading Articles</h2>
          </div>
        )}
        {status === "ready" && articles.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <i className="fa fa-newspaper mb-3 text-4xl text-gray-300" />
            <h2 className="text-lg font-semibold">No Articles Yet</h2>
            <p>Check back soon for Research &amp; Extension articles.</p>
          </div>
        )}
        {status === "ready" && articles.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((post) => (
              <NewsCard key={post.id} article={post} onOpen={setSelected} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-gray-50 px-4 py-12">
        <div className="mx-auto flex max-w-4xl flex-col gap-5" data-aos="fade">
          {DESCRIPTION_PARAGRAPHS.map((paragraph, index) => (
            <p
              key={index}
              className="rounded-lg bg-rose-50/50 p-5 leading-relaxed text-gray-800 shadow-sm"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <NewsModal article={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
