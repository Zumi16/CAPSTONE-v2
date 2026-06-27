import { Link } from "react-router-dom";

import { PATHS } from "@/routes/paths";
import { NewsGrid } from "./NewsGrid";

const HR_STYLE = {
  width: "90px",
  border: "2px solid black",
  margin: "auto",
  marginBottom: "50px",
} as const;

type NewsSectionProps = {
  /** How many articles to show (default 3). */
  limit?: number;
  /** Show the "View All News" link below the grid (the homepage does). */
  showViewAll?: boolean;
};

/**
 * The "News and Updates" section shared by the Home, Admission, and Students
 * pages. Like <Hero>, this removes the duplicated wrapper markup — the styling
 * lives in "styles/layout/news.css" (imported by NewsGrid).
 */
export function NewsSection({ limit = 3, showViewAll = false }: NewsSectionProps) {
  return (
    <section className="news-section">
      <div className="container" data-aos="fade-up">
        <h2 className="section-title">News and Updates</h2>
        <hr style={HR_STYLE} />
        <NewsGrid limit={limit} />
        {showViewAll && (
          <div className="view-more">
            <Link to={PATHS.news} className="button">
              View All News
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
