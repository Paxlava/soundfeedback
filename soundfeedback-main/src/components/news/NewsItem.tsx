import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronUp, AlertCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { News } from "@/types/newsTypes";
import { SERVER_URL } from "@/lib/utils";
import ShareButtons from "@/components/ui/ShareButtons";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getUserData } from "@/services/userService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { censorText } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NewsItemProps {
  news: News;
  isAdmin?: boolean;
  onEdit?: (news: News) => void;
  onDelete?: (newsId: string) => void;
}

// Функция для форматирования даты и времени
const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "d MMMM yyyy, HH:mm", { locale: ru });
};

// Компонент для отображения сворачиваемого текста
const CollapsibleText: React.FC<{ text: string; maxLength?: number; disableCensorship?: boolean }> = ({ 
  text, 
  maxLength = 300,
  disableCensorship = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();
  const actualMaxLength = isMobile ? 150 : maxLength;
  
  const isLongText = text.length > actualMaxLength;
  
  // Применяем цензуру к тексту
  const censoredText = useMemo(() => censorText(text, { disableCensorship }), [text, disableCensorship]);
  
  const displayText = isExpanded || !isLongText
    ? censoredText
    : `${censoredText.substring(0, actualMaxLength)}...`;

  return (
    <div className="space-y-2">
      <p className="whitespace-pre-line text-sm md:text-base leading-relaxed">{displayText}</p>
      {isLongText && (
        <Button
          variant="link"
          size="sm"
          className="p-0 h-auto text-primary"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Свернуть" : "Читать далее"}
        </Button>
      )}
    </div>
  );
};

// Компонент для отображения галереи изображений
const ImageGallery: React.FC<{ images: string[] }> = ({ images }) => {
  const isMobile = useIsMobile();
  
  // Правильные URL для изображений
  const getImageUrl = (path: string) => {
    if (path.startsWith("http")) return path;
    return `${SERVER_URL}${path}`;
  };
  
  // Отрисовка галереи в зависимости от количества изображений (стиль Facebook)
  const renderGalleryGrid = () => {
    if (images.length === 0) return null;
    
    if (images.length === 1) {
      return (
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <img
            src={getImageUrl(images[0])}
            alt="Изображение новости"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }
    
    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1">
          {images.map((img, idx) => (
            <div key={idx} className="aspect-square rounded-lg overflow-hidden">
              <img
                src={getImageUrl(img)}
                alt={`Изображение ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      );
    }
    
    if (images.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-1">
          <div className="row-span-2 aspect-square rounded-lg overflow-hidden">
            <img
              src={getImageUrl(images[0])}
              alt="Изображение 1"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="aspect-square rounded-lg overflow-hidden">
            <img
              src={getImageUrl(images[1])}
              alt="Изображение 2"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="aspect-square rounded-lg overflow-hidden">
            <img
              src={getImageUrl(images[2])}
              alt="Изображение 3"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      );
    }
    
    if (images.length === 4) {
      return (
        <div className="grid grid-cols-2 gap-1">
          {images.map((img, idx) => (
            <div key={idx} className="aspect-square rounded-lg overflow-hidden">
              <img
                src={getImageUrl(img)}
                alt={`Изображение ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      );
    }
    
    // Для 5 и более изображений
    return (
      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-1">
          <div className="aspect-square rounded-lg overflow-hidden">
            <img
              src={getImageUrl(images[0])}
              alt="Изображение 1"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="aspect-square rounded-lg overflow-hidden">
            <img
              src={getImageUrl(images[1])}
              alt="Изображение 2"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="aspect-square rounded-lg overflow-hidden">
            <img
              src={getImageUrl(images[2])}
              alt="Изображение 3"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="aspect-square rounded-lg overflow-hidden">
            <img
              src={getImageUrl(images[3])}
              alt="Изображение 4"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="aspect-square rounded-lg overflow-hidden relative">
            <img
              src={getImageUrl(images[4])}
              alt="Изображение 5"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {images.length > 5 && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                <span className="text-white font-medium text-lg">+{images.length - 5}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full">
      {renderGalleryGrid()}
    </div>
  );
};

// Скелетон для загрузки новости
export const NewsItemSkeleton: React.FC = () => {
  const isMobile = useIsMobile();
  
  return (
    <Card className={isMobile ? "mb-4" : ""}>
      <CardHeader className={isMobile ? "p-3" : ""}>
        <Skeleton className="h-6 w-2/3 mb-2" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent className={isMobile ? "p-3 pt-0" : ""}>
        <div className="space-y-2">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </CardContent>
      <CardFooter className={isMobile ? "p-3" : ""}>
        <Skeleton className="h-4 w-1/4" />
      </CardFooter>
    </Card>
  );
};

// Компонент автора новости
const AuthorInfo: React.FC<{ authorId: string }> = ({ authorId }) => {
  const [author, setAuthor] = useState<{ username: string; avatarUrl?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuthorData = async () => {
      try {
        const userData = await getUserData(authorId);
        if (userData) {
          setAuthor({
            username: userData.username || 'Неизвестный пользователь',
            avatarUrl: userData.avatarUrl
          });
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных автора:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthorData();
  }, [authorId]);

  const handleAuthorClick = () => {
    if (author?.username && author.username !== 'Неизвестный пользователь') {
      console.log('Navigating to user profile:', author.username);
      navigate(`/profile/${author.username}`);
    }
  };

  if (isLoading) {
    return <span className="text-sm text-muted-foreground">Загрузка...</span>;
  }

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={handleAuthorClick}
      title={`Перейти к профилю ${author?.username || 'пользователя'}`}
    >
      <Avatar className="h-5 w-5">
        {author?.avatarUrl ? (
          <AvatarImage src={author.avatarUrl} alt={author.username} />
        ) : (
          <AvatarFallback>
            <User className="h-3 w-3" />
          </AvatarFallback>
        )}
      </Avatar>
      <span className="underline-offset-2 hover:underline">{author?.username || 'Неизвестный пользователь'}</span>
    </div>
  );
};

// Основной компонент новостной карточки
const NewsItem: React.FC<NewsItemProps> = ({ news, isAdmin = false, onEdit, onDelete }) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Получаем URL для шеринга новости
  const newsUrl = useMemo(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/news/${news.id}`;
  }, [news.id]);

  // Функция для преобразования всех ссылок в тексте в активные HTML-ссылки
  const textWithLinks = useMemo(() => {
    if (!news.text) return "";
    
    // Регулярное выражение для поиска URL в тексте
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return news.text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
  }, [news.text]);

  // Проверка, является ли новость важной (если есть такое поле)
  const isImportant = news.hasOwnProperty('isImportant') ? (news as any).isImportant : false;

  return (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${isMobile ? "mb-4" : ""}`}>
      <CardHeader className={isMobile ? "p-3" : ""}>
        <div className="flex justify-between items-start gap-4">
          <CardTitle className={isMobile ? "text-lg" : "text-xl"}>{news.title}</CardTitle>
          {isImportant && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span className="hidden md:inline">Важно</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Важная информация</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={isMobile ? "p-3 pt-0" : ""}>
        <div className="space-y-4">
          {/* Текст новости с поддержкой ссылок */}
          <CollapsibleText 
            text={news.text || ""} 
            disableCensorship={false}
          />
          
          {/* Галерея изображений */}
          {news.imageUrls && news.imageUrls.length > 0 && (
            <ImageGallery images={news.imageUrls} />
          )}
        </div>
      </CardContent>
      
      <CardFooter className={`${isMobile ? "p-3 pt-1" : "pt-1"} flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4`}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {news.authorId && <AuthorInfo authorId={news.authorId} />}
          {news.createdAt && (
            <span>
              {formatDateTime(news.createdAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Кнопки для шаринга */}
          <ShareButtons 
            url={newsUrl} 
            title={news.title} 
            size="sm" 
            variant="outline"
          />
          
          {/* Кнопки для администратора */}
          {isAdmin && (
            <>
              {onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(news)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="outline" onClick={() => onDelete(news.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default NewsItem;
