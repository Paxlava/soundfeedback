import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImagePreview from "./ImagePreview";
import { NewsFormData } from "@/types/newsTypes";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface NewsFormProps {
  onSubmit: (data: NewsFormData) => Promise<void>;
  isLoading: boolean;
  previewUrls: string[];
  setPreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const NewsForm: React.FC<NewsFormProps> = ({ onSubmit, isLoading, previewUrls, setPreviewUrls, selectedFiles, setSelectedFiles }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<NewsFormData>();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Проверка количества файлов
    if (selectedFiles.length + files.length > 4) {
      toast({
        title: "Ошибка",
        description: "Можно загрузить максимум 4 изображения",
        variant: "destructive",
      });
      return;
    }

    // Проверка типов файлов
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    const invalidFiles = Array.from(files).filter((file) => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      toast({
        title: "Ошибка",
        description: "Поддерживаются только изображения формата JPEG или PNG",
        variant: "destructive",
      });
      return;
    }

    // Добавление файлов в состояние
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    // Создание URL для предпросмотра
    const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (url: string) => {
    const index = previewUrls.indexOf(url);
    if (index > -1) {
      // Удаляем URL из предпросмотра
      setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
      // Удаляем файл из выбранных файлов
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
      // Освобождаем memory
      URL.revokeObjectURL(url);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${isMobile ? 'px-2' : ''}`}>
      <div className="space-y-2">
        <label className="block text-sm font-medium">Заголовок</label>
        <Input 
          {...register("title", { required: "Заголовок обязателен" })} 
          placeholder="Введите заголовок новости" 
          className={errors.title ? "border-red-500" : ""}
        />
        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Текст новости</label>
        <textarea
          {...register("text", { required: "Текст новости обязателен" })}
          className={`min-h-[${isMobile ? '150' : '200'}px] w-full rounded-md border ${errors.text ? "border-red-500" : "border-input"} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
          placeholder="Введите текст новости..."
        />
        {errors.text && <p className="text-sm text-red-500">{errors.text.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Изображения (максимум 4, только JPEG/PNG)</label>
        <Input 
          type="file" 
          accept="image/jpeg,image/jpg,image/png" 
          multiple 
          max={4} 
          onChange={handleImageUpload} 
          className={`file-input ${isMobile ? 'text-xs' : ''}`} 
        />
        <p className={`text-xs text-muted-foreground ${isMobile ? 'mt-1' : ''}`}>
          Добавьте до 4 изображений для иллюстрации новости
        </p>
      </div>

      <ImagePreview previewUrls={previewUrls} onRemove={removeImage} />

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Публикация...
          </>
        ) : (
          "Опубликовать новость"
        )}
      </Button>
    </form>
  );
};

export default NewsForm;
