import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  showValue?: boolean;
  className?: string;
  starClassName?: string;
  size?: number;
}

export function RatingStars({
  rating,
  showValue = false,
  className = "",
  starClassName = "",
  size = 16
}: RatingStarsProps) {
  // Ensure rating is between 0 and 5
  const normalizedRating = Math.max(0, Math.min(5, rating));
  
  // Generate star color based on rating
  const getStarColor = (index: number) => {
    if (index < normalizedRating) {
      return "text-yellow-400 fill-yellow-400";
    }
    return "text-gray-300";
  };

  // Формируем описание для скринридеров на русском языке
  const getRatingText = (rating: number) => {
    const roundedRating = Math.round(rating * 10) / 10;
    return `Рейтинг: ${roundedRating} из 5 звезд`;
  };

  return (
    <div 
      className={cn("flex items-center gap-1", className)} 
      role="img" 
      aria-label={getRatingText(normalizedRating)}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={normalizedRating}
      aria-valuetext={getRatingText(normalizedRating)}
    >
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          className={cn(getStarColor(index), starClassName)}
          size={size}
          aria-hidden="true"
          data-filled={index < normalizedRating ? "true" : "false"}
        />
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-medium">{normalizedRating.toFixed(1)}</span>
      )}
    </div>
  );
} 