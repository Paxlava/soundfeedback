import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { EnumRating, EnumRatingType } from "@/enums/rating";
import { EnumStatus } from "@/enums/status";
import { Review } from "@/types/reviewTypes";
import { getRatingColor } from "@/lib/utils";
import { SERVER_URL } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getUserReviewsPaginatedWithFilters, getAdminReviewsPaginated } from "@/services/reviewService";
import Loader from "@/components/Loader";
import { UniversalPagination } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/useAuth";
import { EnumRole } from "@/enums/role";
import { Eye, FileX, RefreshCw } from "lucide-react";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReviewsListProps {
  isAdmin?: boolean;
  search: string;
  releaseType: string;
  rating: EnumRatingType | "all";
  sortOrder: "newest" | "oldest";
}

const REVIEWS_PER_PAGE = 6;

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

// Функция для форматирования числа просмотров
const formatViewCount = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

const ReviewsList: React.FC<ReviewsListProps> = ({ isAdmin = false, search, releaseType, rating, sortOrder }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Ref для наблюдения за последним элементом (для бесконечной прокрутки)
  const observer = useRef<IntersectionObserver | null>(null);
  const lastReviewElementRef = useRef<HTMLDivElement | null>(null);
  
  // Ref для определения, выполняется ли в данный момент загрузка
  const isLoadingRef = useRef(false);
  
  // Используем IntersectionObserver для отслеживания последнего элемента
  useLayoutEffect(() => {
    // Если не мобильное устройство или не в режиме бесконечной прокрутки, выходим
    if (!isMobile) return;
    
    const lastElement = lastReviewElementRef.current;
    if (!lastElement) return;
    
    // Отключаем текущий observer
    if (observer.current) {
      observer.current.disconnect();
    }
    
    // Не создаем новый observer, если загружены все рецензии или в процессе загрузки
    if (reviews.length >= totalReviews || isLoadingMore) return;
    
    // Создаем новый observer для отслеживания последнего элемента
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingRef.current) {
          // Когда последний элемент входит в область видимости, подгружаем следующую страницу
          handleLoadMore();
        }
      },
      { threshold: 0.5 } // Когда элемент виден на 50%
    );
    
    observer.current.observe(lastElement);
    
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [reviews, totalReviews, isLoadingMore, isMobile]);

  // Сбрасываем страницу при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
    setReviews([]);
  }, [search, releaseType, rating, sortOrder]);

  // Функция для загрузки рецензий
  const loadReviews = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      isLoadingRef.current = true;
      setError(null);
      
      let result;
      if (isAdmin) {
        result = await getAdminReviewsPaginated(
          EnumStatus.APPROVED,
          pageNum,
          REVIEWS_PER_PAGE,
          search,
          releaseType,
          rating,
          sortOrder
        );
      } else {
        result = await getUserReviewsPaginatedWithFilters(
          EnumStatus.APPROVED,
          pageNum,
          REVIEWS_PER_PAGE,
          search,
          releaseType,
          rating,
          sortOrder,
          user?.uid,
          user?.role === EnumRole.ADMIN
        );
      }
      
      if (append) {
        // Добавляем новые рецензии к существующим
        setReviews(prev => [...prev, ...result.reviews]);
      } else {
        // Заменяем рецензии новыми
        setReviews(result.reviews);
      }
      
      setTotalReviews(result.total);
    } catch (err: any) {
      console.error("Ошибка при загрузке рецензий:", err);
      setError(err.message || "Не удалось загрузить рецензии. Проверьте подключение к сети и повторите попытку.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [isAdmin, search, releaseType, rating, sortOrder, user]);

  // Функция для загрузки следующей страницы (бесконечная прокрутка)
  const handleLoadMore = useCallback(() => {
    if (reviews.length >= totalReviews || isLoadingMore) return;
    
    const nextPage = Math.ceil(reviews.length / REVIEWS_PER_PAGE) + 1;
    loadReviews(nextPage, true);
  }, [reviews.length, totalReviews, isLoadingMore, loadReviews]);

  // Загрузка первоначальных данных
  useEffect(() => {
    loadReviews(currentPage);
  }, [loadReviews, currentPage]);

  // Расчет общего количества страниц
  const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);

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

  // Обработка ошибок при загрузке изображений
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    console.log(`Ошибка загрузки изображения: ${target.src}`);
    target.src = "/placeholder.svg";
  };

  // Функция для пагинации на десктопе
  const handlePageChange = (page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
      
      // Прокручиваем страницу вверх при смене страницы
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && reviews.length === 0) {
    return <Loader />;
  }

  if (error && reviews.length === 0) {
    return <ErrorDisplay message={error} onRetry={() => loadReviews(1)} />;
  }

  if (reviews.length === 0) {
    return (
      <EmptyState 
        icon={FileX}
        title="Рецензии не найдены"
        description="В данный момент нет доступных рецензий по вашему запросу"
      />
    );
  }

  return (
    <>
      <div className={`grid grid-cols-1 ${!isMobile && "md:grid-cols-2 lg:grid-cols-3"} gap-4 mb-6`}>
        {reviews.map((review, index) => (
          <div
            key={review.id}
            ref={isMobile && index === reviews.length - 1 ? lastReviewElementRef : null}
          >
            <Card 
              className={`cursor-pointer hover:shadow-lg transition-shadow border-2 ${isMobile ? "mb-4" : ""}`}
              onClick={(e) => handleReviewClick(review.id, e)}
              onMouseDown={(e) => {
                // Обрабатываем событие нажатия кнопки мыши
                if (e.button === 1) { // Средняя кнопка (колесико)
                  handleReviewClick(review.id, e);
                }
              }}
            >
              <CardHeader className={isMobile ? "p-3" : ""}>
                <div className="relative">
                  <img 
                    src={getReviewCoverUrl(review)}
                    alt={`Обложка ${review.album}`} 
                    className="w-full aspect-square object-cover rounded-md mb-4"
                    onError={handleImageError}
                  />
                </div>
                <CardTitle className={`${isMobile ? "text-lg" : "text-xl"} ${getRatingColor(review.rating as keyof typeof EnumRating, "text")}`}>
                  {review.album}
                </CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? "p-3 pt-0" : ""}>
                <p className={`${isMobile ? "text-base" : "text-lg"} text-muted-foreground`}>{review.artist}</p>
                <div className={`flex ${isMobile ? "flex-col gap-1" : "justify-between items-center"}`}>
                  <p className="text-sm text-muted-foreground">
                    {new Date(review.createdAt!).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                  <div className="flex flex-row gap-2 items-center">
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
                    <span className={`text-sm font-medium ${getRatingColor(review.rating as keyof typeof EnumRating, "text")}`}>
                      {EnumRating[review.rating as keyof typeof EnumRating]}
                    </span>
                    {review.views !== undefined && review.views > 0 && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatViewCount(review.views)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Индикатор загрузки для мобильной версии с бесконечной прокруткой */}
      {isMobile && isLoadingMore && (
        <div className="flex justify-center pb-6 pt-2">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      
      {/* Кнопка "Загрузить еще" для мобильной версии, когда не в процессе загрузки */}
      {isMobile && !isLoadingMore && reviews.length < totalReviews && (
        <div className="flex justify-center pb-6 pt-2">
          <Button variant="outline" onClick={handleLoadMore}>
            Загрузить еще
          </Button>
        </div>
      )}

      {/* Пагинация только для десктопа */}
      {!isMobile && (
        <UniversalPagination
          currentPage={currentPage} 
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isPaginationLoading={isLoading}
        />
      )}
    </>
  );
};

export default ReviewsList; 