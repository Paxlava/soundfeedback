// ReviewsList.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRatingColor } from "@/lib/utils";
import { Link } from "react-router-dom";
import { EnumRating, EnumRatingType } from "@/enums/rating";
import { Review } from "@/types/reviewTypes";
import { EnumStatus } from "@/enums/status";
import { useIsMobile } from "@/hooks/use-mobile";
import { SERVER_URL } from "@/lib/utils";

interface ReviewsListProps {
  currentReviews?: Review[];
  reviews?: Review[];
  statusType?: string;
  className?: string;
}

const ReviewsList = ({ currentReviews, reviews, statusType, className = "" }: ReviewsListProps) => {
  const isMobile = useIsMobile();
  const displayReviews = reviews || currentReviews || [];
  
  const formatRating = (rating: EnumRatingType) => {
    if (!rating) return "Без оценки";
    return EnumRating[rating];
  };

  // Функция для корректной обработки URL обложки
  const getImageUrl = (url: string | undefined, fallbackUrl: string = "/placeholder.svg"): string => {
    if (!url) return fallbackUrl;
    
    // Если URL начинается с http(s):// или data:, возвращаем как есть
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    
    // Если это относительный путь, добавляем SERVER_URL
    if (url.startsWith('/')) {
      return `${SERVER_URL}${url}`;
    }
    
    // Если ничего не подошло, используем fallback
    return fallbackUrl;
  };

  // Когда есть и customCoverUrl и coverUrl, используем customCoverUrl в приоритете
  const getReviewCoverUrl = (review: Review): string => {
    if (review.customCoverUrl) {
      return getImageUrl(review.customCoverUrl);
    }
    return getImageUrl(review.coverUrl);
  };

  // Добавляем функцию для обработки клика по карточке рецензии
  const handleReviewClick = (reviewId: string, event: React.MouseEvent) => {
    // Проверяем, какая кнопка мыши была нажата
    if (event.button === 1) { // 1 - средняя кнопка (колесико)
      // Открываем в новой вкладке
      window.open(`/review/${reviewId}`, '_blank');
      // Предотвращаем стандартное поведение (часто в браузерах это автоскролл)
      event.preventDefault();
    } else if (event.button === 0) { // 0 - левая кнопка
      // Открываем в текущей вкладке
      window.location.href = `/review/${reviewId}`;
    }
  };

  if (displayReviews.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        {statusType === EnumStatus.APPROVED && "У вас нет опубликованных рецензий"}
        {statusType === EnumStatus.PENDING && "У вас нет рецензий на рассмотрении"}
        {statusType === EnumStatus.REJECTED && "У вас нет отклоненных рецензий"}
        {!statusType && "Нет рецензий для отображения"}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className={`grid grid-cols-1 ${isMobile ? "" : "md:grid-cols-2 lg:grid-cols-3"} gap-4`}>
        {displayReviews.map((review) => (
          <Card 
            key={review.id} 
            className={`cursor-pointer hover:shadow-lg transition-shadow border-2 ${getRatingColor(review.rating as keyof typeof EnumRating)}`} 
            onClick={(e) => handleReviewClick(review.id, e)}
            onMouseDown={(e) => {
              // Обрабатываем событие нажатия кнопки мыши
              if (e.button === 1) { // Средняя кнопка (колесико)
                handleReviewClick(review.id, e);
              }
            }}
          >
            <CardHeader className={isMobile ? "p-3" : ""}>
              <img 
                src={getReviewCoverUrl(review)}
                alt={`${review.album} cover`} 
                className="w-full aspect-square object-cover rounded-md mb-2" 
                onError={(e) => {
                  // Если изображение не загрузилось, показываем плейсхолдер
                  const target = e.target as HTMLImageElement;
                  console.log(`Ошибка загрузки изображения: ${target.src}`);
                  target.src = "/placeholder.svg";
                }}
              />
              <CardTitle className={isMobile ? "text-base" : "text-xl"}>{review.album}</CardTitle>
            </CardHeader>
            <CardContent className={isMobile ? "p-3 pt-0" : ""}>
              <p className={`${isMobile ? "text-base" : "text-lg"} text-muted-foreground`}>{review.artist}</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-muted-foreground">
                  {new Date(review.createdAt).toLocaleString("ru-RU", { 
                    day: "2-digit", 
                    month: "2-digit", 
                    year: isMobile ? undefined : "numeric", 
                    hour: "2-digit", 
                    minute: "2-digit", 
                    hour12: false 
                  })}
                </p>
                <div className="flex flex-row gap-2 items-center justify-center">
                  {review.author && (
                    <Link 
                      to={`/profile/${review.author}`} 
                      className="text-sm text-primary hover:underline" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      {review.author}
                    </Link>
                  )}
                  <span className="text-muted-foreground">•</span>
                  <span className={`text-sm font-medium ${getRatingColor(review.rating as keyof typeof EnumRating)}`}>
                    {formatRating(review.rating)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
