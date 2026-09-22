import { Star } from "lucide-react";
import { ratingTone } from "../property-utils";

export function RatingPill({ rating }: { rating: number }) {
  return (
    <span className="rating-pill" data-tone={ratingTone(rating)}>
      <Star aria-hidden="true" className="size-3.5 fill-current" />
      {rating.toFixed(1)}
    </span>
  );
}
