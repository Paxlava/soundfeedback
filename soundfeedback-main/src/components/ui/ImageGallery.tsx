import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageGalleryProps {
  images: string[];
  alts?: string[];
  className?: string;
  imageClassName?: string;
}

// Компонент заглушка для изображений
const ImageSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("relative overflow-hidden", className)}>
    <Skeleton className="absolute inset-0 w-full h-full" />
  </div>
);

// Компонент для изображения с поддержкой lazy loading и скелетона
const LazyImage = memo(({ 
  src, 
  alt, 
  className
}: { 
  src: string; 
  alt: string; 
  className?: string;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Предотвращаем обновление состояния после размонтирования компонента
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleLoad = useCallback(() => {
    if (isMounted.current) {
      setIsLoading(false);
    }
  }, []);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (isMounted.current) {
      setIsLoading(false);
      setError(true);
      const target = e.target as HTMLImageElement;
      target.src = "/placeholder.svg";
    }
  }, []);

  return (
    <div className={cn("relative", className)}>
      {isLoading && <Skeleton className="absolute inset-0 w-full h-full" />}
      <img 
        src={src} 
        alt={alt} 
        loading="lazy"
        decoding="async"
        className={cn("w-full h-full object-cover", {
          "opacity-0": isLoading, 
          "opacity-100 transition-opacity duration-300": !isLoading
        })}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  images, 
  alts,
  className, 
  imageClassName
}) => {
  // Проверка на пустой массив
  if (!images || images.length === 0) {
    return null;
  }

  // Генерация массива альтернативных текстов, если они не предоставлены
  const altTexts = alts || images.map((_, index) => `Изображение ${index + 1}`);

  // Функция для отображения галереи в стиле Facebook
  const renderFacebookStyleGallery = () => {
    const numImages = images.length;
    
    // Одно изображение
    if (numImages === 1) {
      return (
        <div className="w-full overflow-hidden rounded-lg">
          <div className="relative pt-[56.25%]"> {/* 16:9 соотношение сторон */}
            <LazyImage 
              src={images[0]} 
              alt={altTexts[0]} 
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      );
    }
    
    // Два изображения - сетка 2x1
    if (numImages === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {images.map((img, idx) => (
            <div key={idx} className="aspect-square overflow-hidden">
              <LazyImage 
                src={img} 
                alt={altTexts[idx]} 
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      );
    }
    
    // Три изображения - одно большое сверху и два маленьких снизу
    if (numImages === 3) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-1 rounded-lg overflow-hidden">
          <div className="col-span-2 row-span-1 aspect-video overflow-hidden">
            <LazyImage 
              src={images[0]} 
              alt={altTexts[0]} 
              className="w-full h-full"
            />
          </div>
          {images.slice(1, 3).map((img, idx) => (
            <div key={idx} className="aspect-square overflow-hidden">
              <LazyImage 
                src={img} 
                alt={altTexts[idx + 1]} 
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      );
    }
    
    // Четыре изображения - сетка 2x2
    if (numImages === 4) {
      return (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {images.map((img, idx) => (
            <div key={idx} className="aspect-square overflow-hidden">
              <LazyImage 
                src={img} 
                alt={altTexts[idx]} 
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      );
    }
    
    // Пять и более изображений - показываем первые 4 в сетке 2x2, а на последнем счетчик +X
    return (
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        {images.slice(0, 4).map((img, idx) => {
          // Последний элемент (4-й) заменяем на счетчик, если есть больше 5 изображений
          if (idx === 3 && numImages > 5) {
            return (
              <div key={idx} className="aspect-square overflow-hidden relative">
                <LazyImage 
                  src={img} 
                  alt={altTexts[idx]} 
                  className="w-full h-full brightness-50"
                />
                <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-2xl">
                  +{numImages - 4}
                </div>
              </div>
            );
          }
          
          return (
            <div key={idx} className="aspect-square overflow-hidden">
              <LazyImage 
                src={img} 
                alt={altTexts[idx]} 
                className="w-full h-full"
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={className}>
      {renderFacebookStyleGallery()}
    </div>
  );
};

export default ImageGallery; 