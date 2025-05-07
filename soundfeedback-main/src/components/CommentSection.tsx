import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Reply, Star, Trash2, Loader2, ChevronLeft, ChevronRight, MoreHorizontal, Skull, Pencil, X, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { likeComment, dislikeComment, addReply, likeReply, dislikeReply, deleteComment, deleteReply, editComment, editReply } from "@/services/commentService";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Comment } from "@/types/reviewTypes";
import { Link } from "react-router-dom";
import { EnumRole, EnumRoleType } from "@/enums/role";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Компонент для отображения многоточия
const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);

const COMMENTS_PER_PAGE = 5; // Количество комментариев на странице

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string) => void;
  reviewId?: string;
  setComments?: React.Dispatch<React.SetStateAction<Comment[]>>;
  isLoading?: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments, onAddComment }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [newComment, setNewComment] = React.useState("");
  const [replyContent, setReplyContent] = React.useState<{ [key: string]: string }>({});
  const [isReplying, setIsReplying] = React.useState<{ [key: string]: boolean }>({});
  const [isLiking, setIsLiking] = React.useState<{ [key: string]: boolean }>({});
  const [isDisliking, setIsDisliking] = React.useState<{ [key: string]: boolean }>({});
  const [isDeleting, setIsDeleting] = React.useState<{ [key: string]: boolean }>({});
  const [isDeletingReply, setIsDeletingReply] = React.useState<{ [key: string]: boolean }>({});
  const [localComments, setLocalComments] = React.useState<Comment[]>(comments);
  const [currentPage, setCurrentPage] = React.useState(1);
  // Состояния для редактирования
  const [isEditing, setIsEditing] = React.useState<{ [key: string]: boolean }>({});
  const [isEditingReply, setIsEditingReply] = React.useState<{ [key: string]: boolean }>({});
  const [editContent, setEditContent] = React.useState<{ [key: string]: string }>({});
  const [isEditingSaving, setIsEditingSaving] = React.useState<{ [key: string]: boolean }>({});

  // Вычисление общего количества страниц
  const totalPages = Math.ceil(localComments.length / COMMENTS_PER_PAGE);

  // Получение текущей страницы комментариев
  const currentComments = React.useMemo(() => {
    const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
    return localComments.slice(startIndex, startIndex + COMMENTS_PER_PAGE);
  }, [localComments, currentPage]);

  React.useEffect(() => {
    setLocalComments(comments);
    // Сбрасываем на первую страницу при изменении списка комментариев
    setCurrentPage(1);
  }, [comments]);

  // Обработчик для добавления нового комментария
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы оставлять комментарии",
        variant: "destructive",
      });
      return;
    }

    if (user.isBanned) {
      toast({
        title: "Ошибка",
        description: "Вы не можете оставлять комментарии, так как заблокированы",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;
    onAddComment(newComment);
    setNewComment("");
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    // Плавная прокрутка к началу секции комментариев
    setTimeout(() => {
      document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleReply = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы оставлять ответы",
        variant: "destructive",
      });
      return;
    }

    if (user.isBanned) {
      toast({
        title: "Ошибка",
        description: "Вы не можете оставлять ответы, так как заблокированы",
        variant: "destructive",
      });
      return;
    }

    const content = replyContent[commentId]?.trim();
    if (!content) return;

    try {
      const updatedComment = await addReply(commentId, user.uid, user.displayName || "Аноним", content);
      setLocalComments((prev) => prev.map((comment) => (comment.id === commentId ? updatedComment : comment)));
      setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
      setIsReplying((prev) => ({ ...prev, [commentId]: false }));
      toast({
        title: "Успешно",
        description: "Ответ добавлен",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить ответ",
        variant: "destructive",
      });
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы ставить лайки",
        variant: "destructive",
      });
      return;
    }

    if (isLiking[commentId] || isDisliking[commentId]) return;

    setIsLiking((prev) => ({ ...prev, [commentId]: true }));

    const comment = localComments.find((c) => c.id === commentId);
    if (!comment) return;

    const hasLiked = comment.likedBy.includes(user.uid);
    const hasDisliked = comment.dislikedBy.includes(user.uid);

    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likes: hasLiked ? c.likes - 1 : c.likes + 1,
              likedBy: hasLiked ? c.likedBy.filter((id) => id !== user.uid) : [...c.likedBy, user.uid],
              dislikes: hasDisliked ? c.dislikes - 1 : c.dislikes,
              dislikedBy: hasDisliked ? c.dislikedBy.filter((id) => id !== user.uid) : c.dislikedBy,
            }
          : c
      )
    );

    try {
      const updatedComment = await likeComment(commentId, user.uid);
      setLocalComments((prev) => prev.map((c) => (c.id === commentId ? updatedComment : c)));
    } catch (error) {
      setLocalComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                likes: hasLiked ? c.likes + 1 : c.likes - 1,
                likedBy: hasLiked ? [...c.likedBy, user.uid] : c.likedBy.filter((id) => id !== user.uid),
                dislikes: hasDisliked ? c.dislikes + 1 : c.dislikes,
                dislikedBy: hasDisliked ? [...c.dislikedBy, user.uid] : c.dislikedBy,
              }
            : c
        )
      );
      toast({
        title: "Ошибка",
        description: "Не удалось поставить лайк",
        variant: "destructive",
      });
    } finally {
      setIsLiking((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы ставить дизлайки",
        variant: "destructive",
      });
      return;
    }

    if (isLiking[commentId] || isDisliking[commentId]) return;

    setIsDisliking((prev) => ({ ...prev, [commentId]: true }));

    const comment = localComments.find((c) => c.id === commentId);
    if (!comment) return;

    const hasLiked = comment.likedBy.includes(user.uid);
    const hasDisliked = comment.dislikedBy.includes(user.uid);

    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              dislikes: hasDisliked ? c.dislikes - 1 : c.dislikes + 1,
              dislikedBy: hasDisliked ? c.dislikedBy.filter((id) => id !== user.uid) : [...c.dislikedBy, user.uid],
              likes: hasLiked ? c.likes - 1 : c.likes,
              likedBy: hasLiked ? c.likedBy.filter((id) => id !== user.uid) : c.likedBy,
            }
          : c
      )
    );

    try {
      const updatedComment = await dislikeComment(commentId, user.uid);
      setLocalComments((prev) => prev.map((c) => (c.id === commentId ? updatedComment : c)));
    } catch (error) {
      setLocalComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                dislikes: hasDisliked ? c.dislikes + 1 : c.dislikes - 1,
                dislikedBy: hasDisliked ? [...c.dislikedBy, user.uid] : c.dislikedBy.filter((id) => id !== user.uid),
                likes: hasLiked ? c.likes + 1 : c.likes,
                likedBy: hasLiked ? [...c.likedBy, user.uid] : c.likedBy,
              }
            : c
        )
      );
      toast({
        title: "Ошибка",
        description: "Не удалось поставить дизлайк",
        variant: "destructive",
      });
    } finally {
      setIsDisliking((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleLikeReply = async (commentId: string, replyId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы ставить лайки",
        variant: "destructive",
      });
      return;
    }

    const key = `${commentId}-${replyId}`;
    if (isLiking[key] || isDisliking[key]) return;

    setIsLiking((prev) => ({ ...prev, [key]: true }));

    const comment = localComments.find((c) => c.id === commentId);
    if (!comment) return;
    const reply = comment.replies.find((r) => r.id === replyId);
    if (!reply) return;

    const hasLiked = reply.likedBy.includes(user.uid);
    const hasDisliked = reply.dislikedBy.includes(user.uid);

    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: c.replies.map((r) =>
                r.id === replyId
                  ? {
                      ...r,
                      likes: hasLiked ? r.likes - 1 : r.likes + 1,
                      likedBy: hasLiked ? r.likedBy.filter((id) => id !== user.uid) : [...r.likedBy, user.uid],
                      dislikes: hasDisliked ? r.dislikes - 1 : r.dislikes,
                      dislikedBy: hasDisliked ? r.dislikedBy.filter((id) => id !== user.uid) : r.dislikedBy,
                    }
                  : r
              ),
            }
          : c
      )
    );

    try {
      const updatedComment = await likeReply(commentId, replyId, user.uid);
      setLocalComments((prev) => prev.map((c) => (c.id === commentId ? updatedComment : c)));
    } catch (error) {
      setLocalComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === replyId
                    ? {
                        ...r,
                        likes: hasLiked ? r.likes + 1 : r.likes - 1,
                        likedBy: hasLiked ? [...r.likedBy, user.uid] : r.likedBy.filter((id) => id !== user.uid),
                        dislikes: hasDisliked ? r.dislikes + 1 : r.dislikes,
                        dislikedBy: hasDisliked ? [...r.dislikedBy, user.uid] : r.dislikedBy,
                      }
                    : r
                ),
              }
            : c
        )
      );
      toast({
        title: "Ошибка",
        description: "Не удалось поставить лайк",
        variant: "destructive",
      });
    } finally {
      setIsLiking((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDislikeReply = async (commentId: string, replyId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы ставить дизлайки",
        variant: "destructive",
      });
      return;
    }

    const key = `${commentId}-${replyId}`;
    if (isLiking[key] || isDisliking[key]) return;

    setIsDisliking((prev) => ({ ...prev, [key]: true }));

    const comment = localComments.find((c) => c.id === commentId);
    if (!comment) return;
    const reply = comment.replies.find((r) => r.id === replyId);
    if (!reply) return;

    const hasLiked = reply.likedBy.includes(user.uid);
    const hasDisliked = reply.dislikedBy.includes(user.uid);

    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: c.replies.map((r) =>
                r.id === replyId
                  ? {
                      ...r,
                      dislikes: hasDisliked ? r.dislikes - 1 : r.dislikes + 1,
                      dislikedBy: hasDisliked ? r.dislikedBy.filter((id) => id !== user.uid) : [...r.dislikedBy, user.uid],
                      likes: hasLiked ? r.likes - 1 : r.likes,
                      likedBy: hasLiked ? r.likedBy.filter((id) => id !== user.uid) : r.likedBy,
                    }
                  : r
              ),
            }
          : c
      )
    );

    try {
      const updatedComment = await dislikeReply(commentId, replyId, user.uid);
      setLocalComments((prev) => prev.map((c) => (c.id === commentId ? updatedComment : c)));
    } catch (error) {
      setLocalComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === replyId
                    ? {
                        ...r,
                        dislikes: hasDisliked ? r.dislikes + 1 : r.dislikes - 1,
                        dislikedBy: hasDisliked ? [...r.dislikedBy, user.uid] : r.dislikedBy.filter((id) => id !== user.uid),
                        likes: hasLiked ? r.likes + 1 : r.likes,
                        likedBy: hasLiked ? [...r.likedBy, user.uid] : r.likedBy,
                      }
                    : r
                ),
              }
            : c
        )
      );
      toast({
        title: "Ошибка",
        description: "Не удалось поставить дизлайк",
        variant: "destructive",
      });
    } finally {
      setIsDisliking((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы удалять комментарии",
        variant: "destructive",
      });
      return;
    }

    if (isDeleting[commentId]) return;

    setIsDeleting((prev) => ({ ...prev, [commentId]: true }));

    try {
      setLocalComments((prev) => prev.filter((c) => c.id !== commentId));
      await deleteComment(commentId, user.uid, user.role || "USER");
      toast({
        title: "Успешно",
        description: "Комментарий удалён",
      });
    } catch (error) {
      setLocalComments((prev) => [...prev, localComments.find((c) => c.id === commentId)!].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить комментарий",
        variant: "destructive",
      });
    } finally {
      setIsDeleting((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы удалять ответы",
        variant: "destructive",
      });
      return;
    }

    const key = `${commentId}-${replyId}`;
    if (isDeletingReply[key]) return;

    setIsDeletingReply((prev) => ({ ...prev, [key]: true }));

    try {
      setLocalComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: c.replies.filter((r) => r.id !== replyId),
              }
            : c
        )
      );

      const updatedComment = await deleteReply(commentId, replyId, user.uid, user.role || "USER");
      setLocalComments((prev) => prev.map((c) => (c.id === commentId ? updatedComment : c)));

      toast({
        title: "Успешно",
        description: "Ответ удалён",
      });
    } catch (error) {
      const comment = localComments.find((c) => c.id === commentId);
      const reply = comment?.replies.find((r) => r.id === replyId);
      if (comment && reply) {
        setLocalComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  replies: [...c.replies, reply].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
                }
              : c
          )
        );
      }
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить ответ",
        variant: "destructive",
      });
    } finally {
      setIsDeletingReply((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Обработчик для начала редактирования комментария
  const handleStartEditComment = (commentId: string, content: string) => {
    setIsEditing((prev) => ({ ...prev, [commentId]: true }));
    setEditContent((prev) => ({ ...prev, [commentId]: content }));
  };

  // Обработчик для отмены редактирования комментария
  const handleCancelEditComment = (commentId: string) => {
    setIsEditing((prev) => ({ ...prev, [commentId]: false }));
    setEditContent((prev) => ({ ...prev, [commentId]: "" }));
  };

  // Обработчик для сохранения отредактированного комментария
  const handleSaveEditComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы редактировать комментарии",
        variant: "destructive",
      });
      return;
    }

    if (user.isBanned) {
      toast({
        title: "Ошибка",
        description: "Вы не можете редактировать комментарии, так как заблокированы",
        variant: "destructive",
      });
      return;
    }

    const content = editContent[commentId]?.trim();
    if (!content) return;

    setIsEditingSaving((prev) => ({ ...prev, [commentId]: true }));

    try {
      const updatedComment = await editComment(commentId, user.uid, user.role || "USER", content);
      setLocalComments((prev) => prev.map((comment) => (comment.id === commentId ? updatedComment : comment)));
      setIsEditing((prev) => ({ ...prev, [commentId]: false }));
      toast({
        title: "Успешно",
        description: "Комментарий отредактирован",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отредактировать комментарий",
        variant: "destructive",
      });
    } finally {
      setIsEditingSaving((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  // Обработчик для начала редактирования ответа
  const handleStartEditReply = (commentId: string, replyId: string, content: string) => {
    const key = `${commentId}-${replyId}`;
    setIsEditingReply((prev) => ({ ...prev, [key]: true }));
    setEditContent((prev) => ({ ...prev, [key]: content }));
  };

  // Обработчик для отмены редактирования ответа
  const handleCancelEditReply = (commentId: string, replyId: string) => {
    const key = `${commentId}-${replyId}`;
    setIsEditingReply((prev) => ({ ...prev, [key]: false }));
    setEditContent((prev) => ({ ...prev, [key]: "" }));
  };

  // Обработчик для сохранения отредактированного ответа
  const handleSaveEditReply = async (commentId: string, replyId: string) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Войдите в аккаунт, чтобы редактировать ответы",
        variant: "destructive",
      });
      return;
    }

    if (user.isBanned) {
      toast({
        title: "Ошибка",
        description: "Вы не можете редактировать ответы, так как заблокированы",
        variant: "destructive",
      });
      return;
    }

    const key = `${commentId}-${replyId}`;
    const content = editContent[key]?.trim();
    if (!content) return;

    setIsEditingSaving((prev) => ({ ...prev, [key]: true }));

    try {
      const updatedComment = await editReply(commentId, replyId, user.uid, user.role || "USER", content);
      setLocalComments((prev) => prev.map((comment) => (comment.id === commentId ? updatedComment : comment)));
      setIsEditingReply((prev) => ({ ...prev, [key]: false }));
      toast({
        title: "Успешно",
        description: "Ответ отредактирован",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отредактировать ответ",
        variant: "destructive",
      });
    } finally {
      setIsEditingSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-4 md:space-y-6" id="comments-section">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold">Комментарии</h2>
        <span className="text-xs md:text-sm text-muted-foreground">
          {localComments.length > 0 ? `Всего: ${localComments.length}` : ''}
        </span>
      </div>

      {/* Форма для добавления комментария */}
      {user?.isBanned ? (
        <div className="text-red-500 mb-4 text-sm md:text-base">Вы не можете оставлять комментарии, так как заблокированы</div>
      ) : (
        <form onSubmit={handleSubmitComment} className="space-y-3 md:space-y-4">
          <Textarea 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)} 
            placeholder="Оставьте ваш комментарий..." 
            className="min-h-[80px] md:min-h-[100px] text-sm md:text-base" 
          />
          <Button type="submit" size={isMobile ? "sm" : "default"}>Отправить</Button>
        </form>
      )}

      {/* Список комментариев */}
      {localComments.length === 0 ? (
        <p className="text-muted-foreground text-sm md:text-base">Комментариев пока нет. Будьте первым!</p>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {currentComments.map((comment) => (
            <div key={comment.id} className="border-b pb-3 md:pb-4">
              <div className="flex items-start gap-2 md:gap-4">
                <Avatar className="w-6 h-6 md:w-8 md:h-8">
                  <AvatarImage src={comment.avatarUrl} alt={comment.user} />
                  <AvatarFallback>{comment.user.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1 md:gap-2">
                    <Link to={`/profile/${comment.user}`} className="flex flex-row gap-1 md:gap-2 justify-content items-center font-medium text-sm md:text-base">
                      {comment.user}
                      {comment.role === ("ADMIN" as EnumRoleType) ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="h-3 w-3 md:h-4 md:w-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center transition-transform transform hover:scale-110">
                              <Star className="h-2 w-2 md:h-3 md:w-3 fill-white/60 stroke-white/50" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={10} side="right" className="transition-opacity duration-300">
                            Администратор
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                      {comment.isBanned && (
                        <div className="tooltip" data-tip="Пользователь заблокирован">
                          <Skull className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                    </Link>
                    <span className="text-xs md:text-sm text-muted-foreground">
                      {comment.date}
                      {comment.updatedAt && " (ред.)"}
                    </span>
                  </div>
                  
                  {/* Редактирование комментария */}
                  {isEditing[comment.id] ? (
                    <div className="mt-1 space-y-2">
                      <Textarea 
                        value={editContent[comment.id] || ""} 
                        onChange={(e) => setEditContent((prev) => ({ ...prev, [comment.id]: e.target.value }))} 
                        className="min-h-[60px] md:min-h-[80px] text-sm" 
                      />
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={() => handleSaveEditComment(comment.id)}
                          disabled={isEditingSaving[comment.id]}
                        >
                          {isEditingSaving[comment.id] ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                          Сохранить
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCancelEditComment(comment.id)}
                          disabled={isEditingSaving[comment.id]}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm md:text-base">{comment.content}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-2">
                    <Button variant={user && comment.likedBy.includes(user.uid) ? "default" : "outline"} size="sm" className="gap-1 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" onClick={() => handleLikeComment(comment.id)} disabled={isLiking[comment.id] || isDisliking[comment.id]}>
                      <ThumbsUp className="w-3 h-3 md:w-4 md:h-4" />
                      {comment.likes}
                    </Button>
                    <Button variant={user && comment.dislikedBy.includes(user.uid) ? "default" : "outline"} size="sm" className="gap-1 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" onClick={() => handleDislikeComment(comment.id)} disabled={isLiking[comment.id] || isDisliking[comment.id]}>
                      <ThumbsDown className="w-3 h-3 md:w-4 md:h-4" />
                      {comment.dislikes}
                    </Button>
                    {!user?.isBanned && (
                      <Button variant="outline" size="sm" className="gap-1 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" onClick={() => setIsReplying((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))}>
                        <Reply className="w-3 h-3 md:w-4 md:h-4" />
                        Ответить
                      </Button>
                    )}
                    {/* Кнопка редактирования комментария */}
                    {user && !user.isBanned && (comment.userId === user.uid || user.role === EnumRole.ADMIN) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" 
                        onClick={() => handleStartEditComment(comment.id, comment.content)}
                        disabled={isEditing[comment.id]}
                      >
                        <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                        Редактировать
                      </Button>
                    )}
                    {user && (comment.userId === user.uid || user.role === EnumRole.ADMIN) && (
                      <Button variant="outline" size="sm" className="gap-1 text-red-500 hover:text-red-700 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" onClick={() => handleDeleteComment(comment.id)} disabled={isDeleting[comment.id]}>
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        {isDeleting[comment.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Удалить"}
                      </Button>
                    )}
                  </div>

                  {/* Форма для ответа */}
                  {isReplying[comment.id] && !user?.isBanned && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleReply(comment.id);
                      }}
                      className="mt-3 md:mt-4 space-y-2"
                    >
                      <Textarea 
                        value={replyContent[comment.id] || ""} 
                        onChange={(e) => setReplyContent((prev) => ({ ...prev, [comment.id]: e.target.value }))} 
                        placeholder="Ваш ответ..." 
                        className="min-h-[60px] md:min-h-[80px] text-sm" 
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">Отправить</Button>
                        <Button variant="outline" size="sm" onClick={() => setIsReplying((prev) => ({ ...prev, [comment.id]: false }))}>
                          Отмена
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Ответы на комментарий */}
              {comment.replies.length > 0 && (
                <div className="ml-6 md:ml-8 mt-3 md:mt-4 space-y-2 md:space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-2 md:gap-4">
                      <Avatar className="w-6 h-6 md:w-8 md:h-8">
                        <AvatarImage src={reply.avatarUrl} alt={reply.user} />
                        <AvatarFallback>{reply.user.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex flex-row items-center gap-1 md:gap-2">
                          <Link to={`/profile/${reply.user}`} className="flex flex-row gap-1 md:gap-2 justify-content items-center font-medium text-sm md:text-base">
                            <span className="font-medium">{reply.user}</span>
                            {reply.role === ("ADMIN" as EnumRoleType) ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="h-3 w-3 md:h-4 md:w-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center transition-transform transform hover:scale-110">
                                    <Star className="h-2 w-2 md:h-3 md:w-3 fill-white/60 stroke-white/50" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={10} side="right" className="transition-opacity duration-300">
                                  Администратор
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                            {reply.isBanned && (
                              <div className="tooltip" data-tip="Пользователь заблокирован">
                                <Skull className="w-3 h-3 text-red-500" />
                              </div>
                            )}
                          </Link>
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {new Date(reply.createdAt).toLocaleDateString("ru-RU")}
                            {reply.updatedAt && " (ред.)"}
                          </span>
                        </div>
                        
                        {/* Редактирование ответа */}
                        {isEditingReply[`${comment.id}-${reply.id}`] ? (
                          <div className="mt-1 space-y-2">
                            <Textarea 
                              value={editContent[`${comment.id}-${reply.id}`] || ""} 
                              onChange={(e) => setEditContent((prev) => ({ ...prev, [`${comment.id}-${reply.id}`]: e.target.value }))} 
                              className="min-h-[60px] md:min-h-[80px] text-sm" 
                            />
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                size="sm" 
                                onClick={() => handleSaveEditReply(comment.id, reply.id)}
                                disabled={isEditingSaving[`${comment.id}-${reply.id}`]}
                              >
                                {isEditingSaving[`${comment.id}-${reply.id}`] ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                                Сохранить
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleCancelEditReply(comment.id, reply.id)}
                                disabled={isEditingSaving[`${comment.id}-${reply.id}`]}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Отмена
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 text-sm md:text-base">{reply.content}</p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-2">
                          <Button variant={user && reply.likedBy.includes(user.uid) ? "default" : "outline"} size="sm" className="gap-1 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" onClick={() => handleLikeReply(comment.id, reply.id)} disabled={isLiking[`${comment.id}-${reply.id}`] || isDisliking[`${comment.id}-${reply.id}`]}>
                            <ThumbsUp className="w-3 h-3 md:w-4 md:h-4" />
                            {reply.likes}
                          </Button>
                          <Button variant={user && reply.dislikedBy.includes(user.uid) ? "default" : "outline"} size="sm" className="gap-1 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" onClick={() => handleDislikeReply(comment.id, reply.id)} disabled={isLiking[`${comment.id}-${reply.id}`] || isDisliking[`${comment.id}-${reply.id}`]}>
                            <ThumbsDown className="w-3 h-3 md:w-4 md:h-4" />
                            {reply.dislikes}
                          </Button>
                          {/* Кнопка редактирования ответа */}
                          {user && !user.isBanned && (reply.userId === user.uid || user.role === EnumRole.ADMIN) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" 
                              onClick={() => handleStartEditReply(comment.id, reply.id, reply.content)}
                              disabled={isEditingReply[`${comment.id}-${reply.id}`]}
                            >
                              <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                              Редактировать
                            </Button>
                          )}
                          {user && (reply.userId === user.uid || user.role === EnumRole.ADMIN) && (
                            <Button variant="outline" size="sm" className="gap-1 text-red-500 hover:text-red-700 h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm" onClick={() => handleDeleteReply(comment.id, reply.id)} disabled={isDeletingReply[`${comment.id}-${reply.id}`]}>
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                              {isDeletingReply[`${comment.id}-${reply.id}`] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Удалить"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <Pagination className="mt-4">
          {isMobile ? (
            <PaginationContent className="gap-1">
              {/* Кнопка "Назад" (только иконка) */}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1}
                  className={cn(
                    "px-2",
                    currentPage === 1 ? "pointer-events-none opacity-50" : "",
                    buttonVariants({ variant: "ghost", size: "sm" })
                  )}
                  aria-label="Предыдущая страница"
                >
                  <ChevronLeft className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>

              {/* Компактная пагинация для мобильных устройств */}
              <PaginationItem>
                <span className="text-xs p-2">
                  {currentPage} из {totalPages}
                </span>
              </PaginationItem>

              {/* Кнопка "Вперед" (только иконка) */}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={cn(
                    "px-2",
                    currentPage === totalPages ? "pointer-events-none opacity-50" : "",
                    buttonVariants({ variant: "ghost", size: "sm" })
                  )}
                  aria-label="Следующая страница"
                >
                  <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          ) : (
            <PaginationContent className="gap-3">
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1}
                  className={cn(
                    "px-3 py-2",
                    currentPage === 1 ? "pointer-events-none opacity-50" : "",
                    buttonVariants({ variant: "ghost", size: "default" })
                  )}
                  aria-label="Предыдущая страница"
                >
                  <ChevronLeft className="h-5 w-5" />
                </PaginationLink>
              </PaginationItem>

              {/* Умное отображение номеров страниц для ПК */}
              {(() => {
                const pages = [];
                
                // Всегда показываем первую страницу с более крупным размером
                pages.push(
                  <PaginationItem key={1}>
                    <PaginationLink
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(1);
                      }}
                      isActive={currentPage === 1}
                      href="#"
                      className={cn(
                        "px-3 py-2 font-semibold",
                        currentPage === 1 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                      )}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                );
                
                // Если текущая страница > 2, показываем многоточие
                if (currentPage > 2) {
                  pages.push(
                    <PaginationItem key="ellipsis-start">
                      <PaginationEllipsis className="text-lg" />
                    </PaginationItem>
                  );
                }
                
                // Показываем 3 страницы вокруг текущей (если возможно)
                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                  pages.push(
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(i);
                        }}
                        isActive={currentPage === i}
                        href="#"
                        className={cn(
                          "px-3 py-2 font-semibold",
                          currentPage === i ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                        )}
                      >
                        {i}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                
                // Если текущая страница < последняя - 1, показываем многоточие
                if (currentPage < totalPages - 1) {
                  pages.push(
                    <PaginationItem key="ellipsis-end">
                      <PaginationEllipsis className="text-lg" />
                    </PaginationItem>
                  );
                }
                
                // Всегда показываем последнюю страницу с более крупным размером
                if (totalPages > 1) {
                  pages.push(
                    <PaginationItem key={totalPages}>
                      <PaginationLink
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(totalPages);
                        }}
                        isActive={currentPage === totalPages}
                        href="#"
                        className={cn(
                          "px-3 py-2 font-semibold",
                          currentPage === totalPages ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                        )}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                
                return pages;
              })()}

              {/* Кнопка "Вперед" (только иконка) */}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={cn(
                    "px-3 py-2",
                    currentPage === totalPages ? "pointer-events-none opacity-50" : "",
                    buttonVariants({ variant: "ghost", size: "default" })
                  )}
                  aria-label="Следующая страница"
                >
                  <ChevronRight className="h-5 w-5" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          )}
        </Pagination>
      )}
    </div>
  );
};

export default CommentSection;
