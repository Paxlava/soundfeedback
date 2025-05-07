// ReviewHeader.tsx
import { EnumRating } from "@/enums/rating";
import { EnumType } from "@/enums/type";
import { getRatingColor } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SERVER_URL } from "@/lib/utils";
import { Eye, PenSquare, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { EnumRole } from "@/enums/role";
import { useState } from "react";

interface ReviewHeaderProps {
  album: string;
  artist: string;
  type: string;
  rating: keyof typeof EnumRating;
  coverUrl: string;
  customCoverUrl?: string;
  views?: number;
  reviewId?: string;
  isEditorial?: boolean;
  onCoverEdit?: (file: File) => Promise<void>;
  onCoverDelete?: () => Promise<void>;
}

// Функция для форматирования числа просмотров
const formatViewCount = (views: number): string => {
  // Для миллионов и тысяч просто добавляем суффикс без склонения
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M просмотров`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K просмотров`;
  }
  
  // Правильное склонение для целых чисел
  const lastDigit = views % 10;
  const lastTwoDigits = views % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${views} просмотров`;
  } else if (lastDigit === 1) {
    return `${views} просмотр`;
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return `${views} просмотра`;
  } else {
    return `${views} просмотров`;
  }
};

const ReviewHeader = ({ 
  album, 
  artist, 
  type, 
  rating, 
  coverUrl, 
  customCoverUrl, 
  views,
  reviewId,
  isEditorial = false,
  onCoverEdit,
  onCoverDelete
}: ReviewHeaderProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  
  // Проверяем, является ли пользователь администратором
  const isAdmin = user?.role === EnumRole.ADMIN;
  
  // Проверяем, показывать ли кнопки редактирования обложки
  const showCoverControls = isAdmin && isEditorial && reviewId && (onCoverEdit || onCoverDelete);

  // Функция для корректной обработки URL обложки
  const getImageUrl = (url: string | undefined): string => {
    if (!url) {
      console.log("URL is empty, using placeholder");
      return "/placeholder.svg";
    }
    
    // Если URL начинается с http(s):// или data:, возвращаем как есть
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      console.log("URL starts with http/https/data, using as is:", url);
      return url;
    }
    
    // Если это относительный путь, добавляем SERVER_URL
    if (url.startsWith('/')) {
      const fullUrl = `${SERVER_URL}${url}`;
      console.log("URL is relative, adding SERVER_URL:", fullUrl);
      return fullUrl;
    }
    
    // Если путь не начинается с "/", но является строкой, попробуем добавить SERVER_URL
    if (typeof url === 'string' && url.trim() !== '') {
      const fullUrl = `${SERVER_URL}/${url}`;
      console.log("URL is not recognized format, trying with SERVER_URL/:", fullUrl);
      return fullUrl;
    }
    
    // Если ничего не подошло, используем fallback
    console.log("URL format not recognized, using placeholder");
    return "/placeholder.svg";
  };

  // Получаем URL обложки с приоритетом на customCoverUrl
  const getDisplayCoverUrl = (): string => {
    console.log("Getting display cover URL, customCoverUrl:", customCoverUrl, "coverUrl:", coverUrl);
    if (customCoverUrl) {
      return getImageUrl(customCoverUrl);
    }
    return getImageUrl(coverUrl);
  };
  
  // Обработчик загрузки новой обложки
  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onCoverEdit) {
      // Проверяем размер файла (не более 5 МБ)
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл слишком большой. Максимальный размер — 5 МБ.");
        return;
      }
      
      // Проверяем тип файла
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        alert("Поддерживаются только файлы JPEG и PNG.");
        return;
      }
      
      try {
        setIsUploading(true);
        await onCoverEdit(file);
      } catch (error) {
        console.error("Ошибка при загрузке обложки:", error);
        alert("Не удалось загрузить обложку");
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className={isMobile ? "mb-4" : "mb-8"}>
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        <div className="relative group">
          <img 
            src={getDisplayCoverUrl()}
            alt={`${album} cover`} 
            className={`${isMobile ? "w-full" : "w-full md:w-64"} aspect-square overflow-hidden rounded-lg shadow-md object-cover`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder.svg";
            }}
          />
          
          {/* Элементы управления обложкой для администратора */}
          {showCoverControls && (
            <>
              {/* Фон при наведении */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                {isUploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                    <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              
              {/* Кнопки управления */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  {/* Кнопка редактирования обложки */}
                  {onCoverEdit && !isUploading && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label htmlFor={`cover-upload-${reviewId}`} className="p-2 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                          <PenSquare className="h-5 w-5" />
                        </label>
                      </TooltipTrigger>
                      <TooltipContent>Изменить обложку</TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Кнопка удаления обложки */}
                  {onCoverDelete && customCoverUrl && !isUploading && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={onCoverDelete} 
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          disabled={isUploading}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Удалить обложку</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              
              {/* Скрытый инпут для загрузки файла */}
              <input 
                id={`cover-upload-${reviewId}`}
                type="file" 
                accept="image/jpeg,image/jpg,image/png" 
                onChange={handleCoverUpload} 
                className="hidden"
                disabled={isUploading}
              />
            </>
          )}
        </div>
        <div className={`space-y-${isMobile ? "2" : "4"}`}>
          <h1 className={isMobile ? "text-xl font-bold mt-3" : "text-3xl font-bold"}>{album || "Неизвестный альбом"}</h1>
          <p className={isMobile ? "text-base text-muted-foreground" : "text-xl text-muted-foreground"}>{artist || "Неизвестный исполнитель"}</p>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <span className={`text-xs md:text-sm bg-secondary px-2 py-1 md:px-3 md:py-1 rounded-full`}>
              {EnumType[type.toUpperCase()] || "Неизвестный тип"}
            </span>
            <span className={`text-xs md:text-sm font-medium px-2 py-1 md:px-3 md:py-1 rounded-full bg-opacity-10 ${getRatingColor(rating, "bg")} ${getRatingColor(rating, "text")}`}>
              {EnumRating[rating] || "Неизвестная оценка"}
            </span>
          </div>
          {/* Отдельный блок для просмотров */}
          {views !== undefined && views > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground bg-accent/30 px-3 py-2 rounded-md w-fit">
              <Eye className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base font-medium">
                {formatViewCount(views)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewHeader;
