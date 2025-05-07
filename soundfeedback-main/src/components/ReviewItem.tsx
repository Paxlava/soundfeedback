import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Review } from "@/types/reviewTypes";
import { ReleaseType } from "@/enums/releaseType";
import { convertISOToLocalDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "@/components/ui/rating-stars";
import { ArrowRight, ThumbsDown, ThumbsUp, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnumRatingSortOrder } from "@/enums/rating";
import { memo, useState, useCallback, useEffect } from "react";
import { Skeleton } from "./ui/skeleton";

// Компонент для ленивой загрузки изображений
const LazyImage = memo(({ 
  src, 
  alt, 
  className,
  containerClass = ""
}: { 
  src?: string | null; 
  alt: string;
  className?: string;
  containerClass?: string;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleImageLoad = useCallback(() => {
    if (isMounted) {
      setIsLoading(false);
    }
  }, [isMounted]);

  const handleImageError = useCallback(() => {
    if (isMounted) {
      setIsError(true);
      setIsLoading(false);
    }
  }, [isMounted]);

  return (
    <div className={`relative ${containerClass}`}>
      {isLoading && (
        <Skeleton className={cn(className, "absolute inset-0")} />
      )}
      {!isError ? (
        <img 
          src={src || ""} 
          alt={alt}
          className={cn(className, isLoading ? "invisible" : "visible")}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <div className={cn("flex items-center justify-center bg-muted", className)}>
          <span className="text-sm text-muted-foreground">Image not available</span>
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = "LazyImage";

// Компонент заглушки для аватара
const LazyAvatar = memo(({ 
  src, 
  fallback, 
  className
}: { 
  src?: string | null; 
  fallback: React.ReactNode; 
  className?: string;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsError(true);
    setIsLoading(false);
  }, []);

  return (
    <div className="relative">
      {isLoading && (
        <Skeleton className={cn("rounded-full", className)} />
      )}
      <Avatar className={className}>
        <AvatarImage 
          src={src} 
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    </div>
  );
});

LazyAvatar.displayName = "LazyAvatar";

interface ReviewItemProps {
  review: Review;
  enableClicks?: boolean;
  onReviewCardClick?: (reviewId: string) => void;
  className?: string;
  showActions?: boolean;
}

function getReleaseTypeBadgeColor(type: ReleaseType) {
  switch (type) {
    case ReleaseType.ALBUM:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case ReleaseType.EP:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case ReleaseType.COMPILATION:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case ReleaseType.SINGLE:
    default:
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
  }
}

// Преобразуем URL изображения, чтобы он работал в продакшн-окружении
function getCoverImageUrl(url: string | null) {
  if (!url) return null;
  
  // Если URL уже правильный, возвращаем его как есть
  if (url.startsWith("http") || url.startsWith("data:")) {
    return url;
  }
  
  // Если URL относительный, добавляем базовый URL
  return import.meta.env.VITE_API_URL + url;
}

const ReviewItem = memo(({ 
  review, 
  enableClicks = true, 
  onReviewCardClick, 
  className,
  showActions = true
}: ReviewItemProps) => {
  const releaseTypeBadgeColor = getReleaseTypeBadgeColor(review.releaseType);
  const formattedDate = convertISOToLocalDate(review.createdAt);
  const coverImageUrl = getCoverImageUrl(review.coverImageUrl);
  
  // Обработчик клика по карточке
  const handleClick = useCallback(() => {
    if (enableClicks && onReviewCardClick) {
      onReviewCardClick(review.id);
    }
  }, [enableClicks, onReviewCardClick, review.id]);

  return (
    <Card className={cn("overflow-hidden", 
      enableClicks ? "cursor-pointer hover:shadow-md transition-shadow duration-200" : "",
      className
    )} 
    onClick={handleClick}
    role={enableClicks ? "button" : undefined}
    aria-label={enableClicks ? `Открыть рецензию на ${review.artist} - ${review.title}` : undefined}
    tabIndex={enableClicks ? 0 : undefined}
    >
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <LazyAvatar 
            src={review.user?.avatarUrl} 
            fallback={review.user?.username?.[0]?.toUpperCase() || "U"}
            className="h-8 w-8"
          />
          <div>
            <Link 
              to={`/profile/${review.user?.username}`} 
              className="text-sm font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Перейти к профилю пользователя ${review.user?.username}`}
            >
              {review.user?.username}
            </Link>
            <CardDescription className="text-xs">{formattedDate}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <div>
            <CardTitle className="mb-1">{review.artist} - {review.title}</CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn("text-xs", releaseTypeBadgeColor)}>
                {review.releaseType}
              </Badge>
              <RatingStars rating={review.rating} showValue />
            </div>
            <p className="text-sm line-clamp-3">{review.content}</p>
          </div>
          {review.coverImageUrl && (
            <LazyImage
              src={coverImageUrl}
              alt={`${review.artist} - ${review.title}`}
              className="w-20 h-20 object-cover rounded"
            />
          )}
        </div>
      </CardContent>
      {showActions && (
        <CardFooter className="p-4 pt-0 flex justify-between">
          <div className="flex gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 h-8 px-2"
              aria-label={`Нравится: ${review.likeCount || 0}`}
              title="Нравится"
            >
              <ThumbsUp className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs">{review.likeCount || 0}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 h-8 px-2"
              aria-label={`Не нравится: ${review.dislikeCount || 0}`}
              title="Не нравится"
            >
              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs">{review.dislikeCount || 0}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 h-8 px-2"
              aria-label={`Просмотры: ${review.views || 0}`}
              title="Просмотры"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs">{review.views || 0}</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link 
              to={`/reviews/${review.id}`} 
              onClick={(e) => e.stopPropagation()}
              aria-label={`Подробнее о рецензии на ${review.artist} - ${review.title}`}
            >
              <span className="mr-1">Подробнее</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
});

ReviewItem.displayName = "ReviewItem";

export default ReviewItem; 