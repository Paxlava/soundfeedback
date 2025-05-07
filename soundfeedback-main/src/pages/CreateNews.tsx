import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import NewsForm from "@/components/news/NewsForm";
import { createNews, uploadNewsImages } from "@/services/newsService";
import { NewsFormData, News } from "@/types/newsTypes";
import { EnumRole } from "@/enums/role";
import { useIsMobile } from "@/hooks/use-mobile";

const CreateNews = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const isMobile = useIsMobile();

  const onSubmit = async (data: NewsFormData) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Для создания новости необходимо авторизоваться",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!user.role || user.role !== EnumRole.ADMIN) {
      toast({
        title: "Ошибка",
        description: "Только администраторы могут создавать новости",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Загружаем изображения на сервер
      let imageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        imageUrls = await uploadNewsImages(selectedFiles);
      }

      // 2. Формируем данные новости
      const newsData: Omit<News, "id" | "createdAt"> = {
        title: data.title,
        text: data.text,
        imageUrls,
        authorId: user.uid,
      };

      // 3. Сохраняем новость в Firestore
      await createNews(newsData);

      toast({
        title: "Успех",
        description: "Новость успешно опубликована",
      });

      navigate("/news");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось опубликовать новость", // Отображаем конкретное сообщение об ошибке
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={isMobile ? "px-2 py-4" : "max-w-4xl mx-auto py-6"}>
      <h1 className={`font-bold mb-6 ${isMobile ? 'text-xl text-center' : 'text-2xl'}`}>
        Создание новости
      </h1>
      <NewsForm 
        onSubmit={onSubmit} 
        isLoading={isLoading} 
        previewUrls={previewUrls} 
        setPreviewUrls={setPreviewUrls} 
        selectedFiles={selectedFiles} 
        setSelectedFiles={setSelectedFiles} 
      />
    </div>
  );
};

export default CreateNews;
