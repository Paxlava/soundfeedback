import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Edit, Trash2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import YandexMusicEmbed from "./YandexMusicEmbed";
import { useIsMobile } from "@/hooks/use-mobile";
import { censorText } from "@/lib/utils";

interface ReviewContentProps {
  content: string;
  yandexMusicId?: string | null;
  reviewId: string;
  title: string;
  artist?: string;
  onEdit?: (newContent: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onLike?: () => Promise<void>;
  onDislike?: () => Promise<void>;
  hasLiked?: boolean;
  hasDisliked?: boolean;
  isLiking?: boolean;
  isDisliking?: boolean;
  isOwner?: boolean;
  isBanned?: boolean;
  likes?: number;
  dislikes?: number;
  views?: number;
}

const ReviewContent = ({ 
  content, 
  yandexMusicId, 
  reviewId,
  title,
  artist,
  onEdit, 
  onDelete, 
  onLike,
  onDislike,
  hasLiked = false,
  hasDisliked = false,
  isLiking = false,
  isDisliking = false,
  isOwner = false,
  isBanned = false,
  likes = 0,
  dislikes = 0,
  views = 0
}: ReviewContentProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setIsMobile(useIsMobile());
  }, []);

  const handleEdit = async (newContent: string) => {
    try {
      setIsSaving(true);
      await onEdit?.(newContent);
      setIsEditing(false);
      setEditContent(newContent);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete?.();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить рецензию",
        variant: "destructive",
      });
    }
  };

  const handleLike = async () => {
    try {
      await onLike?.();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось оценить рецензию",
        variant: "destructive",
      });
    }
  };

  const handleDislike = async () => {
    try {
      await onDislike?.();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось оценить рецензию",
        variant: "destructive",
      });
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const saveEdit = () => {
    handleEdit(editContent);
  };

  // Цензурирование контента
  const censoredContent = useMemo(() => {
    // Название альбома и исполнителя не должны подвергаться цензуре
    const albumsAndArtists = [];
    if (title) albumsAndArtists.push(title);
    if (artist) albumsAndArtists.push(artist);
    
    return censorText(content, { 
      albums: albumsAndArtists.filter(Boolean) as string[],
      artists: albumsAndArtists.filter(Boolean) as string[]
    });
  }, [content, title, artist]);

  return (
    <div className="space-y-4">
      {/* Текст рецензии */}
      <Card>
        <CardContent className={`${isMobile ? 'p-3' : 'p-6'} prose max-w-none`}>
          <div className="whitespace-pre-line">
            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  className="min-h-[200px]"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Введите текст рецензии..."
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={cancelEdit}>Отмена</Button>
                  <Button onClick={saveEdit} disabled={isSaving}>
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </div>
              </div>
            ) : (
              <p>{censoredContent}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewContent; 