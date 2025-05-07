import { useState, useMemo } from "react";
import { ThumbsUp, ThumbsDown, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import ShareButtons from "@/components/ui/ShareButtons";
import { censorText } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReviewContentProps {
  content: string;
  yandexMusicId: string;
  likes: number;
  dislikes: number;
  views?: number;
  isOwner?: boolean;
  isBanned?: boolean;
  reviewId: string;
  title: string;
  artist?: string;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  hasLiked?: boolean;
  hasDisliked?: boolean;
  isLiking?: boolean;
  isDisliking?: boolean;
}

const ReviewContent = ({
  content,
  yandexMusicId,
  likes,
  dislikes,
  views,
  isOwner = false,
  isBanned = false,
  reviewId,
  title,
  artist,
  onEdit,
  onDelete,
  onLike,
  onDislike,
  hasLiked,
  hasDisliked,
  isLiking,
  isDisliking,
}: ReviewContentProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const reviewUrl = useMemo(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/review/${reviewId}`;
  }, [reviewId]);

  // Цензурируем текст рецензии, исключая названия альбомов и артистов
  const censoredContent = useMemo(() => {
    // Собираем массив исключений для цензуры
    const albumsAndArtists = [];
    if (title) albumsAndArtists.push(title);
    if (artist) albumsAndArtists.push(artist);
    
    return censorText(content, { 
      albums: albumsAndArtists.filter(Boolean) as string[],
      disableCensorship: user?.disableCensorship
    });
  }, [content, title, artist, user?.disableCensorship]);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(editedContent);
      setIsEditing(false);
      toast({
        title: "Успешно",
        description: "Рецензия успешно обновлена",
      });
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      toast({
        title: "Успешно",
        description: "Рецензия успешно удалена",
      });
    }
  };

  // Проверяем, может ли пользователь редактировать или удалять рецензию
  const canEditReview = onEdit !== undefined;
  const canDeleteReview = onDelete !== undefined;
  const showAdminControls = canEditReview || canDeleteReview;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Yandex Music player */}
      {!yandexMusicId.startsWith("custom-") && (
        <iframe
          className="w-full h-[160px] md:h-[180px] rounded-lg"
          src={`https://music.yandex.ru/iframe/#album/${yandexMusicId}`}
          frameBorder="0"
        />
      )}

      {/* Review content */}
      {isEditing ? (
        <div className="space-y-3 md:space-y-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[150px] md:min-h-[200px] whitespace-pre-wrap text-sm md:text-base" 
          />
          <div className="flex gap-2">
            <Button size={isMobile ? "sm" : "default"} onClick={handleEdit}>Сохранить</Button>
            <Button
              size={isMobile ? "sm" : "default"}
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditedContent(content);
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <div className={`${isMobile ? "text-base" : "text-lg"} leading-relaxed whitespace-pre-wrap`}>
          {censoredContent}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 md:mt-4">
        <Button
          variant={hasLiked ? "default" : "outline"}
          size="sm"
          onClick={onLike}
          disabled={isLiking || isDisliking}
          className="gap-1 md:gap-2"
        >
          {isLiking ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <ThumbsUp className="w-3 h-3 md:w-4 md:h-4" />}
          <span className="text-xs md:text-sm">{likes}</span>
        </Button>

        <Button
          variant={hasDisliked ? "default" : "outline"}
          size="sm"
          onClick={onDislike}
          disabled={isLiking || isDisliking}
          className="gap-1 md:gap-2"
        >
          {isDisliking ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <ThumbsDown className="w-3 h-3 md:w-4 md:h-4" />}
          <span className="text-xs md:text-sm">{dislikes}</span>
        </Button>

        <ShareButtons 
          url={reviewUrl} 
          title={title}
          variant="outline"
          size="sm"
        />

        {/* Панель управления для администраторов или автора рецензии */}
        {showAdminControls && (
          <div className={`${isMobile ? 'w-full mt-2' : 'ml-auto'} flex gap-2 ${isMobile ? 'justify-end' : ''}`}>
            {canEditReview && !isBanned && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1 md:gap-2"
              >
                <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                {!isMobile && <span>Редактировать</span>}
              </Button>
            )}

            {canDeleteReview && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1 md:gap-2">
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    {!isMobile && <span>Удалить</span>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={isMobile ? "w-[90%] p-4 max-w-[95%]" : ""}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className={isMobile ? "text-lg" : ""}>Удаление рецензии</AlertDialogTitle>
                    <AlertDialogDescription className={isMobile ? "text-sm" : ""}>
                      Вы уверены, что хотите удалить эту рецензию? Это действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className={isMobile ? "flex-col space-y-2" : ""}>
                    <AlertDialogCancel className={isMobile ? "mt-0 w-full" : ""}>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className={isMobile ? "w-full" : ""}>Удалить</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewContent;