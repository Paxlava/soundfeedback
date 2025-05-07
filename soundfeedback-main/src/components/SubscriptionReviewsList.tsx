import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnumRating, EnumRatingType } from "@/enums/rating";
import { EnumStatus } from "@/enums/status";
import { Review } from "@/types/reviewTypes";
import { getRatingColor } from "@/lib/utils";
import { SERVER_URL } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSubscriptionReviewsPaginated } from "@/services/reviewService";
import Loader from "@/components/Loader";
import { UniversalPagination } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/useAuth";
import { Eye, UserPlus, RefreshCw } from "lucide-react";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SubscriptionReviewsListProps {
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

const SubscriptionReviewsList: React.FC<SubscriptionReviewsListProps> = ({ 
  search, releaseType, rating, sortOrder 
}) => {
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
    if (!user) {
      setIsLoading(false);
      setError("Необходимо войти в систему, чтобы просматривать рецензии от подписок");
      return;
    }

    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      isLoadingRef.current = true;
      setError(null);
      
      console.log("Загрузка рецензий с параметрами:", {
        page: pageNum,
        limit: REVIEWS_PER_PAGE,
        search,
        releaseType,
        rating,
        sortOrder,
        userId: user.uid
      });
      
      const result = await getSubscriptionReviewsPaginated(
        EnumStatus.APPROVED,
        pageNum,
        REVIEWS_PER_PAGE,
        search,
        releaseType,
        rating,
        sortOrder,
        user.uid
      );
      
      console.log(`Получено ${result.reviews.length} рецензий из ${result.total}`);
      console.log("Результат запроса:", result);
      
      if (append) {
        // Добавляем новые рецензии к существующим
        setReviews(prev => {
          const newReviews = [...prev, ...result.reviews];
          console.log(`Объединено ${prev.length} + ${result.reviews.length} = ${newReviews.length} рецензий`);
          return newReviews;
        });
      } else {
        // Заменяем рецензии новыми
        console.log("Заменяем список рецензий новыми данными:", result.reviews);
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
  }, [search, releaseType, rating, sortOrder, user]);

  // Функция для загрузки следующей страницы (бесконечная прокрутка)
  const handleLoadMore = useCallback(() => {
    if (reviews.length >= totalReviews || isLoadingMore) {
      console.log("Пропуск загрузки: все рецензии уже загружены или идет загрузка");
      return;
    }
    
    const nextPage = Math.ceil(reviews.length / REVIEWS_PER_PAGE) + 1;
    console.log(`Загрузка следующей страницы: ${nextPage}`);
    loadReviews(nextPage, true);
  }, [reviews.length, totalReviews, isLoadingMore, loadReviews]);

  // Загрузка первоначальных данных
  useEffect(() => {
    console.log("Эффект загрузки данных активирован, вызов loadReviews");
    loadReviews(currentPage);
  }, [loadReviews, currentPage]);

  // Расчет общего количества страниц
  const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);
  console.log(`Всего страниц: ${totalPages}, всего рецензий: ${totalReviews}`);

  // Обработка ошибки изображения
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log("Ошибка загрузки изображения, заменяем на placeholder");
    e.currentTarget.src = "/placeholder.svg";
  };

  // Обработчик смены страницы
  const handlePageChange = (page: number) => {
    console.log(`Переход на страницу ${page}`);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Если есть ошибка, отображаем компонент ошибки
  if (error && !isLoading) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={() => loadReviews(currentPage)}
        retryLabel="Повторить"
      />
    );
  }

  // Если загрузка, отображаем индикатор загрузки
  if (isLoading && reviews.length === 0) {
    return <Loader />;
  }

  // Если нет рецензий, отображаем пустое состояние
  if (reviews.length === 0 && !isLoading) {
    // Показываем разные сообщения в зависимости от того, есть ли активный поиск
    const isFiltering = search || releaseType !== "all" || rating !== "all";
    
    if (isFiltering) {
      return (
        <div className="text-center py-10">
          <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">Ничего не найдено</h3>
          <p className="text-muted-foreground mb-4">
            По вашему запросу не найдено ни одной рецензии. Попробуйте изменить параметры поиска.
          </p>
          <Button 
            onClick={() => {
              window.location.href = "/subscriptions-reviews";
            }}
            variant="outline"
          >
            Сбросить фильтры
          </Button>
        </div>
      );
    }
    
    return (
      <EmptyState
        icon={UserPlus}
        title="Нет рецензий от ваших подписок"
        description="Рецензии от пользователей, на которых вы подписаны, будут отображаться здесь."
        actionLabel="Найти пользователей"
        onAction={() => window.location.href = "/users"}
      />
    );
  }

  // Основной рендер списка рецензий
  return (
    <div className="space-y-8">
      <div className={`grid grid-cols-1 ${!isMobile && "md:grid-cols-2 lg:grid-cols-3"} gap-4 mb-6`}>
        {reviews.map((review, index) => {
          const isLast = index === reviews.length - 1;
          const ref = isLast ? lastReviewElementRef : null;
          
          return (
            <div key={review.id} ref={ref}>
              <Link to={`/review/${review.id}`} className="block">
                <Card className={`cursor-pointer hover:shadow-lg transition-shadow border-2 ${isMobile ? "mb-4" : ""}`}>
                  <CardHeader className={isMobile ? "p-3" : ""}>
                    <div className="relative">
                      <img 
                        src={getReviewCoverUrl(review)}
                        alt={`Обложка ${review.album}`} 
                        className="w-full aspect-square object-cover rounded-md mb-4"
                        onError={handleImageError}
                      />
                    </div>
                    <CardTitle className={`${isMobile ? "text-lg" : "text-xl"} ${getRatingColor(review.rating as EnumRatingType, "text")}`}>
                      {review.album}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={isMobile ? "p-3 pt-0" : ""}>
                    <p className={`${isMobile ? "text-base" : "text-lg"} text-muted-foreground`}>{review.artist}</p>
                    <div className={`flex ${isMobile ? "flex-col gap-1" : "justify-between items-center"}`}>
                      <p className="text-sm text-muted-foreground">
                        {review.date}
                      </p>
                      <div className="flex flex-row gap-2 items-center">
                        {review.author && (
                          <span className="text-sm text-primary">
                            {review.author}
                          </span>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span className={`text-sm font-medium ${getRatingColor(review.rating as EnumRatingType, "text")}`}>
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
              </Link>
            </div>
          );
        })}
      </div>

      {/* Индикатор загрузки для бесконечной прокрутки */}
      {isLoadingMore && (
        <div className="flex justify-center pb-6 pt-2">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Пагинация для настольных устройств */}
      {!isMobile && totalPages > 1 && (
        <div className="mt-6">
          <UniversalPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isPaginationLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};

export default SubscriptionReviewsList; 