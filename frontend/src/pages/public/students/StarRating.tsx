/**
 * A 5-star rating built the same way as the old site: radio inputs in 5→1
 * order so the existing CSS (`:checked ~ label`) can fill the stars. The
 * component is controlled — pass the current `value` and an `onChange`.
 */
type StarRatingProps = {
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  /** "star-rating" (big) or "star-rating-small" (criteria rows). */
  size?: "large" | "small";
};

export function StarRating({ name, value, onChange, size = "large" }: StarRatingProps) {
  const wrapperClass = size === "large" ? "star-rating" : "star-rating-small";
  const starClass = size === "large" ? "star" : "star-small";

  return (
    <div className={wrapperClass}>
      {[5, 4, 3, 2, 1].map((star) => (
        <span key={star} style={{ display: "contents" }}>
          <input
            type="radio"
            name={name}
            id={`${name}_${star}`}
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
          />
          <label htmlFor={`${name}_${star}`} className={starClass}>
            ★
          </label>
        </span>
      ))}
    </div>
  );
}
