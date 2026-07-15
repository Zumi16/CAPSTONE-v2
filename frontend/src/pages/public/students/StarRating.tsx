import { useState } from "react";

/**
 * A 5-star rating with proper hover state support.
 * The component is controlled — pass the current `value` and an `onChange`.
 */
type StarRatingProps = {
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  /** "star-rating" (big) or "star-rating-small" (criteria rows). */
  size?: "large" | "small";
};

export function StarRating({ name, value, onChange, size = "large" }: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const wrapperClass = size === "large" ? "star-rating" : "star-rating-small";
  const starClass = size === "large" ? "star" : "star-small";
  const displayRating = hoveredRating ?? value;

  return (
    <div className={wrapperClass} onMouseLeave={() => setHoveredRating(null)}>
      {[5, 4, 3, 2, 1].map((star) => (
        <span key={star} style={{ display: "contents" }}>
          <input
            type="radio"
            name={name}
            id={`${name}_${star}`}
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            aria-label={`${star} stars`}
          />
          <label
            htmlFor={`${name}_${star}`}
            className={starClass}
            onMouseEnter={() => setHoveredRating(star)}
            style={{
              color: displayRating !== null && star <= displayRating ? "#ffd700" : "#ddd",
            }}
          >
            ★
          </label>
        </span>
      ))}
    </div>
  );
}
