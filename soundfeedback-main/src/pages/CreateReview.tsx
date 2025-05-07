import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getRatingColor } from "@/lib/utils";
import "../styles/create-review.css";
import { EnumRating, EnumRatingType } from "@/enums/rating";

interface ReviewFormData {
  yandexMusicUrl?: string;
  coverImage?: FileList;
  artist?: string;
  title?: string;
  type?: string;
  rating: EnumRatingType;
  reviewText: string;
}

interface ReleaseData {
  artist: string;
  title: string;
  type: string;
  coverUrl: string;
}

const CreateReview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [releaseData, setReleaseData] = useState<ReleaseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isAdmin = true;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReviewFormData>({
    defaultValues: {
      rating: undefined,
      reviewText: "",
    },
  });
  const currentRating = watch("rating");

  const fetchReleaseData = async (url: string) => {
    if (!url.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите корректную ссылку на Яндекс.Музыку",
        variant: "destructive",
      });
      return;
    }

    // Валидация ссылки на Яндекс Музыку
    const yandexMusicRegex = /https?:\/\/(.*\.)?music\.yandex\.(ru|com)\/(album|track)\/\d+/i;
    if (!yandexMusicRegex.test(url)) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите корректную ссылку на альбом или трек в Яндекс.Музыке",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Это имитация API-запроса. В реальном приложении здесь будет запрос к бэкенду
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setReleaseData({
        artist: "Тестовый исполнитель",
        title: "Тестовый альбом",
        type: "Альбом",
        coverUrl: "/placeholder.svg",
      });

      toast({
        title: "Успех",
        description: "Данные релиза успешно загружены",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные релиза. Проверьте URL.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!isAdmin && !releaseData) {
      toast({
        title: "Ошибка",
        description: "Сначала загрузите данные релиза",
        variant: "destructive",
      });
      return;
    }

    // Проверка обязательных полей для админа
    if (isAdmin) {
      if (!previewUrl) {
        toast({
          title: "Ошибка",
          description: "Загрузите обложку релиза",
          variant: "destructive",
        });
        return;
      }
      if (!data.artist || !data.title || !data.type) {
        toast({
          title: "Ошибка",
          description: "Заполните все поля релиза",
          variant: "destructive",
        });
        return;
      }
    }

    // Проверка обязательных полей для всех
    if (!data.rating) {
      toast({
        title: "Ошибка",
        description: "Выберите оценку",
        variant: "destructive",
      });
      return;
    }

    if (!data.reviewText) {
      toast({
        title: "Ошибка",
        description: "Напишите текст рецензии",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Отправка рецензии:", {
        ...data,
        coverUrl: isAdmin ? previewUrl : releaseData?.coverUrl,
      });

      // Имитация API-запроса
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Успех",
        description: "Рецензия успешно создана и отправлена на модерацию",
      });

      // Переход на страницу рецензии
      const mockReviewId = Math.floor(Math.random() * 1000) + 1;
      navigate(`/review/${mockReviewId}`);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать рецензию",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-review-container">
      <h1 className="create-review-title">Создание рецензии</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="create-review-form">
        {isAdmin ? (
          <div className="form-group">
            <label className="form-label">Обложка релиза</label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} className="file-input" required />
            {previewUrl && <img src={previewUrl} alt="Предпросмотр обложки" className="cover-preview" />}
            <div className="form-group">
              <label className="form-label">Исполнитель</label>
              <Input {...register("artist", { required: true })} placeholder="Введите имя исполнителя" required />
            </div>
            <div className="form-group">
              <label className="form-label">Название релиза</label>
              <Input {...register("title", { required: true })} placeholder="Введите название релиза" required />
            </div>
            <div className="form-group">
              <label className="form-label">Тип релиза</label>
              <Input {...register("type", { required: true })} placeholder="Альбом/Сингл/EP" required />
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Ссылка на Яндекс.Музыку</label>
            <div className="yandex-url-container">
              <Input placeholder="https://music.yandex.ru/album/..." {...register("yandexMusicUrl", { required: !isAdmin })} required />
              <Button type="button" onClick={() => fetchReleaseData(watch("yandexMusicUrl") || "")} disabled={isLoading}>
                {isLoading ? "Загрузка..." : "Загрузить данные"}
              </Button>
            </div>
          </div>
        )}

        {(releaseData || isAdmin) && (
          <>
            {!isAdmin && (
              <div className="preview-container">
                <div>
                  <label className="form-label">Обложка</label>
                  <img src={releaseData?.coverUrl} alt="Обложка релиза" className="cover-preview" />
                </div>
                <div className="release-info">
                  <div className="release-info-item">
                    <label className="form-label">Исполнитель</label>
                    <p>{releaseData?.artist}</p>
                  </div>
                  <div className="release-info-item">
                    <label className="form-label">Название</label>
                    <p>{releaseData?.title}</p>
                  </div>
                  <div className="release-info-item">
                    <label className="form-label">Тип релиза</label>
                    <p>{releaseData?.type}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Оценка</label>
              <RadioGroup className="rating-group" {...register("rating", { required: true })}>
                <div className="rating-option rating-placeholder">
                  <label>Выберите оценку</label>
                </div>
                {Object.entries(EnumRating).map(([key, value]) => (
                  <div className="rating-option" key={key}>
                    <RadioGroupItem value={key} id={key} />
                    <label htmlFor={key} className={getRatingColor(key as keyof typeof EnumRating)}>
                      {value}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="form-group">
              <label className="form-label">Текст рецензии</label>
              <textarea className="review-textarea" placeholder="Напишите вашу рецензию здесь..." {...register("reviewText", { required: true })} required />
            </div>

            <Button 
              type="submit" 
              className={`submit-button ${currentRating ? getRatingColor(currentRating as keyof typeof EnumRating) : ""}`} 
              disabled={isLoading}
            >
              {isLoading ? "Отправка..." : "Отправить рецензию"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
};

export default CreateReview;
