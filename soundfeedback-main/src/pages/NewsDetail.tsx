import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getNewsById } from "@/services/newsService";
import { getUserData } from "@/services/userService";
import { News } from "@/types/newsTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import Loader from "@/components/Loader";
import { SERVER_URL } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, ChevronLeft, ChevronRight, X, User } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ShareButtons from "@/components/ui/ShareButtons";
import { useAuth } from "@/hooks/useAuth";
import { EnumRole } from "@/enums/role";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { censorText } from "@/lib/utils";

const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "d MMMM yyyy, HH:mm", { locale: ru });
};

// Компонент просмотра изображений в стиле Facebook
const FacebookStyleGallery: React.FC<{ images: string[] }> = ({ images }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Получение URL изображения с учетом относительных путей
  const getImageUrl = (url: string): string => {
    if (url.startsWith('http')) return url;
    return `${SERVER_URL}${url}`;
  };

  // Листание изображений
  const navigateImage = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    } else {
      setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    }
  };

  // Обработка кнопок клавиатуры для навигации по изображениям
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDialogOpen) return;
      
      if (e.key === "ArrowLeft") {
        navigateImage("prev");
      } else if (e.key === "ArrowRight") {
        navigateImage("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, images.length]);

  // Разное отображение в зависимости от количества изображений
  const renderGalleryGrid = () => {
    if (images.length === 0) return null;
    
    if (images.length === 1) {
      return (
        <div 
          className="aspect-video w-full rounded-lg overflow-hidden cursor-pointer"
          onClick={() => {
            setSelectedImageIndex(0);
            setIsDialogOpen(true);
          }}
        >
          <img
            src={getImageUrl(images[0])}
            alt="Изображение к новости"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }
    
    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image, idx) => (
            <div 
              key={idx}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer"
              onClick={() => {
                setSelectedImageIndex(idx);
                setIsDialogOpen(true);
              }}
            >
              <img
                src={getImageUrl(image)}
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
        <div className="grid grid-cols-2 gap-2">
          <div 
            className="aspect-video row-span-2 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => {
              setSelectedImageIndex(0);
              setIsDialogOpen(true);
            }}
          >
            <img
              src={getImageUrl(images[0])}
              alt="Основное изображение"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div 
            className="aspect-square rounded-lg overflow-hidden cursor-pointer"
            onClick={() => {
              setSelectedImageIndex(1);
              setIsDialogOpen(true);
            }}
          >
            <img
              src={getImageUrl(images[1])}
              alt="Дополнительное изображение 1"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div 
            className="aspect-square rounded-lg overflow-hidden cursor-pointer"
            onClick={() => {
              setSelectedImageIndex(2);
              setIsDialogOpen(true);
            }}
          >
            <img
              src={getImageUrl(images[2])}
              alt="Дополнительное изображение 2"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      );
    }
    
    // Для 4 и более изображений
    return (
      <div className="grid grid-cols-2 gap-2">
        <div 
          className="aspect-square rounded-lg overflow-hidden cursor-pointer"
          onClick={() => {
            setSelectedImageIndex(0);
            setIsDialogOpen(true);
          }}
        >
          <img
            src={getImageUrl(images[0])}
            alt="Изображение 1"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div 
          className="aspect-square rounded-lg overflow-hidden cursor-pointer"
          onClick={() => {
            setSelectedImageIndex(1);
            setIsDialogOpen(true);
          }}
        >
          <img
            src={getImageUrl(images[1])}
            alt="Изображение 2"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div 
          className="aspect-square rounded-lg overflow-hidden cursor-pointer"
          onClick={() => {
            setSelectedImageIndex(2);
            setIsDialogOpen(true);
          }}
        >
          <img
            src={getImageUrl(images[2])}
            alt="Изображение 3"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div 
          className="aspect-square rounded-lg overflow-hidden cursor-pointer relative"
          onClick={() => {
            setSelectedImageIndex(3);
            setIsDialogOpen(true);
          }}
        >
          <img
            src={getImageUrl(images[3])}
            alt="Изображение 4"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {images.length > 4 && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
              <span className="text-white font-medium text-lg">+{images.length - 4}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderGalleryGrid()}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="p-0 max-w-screen-lg w-screen h-screen flex items-center justify-center bg-black bg-opacity-90 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Кнопка закрытия */}
            <Button 
              className="absolute right-4 top-4 z-10 rounded-full bg-black/40 text-white hover:bg-black/60"
              size="icon"
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            
            {/* Кнопки навигации */}
            {images.length > 1 && (
              <>
                <Button 
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/40 text-white hover:bg-black/60"
                  size="icon"
                  variant="ghost"
                  onClick={() => navigateImage("prev")}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <Button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/40 text-white hover:bg-black/60"
                  size="icon"
                  variant="ghost"
                  onClick={() => navigateImage("next")}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            
            {/* Счетчик изображений */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                {selectedImageIndex + 1} / {images.length}
              </div>
            )}
            
            {/* Отображение текущего изображения */}
            <img
              src={getImageUrl(images[selectedImageIndex])}
              alt={`Изображение ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
    return <span className="text-sm text-muted-foreground">Загрузка данных автора...</span>;
  }

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={handleAuthorClick}
      title={`Перейти к профилю ${author?.username || 'пользователя'}`}
    >
      <Avatar className="h-8 w-8">
        {author?.avatarUrl ? (
          <AvatarImage src={author.avatarUrl} alt={author.username} />
        ) : (
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>
      <span className="text-sm font-medium underline-offset-2 hover:underline">{author?.username || 'Неизвестный пользователь'}</span>
    </div>
  );
};

// Основной компонент страницы детального просмотра новости
const NewsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // URL для шаринга
  const shareUrl = window.location.href;
  
  // Загрузка данных новости
  const fetchNewsData = useCallback(async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const newsData = await getNewsById(id);
      setNews(newsData);
    } catch (err: any) {
      console.error("Ошибка при загрузке новости:", err);
      setError(err.message || "Не удалось загрузить новость");
    } finally {
      setIsLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchNewsData();
  }, [fetchNewsData]);
  
  // Мемоизируем текст с примененной цензурой
  const censoredNewsText = useMemo(() => {
    if (!news) return "";
    
    // Получаем названия альбомов и артистов для исключения из цензуры
    const albumsAndArtists = news.title ? [news.title] : [];
    
    return censorText(news.text, { 
      albums: albumsAndArtists,
      disableCensorship: false
    });
  }, [news]);
  
  // Возврат назад
  const handleGoBack = () => {
    navigate(-1);
  };
  
  if (isLoading) {
    return <Loader />;
  }
  
  if (error || !news) {
    return <ErrorDisplay message={error || "Новость не найдена"} onRetry={fetchNewsData} />;
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleGoBack} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>
        
        <div className="flex items-center gap-2">
          <ShareButtons 
            url={shareUrl} 
            title={news.title} 
            variant="outline"
            size="sm"
          />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className={`${isMobile ? "text-2xl" : "text-3xl"} mb-2`}>
            {news.title}
          </CardTitle>
          <div className="flex flex-wrap items-center justify-between">
            {/* Информация об авторе */}
            {news.authorId && <AuthorInfo authorId={news.authorId} />}
            
            {/* Дата публикации */}
            {news.createdAt && (
              <span className="text-sm text-muted-foreground">
                {formatDateTime(news.createdAt)}
              </span>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div 
            ref={contentRef}
            className="space-y-6"
          >
            {/* Изображения (выводим вначале для лучшего UX) */}
            {news.imageUrls && news.imageUrls.length > 0 && (
              <FacebookStyleGallery images={news.imageUrls} />
            )}
            
            {/* Текст новости */}
            <div className="whitespace-pre-line text-base md:text-lg leading-relaxed">
              {censoredNewsText}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Админские действия */}
      {user?.role === EnumRole.ADMIN && (
        <div className="mt-6 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/admin/news/edit/${news.id}`)}
          >
            Редактировать
          </Button>
        </div>
      )}
    </div>
  );
};

export default NewsDetail; 