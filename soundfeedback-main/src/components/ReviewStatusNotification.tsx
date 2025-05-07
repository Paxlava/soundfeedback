import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { EnumStatus } from '@/enums/status';
import { EnumRole } from '@/enums/role';
import { Review } from '@/types/reviewTypes';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const REVIEW_NOTIFICATION_PREFIX = 'sf_review_notification_';

interface ReviewStatusNotificationProps {
  reviews: Review[];
  onReviewRead: (reviewId: string) => void;
}

const ReviewStatusNotification = ({ reviews, onReviewRead }: ReviewStatusNotificationProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [unreadReviews, setUnreadReviews] = useState<Review[]>([]);

  // Фильтруем только те рецензии, статус которых изменился (одобрен или отклонен) и уведомление о которых еще не было показано
  useEffect(() => {
    // Не показываем уведомления администраторам
    if (!user || user.role === EnumRole.ADMIN) {
      setIsOpen(false);
      return;
    }
    
    const filteredReviews = reviews.filter(review => {
      // Проверяем только рецензии с нужными статусами
      if (review.status !== EnumStatus.APPROVED && review.status !== EnumStatus.REJECTED) {
        return false;
      }
      
      // Проверяем, было ли уже показано уведомление для этой рецензии
      const key = `${REVIEW_NOTIFICATION_PREFIX}${review.id}`;
      const hasBeenShown = localStorage.getItem(key);
      return !hasBeenShown;
    });
    
    setUnreadReviews(filteredReviews);
    
    // Если есть неотображенные рецензии, показываем первую
    if (filteredReviews.length > 0) {
      setCurrentReviewIndex(0);
      setIsOpen(true);
    }
  }, [reviews, user]);
  
  // Если пользователь - администратор, не показываем уведомления вообще
  if (!user || user.role === EnumRole.ADMIN) {
    return null;
  }
  
  const currentReview = unreadReviews[currentReviewIndex];
  
  const handleClose = () => {
    if (!currentReview) return;
    
    // Отмечаем рецензию как прочитанную
    const key = `${REVIEW_NOTIFICATION_PREFIX}${currentReview.id}`;
    localStorage.setItem(key, 'true');
    onReviewRead(currentReview.id);
    
    // Переходим к следующей рецензии или закрываем диалог
    if (currentReviewIndex < unreadReviews.length - 1) {
      setCurrentReviewIndex(prev => prev + 1);
    } else {
      setIsOpen(false);
      setCurrentReviewIndex(0);
    }
  };
  
  const handleNavigateToReview = () => {
    if (!currentReview) return;
    
    // Отмечаем рецензию как прочитанную
    const key = `${REVIEW_NOTIFICATION_PREFIX}${currentReview.id}`;
    localStorage.setItem(key, 'true');
    onReviewRead(currentReview.id);
    
    // Закрываем диалог и перенаправляем на страницу рецензии
    setIsOpen(false);
    navigate(`/review/${currentReview.id}`);
  };
  
  if (!currentReview) return null;
  
  const isApproved = currentReview.status === EnumStatus.APPROVED;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(open);
    }}>
      <DialogContent 
        className={`sm:max-w-md`}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <div className={`mx-auto ${isApproved ? 'bg-green-100' : 'bg-red-100'} p-3 rounded-full`}>
            {isApproved ? (
              <CheckCircle className="h-12 w-12 text-green-600" />
            ) : (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>
          <DialogTitle className={`text-center text-xl font-bold ${isApproved ? 'text-green-600' : 'text-red-600'}`}>
            {isApproved ? 'Ваша рецензия одобрена!' : 'Ваша рецензия отклонена'}
          </DialogTitle>
          <DialogDescription className="text-center">
            <div className="mb-2 text-base font-medium">
              {currentReview.album} - {currentReview.artist}
            </div>
            {isApproved ? (
              <p className="text-sm text-muted-foreground">
                Ваша рецензия была проверена и одобрена модератором. Теперь она доступна всем пользователям сайта.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  К сожалению, ваша рецензия была отклонена модератором.
                </p>
                {currentReview.rejectReason && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3 text-left">
                    <div className="text-sm font-medium text-red-800 mb-1">Причина отклонения:</div>
                    <p className="text-sm text-red-700">{currentReview.rejectReason}</p>
                  </div>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {unreadReviews.length > 1 && (
          <div className="text-center text-sm text-muted-foreground mt-1">
            Уведомление {currentReviewIndex + 1} из {unreadReviews.length}
          </div>
        )}
        
        <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} className="sm:w-auto w-full">
            {currentReviewIndex < unreadReviews.length - 1 ? 'Следующее' : 'Закрыть'}
          </Button>
          <Button 
            onClick={handleNavigateToReview}
            className={`sm:w-auto w-full gap-2 ${isApproved ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'}`}
          >
            <Eye className="h-4 w-4" />
            Просмотреть рецензию
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewStatusNotification; 