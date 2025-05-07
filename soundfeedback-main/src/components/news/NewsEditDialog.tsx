import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImagePreview from "./ImagePreview";
import { News } from "@/types/newsTypes";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SERVER_URL } from "@/lib/utils";

interface Image {
  url: string;
  isNew: boolean; // true для blob-изображений, false для серверных
  file?: File; // Для новых изображений
}

interface NewsEditDialogProps {
  news: News | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string, text: string, newFiles: File[], deletedImages: string[]) => void;
}

const NewsEditDialog: React.FC<NewsEditDialogProps> = ({ news, open, onOpenChange, onSave }) => {
  const { toast } = useToast();
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [images, setImages] = useState<Image[]>([]); // Новый массив для хранения изображений
  const [deletedImages, setDeletedImages] = useState<string[]>([]);

  // Инициализируем состояние при открытии диалога
  useEffect(() => {
    if (open && news) {
      setEditTitle(news.title);
      setEditText(news.text);
      // Инициализируем серверные изображения
      setImages(
        news.imageUrls.map((url) => {
          // Проверяем, если URL уже содержит полный путь
          let fullUrl = url;
          if (!url.startsWith("http")) {
            fullUrl = `${SERVER_URL}${url}`;
          }
          return {
            url: fullUrl,
            isNew: false,
          };
        })
      );
      setDeletedImages([]);
    }
  }, [open, news]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
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

      if (images.length + files.length > 4) {
        toast({
          title: "Ошибка",
          description: "Можно загрузить максимум 4 изображения",
          variant: "destructive",
        });
        return;
      }

      const newImages = Array.from(files).map((file) => ({
        url: URL.createObjectURL(file),
        isNew: true,
        file,
      }));
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.url === url);
      if (!imageToRemove) return prev;

      if (imageToRemove.isNew && imageToRemove.url.startsWith("blob:")) {
        // Освобождаем память для blob-изображений
        URL.revokeObjectURL(imageToRemove.url);
      } else {
        // Для серверных изображений добавляем в deletedImages
        const originalUrl = imageToRemove.url.replace(SERVER_URL, "");
        setDeletedImages((prev) => [...prev, originalUrl]);
      }

      return prev.filter((img) => img.url !== url);
    });
  };

  const handleSave = () => {
    if (!editTitle || !editText) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive",
      });
      return;
    }

    // Собираем новые файлы для отправки
    const newFiles = images.filter((img) => img.isNew).map((img) => img.file!);

    onSave(editTitle, editText, newFiles, deletedImages);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать новость</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Заголовок
            </label>
            <Input id="title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="text" className="text-sm font-medium">
              Текст
            </label>
            <textarea
              id="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Изображения (максимум 4, только JPEG/PNG)</label>
            <Input type="file" accept="image/jpeg,image/jpg,image/png" multiple max={4} onChange={handleImageUpload} className="file-input" />
          </div>
          <ImagePreview previewUrls={images.map((img) => img.url)} onRemove={removeImage} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewsEditDialog;
