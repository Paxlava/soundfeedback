// ReviewDetail.tsx
import * as React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import ReviewHeader from "@/components/ReviewHeader";
import ReviewContent from "@/components/ReviewContent";
import CommentSection from "@/components/CommentSection";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { getReviewById, updateReview, deleteReview, likeReview, dislikeReview, incrementReviewViews, updateReviewCover, deleteReviewCover } from "@/services/reviewService";
import { getCommentsByReviewId, addComment } from "@/services/commentService";
import { Review, Comment } from "@/types/reviewTypes";
import Loader from "@/components/Loader";
import { incrementReadReviews } from "@/services/userService";
import { EnumRole } from "@/enums/role";
import { EnumStatus } from "@/enums/status";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import { EnumRating } from "@/enums/rating";

const ReviewDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [review, setReview] = React.useState<Review | null>(null);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLiking, setIsLiking] = React.useState(false);
  const [isDisliking, setIsDisliking] = React.useState(false);
  const [isUpdatingCover, setIsUpdatingCover] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!id) {
      setError("ID рецензии не указан");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const reviewData = await getReviewById(id);
      console.log("Полученные данные рецензии:", {
        id: reviewData.id,
        coverUrl: reviewData.coverUrl,
        customCoverUrl: reviewData.customCoverUrl
      });
      const commentsData = await getCommentsByReviewId(id);
      setReview(reviewData);
      setComments(commentsData);
      
      // Увеличиваем счетчик просмотров только для уникальных просмотров
      if (user) {
        await incrementReadReviews(user.uid, id);
      }
    } catch (err) {
      console.error("Ошибка при загрузке рецензии:", err);
      setError("Не удалось загрузить рецензию. Проверьте подключение к сети или повторите попытку позже.");
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  React.useEffect(() => {
    const trackReadReview = async () => {
      if (user && id) {
        try {
          await incrementReadReviews(user.uid, id);
        } catch (error) {
          console.error("Ошибка при обновлении статистики прочитанных рецензий:", error);
        }
      }
    };

    fetchData();
    trackReadReview();
  }, [id, user, fetchData]);

  if (isLoading) {
    return <Loader />;
  }

  if (error || !review) {
    return <ErrorDisplay message={error || "Рецензия не найдена"} onRetry={fetchData} />;
  }

  const isOwner = user && user.uid === review.authorId;
  const isAdmin = user && user.role === EnumRole.ADMIN;
  // Администратор может редактировать и удалять любые рецензии, автор - только свои
  const canEdit = isAdmin || isOwner; 
  const canDelete = isAdmin || isOwner; // Администратор может удалять любые рецензии
  const isBanned = user && user.isBanned === true;
  
  // Проверка, является ли рецензия редакционной (созданной администратором)
  const isEditorial = isAdmin && (
    // Текущий пользователь-админ является автором рецензии
    review.authorId === user?.uid ||
    // В имени автора есть "Администратор" (для обратной совместимости)
    review.author.includes("Администратор")
  );

  // Проверка доступа: рецензия доступна только если она одобрена, либо пользователь - её автор или администратор
  const isReviewAccessible = 
    review.status === EnumStatus.APPROVED || 
    isOwner || 
    isAdmin;

  // Если рецензия не одобрена и пользователь не имеет к ней доступа, перенаправляем на главную
  if (!isReviewAccessible) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Alert variant={review.status === EnumStatus.PENDING ? "default" : "destructive"} className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {review.status === EnumStatus.PENDING ? "Рецензия на модерации" : "Рецензия отклонена"}
          </AlertTitle>
          <AlertDescription>
            {review.status === EnumStatus.PENDING
              ? "Ваша рецензия ожидает одобрения модератором и пока не видна другим пользователям."
              : "Ваша рецензия была отклонена модератором и не видна другим пользователям."}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => navigate("/reviews")}>
            Вернуться к списку рецензий
          </Button>
        </div>
      </div>
    );
  }

  const handleEditReview = async (newContent: string) => {
    if (isBanned) {
      toast({
        title: "Ошибка",
        description: "Вы не можете редактировать рецензии, так как ваш аккаунт заблокирован",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateReview(review.id, { reviewText: newContent });
      setReview((prev) => (prev ? { ...prev, content: newContent } : null));
      toast({
        title: "Успешно",
        description: "Рецензия успешно обновлена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить рецензию",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReview = async () => {
    try {
      await deleteReview(review.id);
      toast({
        title: "Успешно",
        description: "Рецензия успешно удалена",
      });
      navigate("/reviews");
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить рецензию",
        variant: "destructive",
      });
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы ставить лайки",
        variant: "destructive",
      });
      return;
    }

    if (isLiking || isDisliking) return; // Предотвращаем повторные клики во время запроса

    setIsLiking(true);

    // Оптимистическое обновление: сразу обновляем UI
    const hasLiked = review.likedBy.includes(user.uid);
    const hasDisliked = review.dislikedBy.includes(user.uid);

    setReview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        likes: hasLiked ? prev.likes - 1 : prev.likes + 1,
        likedBy: hasLiked ? prev.likedBy.filter((id) => id !== user.uid) : [...prev.likedBy, user.uid],
        dislikes: hasDisliked ? prev.dislikes - 1 : prev.dislikes,
        dislikedBy: hasDisliked ? prev.dislikedBy.filter((id) => id !== user.uid) : prev.dislikedBy,
      };
    });

    try {
      const updatedReview = await likeReview(review.id, user.uid);
      setReview(updatedReview); // Синхронизируем с данными от сервера
    } catch (error) {
      // Откатываем изменения в случае ошибки
      setReview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          likes: hasLiked ? prev.likes + 1 : prev.likes - 1,
          likedBy: hasLiked ? [...prev.likedBy, user.uid] : prev.likedBy.filter((id) => id !== user.uid),
          dislikes: hasDisliked ? prev.dislikes + 1 : prev.dislikes,
          dislikedBy: hasDisliked ? [...prev.dislikedBy, user.uid] : prev.dislikedBy,
        };
      });
      toast({
        title: "Ошибка",
        description: "Не удалось поставить лайк",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы ставить дизлайки",
        variant: "destructive",
      });
      return;
    }

    if (isLiking || isDisliking) return; // Предотвращаем повторные клики во время запроса

    setIsDisliking(true);

    // Оптимистическое обновление: сразу обновляем UI
    const hasLiked = review.likedBy.includes(user.uid);
    const hasDisliked = review.dislikedBy.includes(user.uid);

    setReview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dislikes: hasDisliked ? prev.dislikes - 1 : prev.dislikes + 1,
        dislikedBy: hasDisliked ? prev.dislikedBy.filter((id) => id !== user.uid) : [...prev.dislikedBy, user.uid],
        likes: hasLiked ? prev.likes - 1 : prev.likes,
        likedBy: hasLiked ? prev.likedBy.filter((id) => id !== user.uid) : prev.likedBy,
      };
    });

    try {
      const updatedReview = await dislikeReview(review.id, user.uid);
      setReview(updatedReview); // Синхронизируем с данными от сервера
    } catch (error) {
      // Откатываем изменения в случае ошибки
      setReview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          dislikes: hasDisliked ? prev.dislikes + 1 : prev.dislikes - 1,
          dislikedBy: hasDisliked ? [...prev.dislikedBy, user.uid] : prev.dislikedBy.filter((id) => id !== user.uid),
          likes: hasLiked ? prev.likes + 1 : prev.likes,
          likedBy: hasLiked ? [...prev.likedBy, user.uid] : prev.likedBy,
        };
      });
      toast({
        title: "Ошибка",
        description: "Не удалось поставить дизлайк",
        variant: "destructive",
      });
    } finally {
      setIsDisliking(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы оставлять комментарии",
        variant: "destructive",
      });
      return;
    }

    if (isBanned) {
      toast({
        title: "Ошибка",
        description: "Вы не можете оставлять комментарии, так как ваш аккаунт заблокирован",
        variant: "destructive",
      });
      return;
    }

    try {
      const newComment = await addComment(review.id, user.uid, user.displayName || "Аноним", content);
      setComments((prevComments) => [newComment, ...prevComments]);
      toast({
        title: "Успешно",
        description: "Комментарий добавлен",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить комментарий",
        variant: "destructive",
      });
    }
  };

  const handleCoverEdit = async (file: File) => {
    if (!isAdmin || !review) return;
    
    try {
      setIsUpdatingCover(true);
      const newCoverUrl = await updateReviewCover(review.id, file);
      
      // Обновляем состояние с новым URL обложки
      setReview((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          customCoverUrl: newCoverUrl
        };
      });
      
      toast({
        title: "Успешно",
        description: "Обложка рецензии обновлена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить обложку рецензии",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCover(false);
    }
  };
  
  const handleCoverDelete = async () => {
    if (!isAdmin || !review || !review.customCoverUrl) return;
    
    try {
      setIsUpdatingCover(true);
      await deleteReviewCover(review.id, review.customCoverUrl);
      
      // Обновляем состояние, удаляя customCoverUrl
      setReview((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          customCoverUrl: undefined
        };
      });
      
      toast({
        title: "Успешно",
        description: "Кастомная обложка рецензии удалена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить обложку рецензии",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCover(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Показываем алерт для отклоненных рецензий */}
      {review.status === EnumStatus.REJECTED && (isOwner || isAdmin) && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Рецензия отклонена</AlertTitle>
          <AlertDescription>
            {review.rejectReason && (
              <>
                <div className="font-semibold mt-1">Причина отклонения:</div>
                <div className="mt-1">{review.rejectReason}</div>
              </>
            )}
            {review.moderationComment && (
              <>
                <div className="font-semibold mt-2">Комментарий модератора:</div>
                <div className="mt-1">{review.moderationComment}</div>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 md:p-6">
        <ReviewHeader 
          album={review.album}
          artist={review.artist}
          type={review.type}
          rating={review.rating}
          coverUrl={review.coverUrl}
          customCoverUrl={review.customCoverUrl}
          views={review.views}
          reviewId={review.id}
          isEditorial={isEditorial}
          onCoverEdit={isAdmin ? handleCoverEdit : undefined}
          onCoverDelete={isAdmin && review.customCoverUrl ? handleCoverDelete : undefined}
        />
        
        <Link 
          to={`/profile/${review.author}`}
          className={`inline-block ${isMobile ? 'mb-3 text-sm' : 'mb-6'} text-primary hover:underline`}
        >
          Автор: {review.author}
        </Link>
        
        <ReviewContent
          content={review.content}
          yandexMusicId={review.yandexMusicId}
          likes={review.likes}
          dislikes={review.dislikes}
          views={review.views}
          isOwner={isOwner}
          isBanned={isBanned}
          reviewId={review.id}
          title={review.album}
          artist={review.artist}
          onEdit={canEdit ? handleEditReview : undefined}
          onDelete={canDelete ? handleDeleteReview : undefined}
          onLike={handleLike}
          onDislike={handleDislike}
          hasLiked={user ? review.likedBy.includes(user.uid) : false}
          hasDisliked={user ? review.dislikedBy.includes(user.uid) : false}
          isLiking={isLiking}
          isDisliking={isDisliking}
        />
      </Card>

      <CommentSection
        reviewId={review.id}
        comments={comments}
        onAddComment={handleAddComment}
      />
    </div>
  );
};

export default ReviewDetail;