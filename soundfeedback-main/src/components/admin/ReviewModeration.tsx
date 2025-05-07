// ReviewModeration.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, UniversalPagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { getReviews, updateReviewStatus } from "@/services/reviewService";
import { EnumStatus } from "@/enums/status";
import { EnumRating, EnumRatingType } from "@/enums/rating";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Check, X, ShieldAlert, ChevronLeft, ChevronRight, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVER_URL, getRatingColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  albumId: string;
  userId: string;
  rating: EnumRatingType;
  content: string;
  status: (typeof EnumStatus)[keyof typeof EnumStatus];
  rejectReason?: string;
  createdAt: string;
  artist: string;
  album: string;
  author: string;
  coverUrl: string;
  customCoverUrl?: string;
}

const ITEMS_PER_PAGE = 5;

// Функция для корректной обработки URL обложки
const getImageUrl = (url: string | undefined, fallbackUrl: string): string => {
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

// Функция для получения рецензий с пагинацией
const getPendingReviewsPaginated = async (page = 1, limit = ITEMS_PER_PAGE) => {
  try {
    const reviewsRef = await getReviews(EnumStatus.PENDING, "all");
    
    // Сортируем рецензии по дате создания (от новых к старым)
    const sortedReviews = [...reviewsRef].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Применяем пагинацию
    const startIndex = (page - 1) * limit;
    const paginatedReviews = sortedReviews.slice(startIndex, startIndex + limit);
    
    return {
      reviews: paginatedReviews as unknown as Review[],
      total: reviewsRef.length
    };
  } catch (error) {
    console.error("Ошибка при получении рецензий:", error);
    throw error;
  }
};

// Форматирование даты для лучшего отображения
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

// Компонент для отображения скелета загрузки
const ReviewSkeleton = ({ isMobile }: { isMobile: boolean }) => (
  <Card className="overflow-hidden">
    <CardContent className="p-4">
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'md:grid-cols-[200px,1fr] gap-4'}`}>
        <Skeleton className="w-full aspect-square rounded-lg" />
        <div className="space-y-4">
          <div>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ReviewModeration = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const loadReviews = async (page: number) => {
    try {
      if (page === currentPage && !isLoading) {
        setIsPaginationLoading(true);
      } else {
        setIsLoading(true);
      }
      
      const { reviews: pendingReviews, total } = await getPendingReviewsPaginated(page);
      setReviews(pendingReviews);
      setTotalItems(total);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить рецензии",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsPaginationLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(currentPage);
  }, [currentPage]);

  const handleApprove = async (review: Review) => {
    try {
      await updateReviewStatus(review.id, EnumStatus.APPROVED);
      
      // Перезагружаем текущую страницу или перемещаемся на предыдущую, если это была последняя рецензия на странице
      const updatedTotal = totalItems - 1;
      const updatedTotalPages = Math.ceil(updatedTotal / ITEMS_PER_PAGE);
      const shouldGoToPrevPage = reviews.length === 1 && currentPage > 1 && currentPage > updatedTotalPages;
      
      if (shouldGoToPrevPage) {
        setCurrentPage(prev => prev - 1);
      } else {
        await loadReviews(currentPage);
      }
      
      toast({
        title: "Рецензия одобрена",
        description: `Рецензия пользователя ${review.author} на альбом ${review.artist} - ${review.album} опубликована`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось одобрить рецензию",
        variant: "destructive",
      });
    }
  };

  const handleReject = (review: Review) => {
    setSelectedReview(review);
    setShowRejectDialog(true);
  };

  const confirmReject = async () => {
    if (selectedReview && rejectReason) {
      try {
        await updateReviewStatus(selectedReview.id, EnumStatus.REJECTED, rejectReason);
        
        // Перезагружаем текущую страницу или перемещаемся на предыдущую, если это была последняя рецензия на странице
        const updatedTotal = totalItems - 1;
        const updatedTotalPages = Math.ceil(updatedTotal / ITEMS_PER_PAGE);
        const shouldGoToPrevPage = reviews.length === 1 && currentPage > 1 && currentPage > updatedTotalPages;
        
        if (shouldGoToPrevPage) {
          setCurrentPage(prev => prev - 1);
        } else {
          await loadReviews(currentPage);
        }
        
        toast({
          title: "Рецензия отклонена",
          description: `Рецензия пользователя ${selectedReview.author} отклонена`,
        });
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось отклонить рецензию",
          variant: "destructive",
        });
      } finally {
        setShowRejectDialog(false);
        setRejectReason("");
        setSelectedReview(null);
      }
    }
  };

  // Обработчик изменения страницы
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Отображение скелетов при загрузке
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <ReviewSkeleton key={i} isMobile={isMobile} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
     
      
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Нет рецензий на модерации</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {isPaginationLoading ? (
            [1, 2, 3].map((i) => (
              <ReviewSkeleton key={i} isMobile={isMobile} />
            ))
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="overflow-hidden">
                <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                  <div className={`${isMobile 
                    ? 'grid grid-cols-1 gap-3' 
                    : 'grid md:grid-cols-[200px,1fr] gap-4'}`}
                  >
                    <div>
                      <img 
                        src={getImageUrl(review.customCoverUrl, getImageUrl(review.coverUrl, "/placeholder.svg"))} 
                        alt={`${review.album} cover`} 
                        className="w-full aspect-square object-cover rounded-lg outline outline-2 -outline-offset-2 outline-white/5" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold leading-tight`}>
                          {review.artist} - {review.album}
                        </h3>
                        
                        <div className="flex flex-col xs:flex-row gap-1 xs:gap-2 items-start xs:items-center mt-1.5 mb-1 flex-wrap">
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <User className="h-3 w-3" /> {review.author}
                          </Badge>
                          
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" /> {formatDate(review.createdAt)}
                          </Badge>
                          
                          <Badge 
                            className={`flex items-center text-xs px-2 py-1 rounded-full bg-opacity-10 ${getRatingColor(review.rating, "bg")} ${getRatingColor(review.rating, "text")}`}
                          >
                            {EnumRating[review.rating]}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-pretty max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/50`}>
                        {review.content}
                      </div>
                      
                      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-2'}`}>
                        <Button 
                          variant="outline" 
                          className={`${isMobile ? 'w-full py-1.5' : 'flex-1'}`} 
                          onClick={() => handleApprove(review)}
                        >
                          <Check className={`${isMobile ? 'h-3.5 w-3.5 mr-1.5' : 'h-4 w-4 mr-2'}`} />
                          Одобрить
                        </Button>
                        <Button 
                          variant="outline" 
                          className={`${isMobile ? 'w-full py-1.5' : 'flex-1'}`} 
                          onClick={() => handleReject(review)}
                        >
                          <X className={`${isMobile ? 'h-3.5 w-3.5 mr-1.5' : 'h-4 w-4 mr-2'}`} />
                          Отклонить
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <UniversalPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isPaginationLoading={isPaginationLoading}
      />

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className={isMobile ? "w-[calc(100%-32px)] p-4 max-w-md" : ""}>
          <DialogHeader>
            <DialogTitle>Причина отклонения рецензии</DialogTitle>
          </DialogHeader>
          <Textarea 
            placeholder="Укажите причину отклонения рецензии..." 
            value={rejectReason} 
            onChange={(e) => setRejectReason(e.target.value)} 
            className="min-h-[100px]" 
          />
          <DialogFooter className={isMobile ? "flex-col gap-2" : ""}>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(false)}
              className={isMobile ? "w-full" : ""}
            >
              Отмена
            </Button>
            <Button 
              onClick={confirmReject} 
              disabled={!rejectReason}
              className={isMobile ? "w-full" : ""}
            >
              Отклонить рецензию
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewModeration;
