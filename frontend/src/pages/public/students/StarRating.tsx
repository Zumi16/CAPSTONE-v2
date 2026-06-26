import { useState } from "react";
import { cx } from "@/lib/cx";

type StarRatingProps = {
  value: number | null;
  onChange: (value: number) => void;
  /** "large" for the overall rating, "small" for the criteria rows. */
  size?: "large" | "small";
};

/**
 * A 5-star rating. Stars fill up to the hovered or selected value. Pure React
 * state drives the fill (no CSS tricks needed), so it works anywhere.
 */
export function StarRating({ value, onChange, size = "large" }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;
  const starSize = size === "large" ? "text-3xl" : "text-xl";

  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(star)}
          onClick={() => onChange(star)}
          className={cx(
            starSize,
            "leading-none transition-colors",
            star <= active ? "text-amber-400" : "text-gray-300",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}
