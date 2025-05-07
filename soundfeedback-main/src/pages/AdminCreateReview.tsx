import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RatingSelect from "@/components/review/RatingSelect";
import ReviewText from "@/components/review/ReviewText";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { SERVER_URL } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { saveAlbum, saveReview } from "@/services/reviewService";
import { EnumStatus } from "@/enums/status";
import { EnumRatingType } from "@/enums/rating";
import { AlbumData, ReviewData } from "@/types/reviewTypes";

const AdminCreateReview = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [yandexPreviewUrl, setYandexPreviewUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [yandexUrl, setYandexUrl] = useState("");
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [rating, setRating] = useState<EnumRatingType>(null);
  const [reviewText, setReviewText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCoverSource, setSelectedCoverSource] = useState<"yandex" | "custom">("yandex");

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCoverFile(file);
      setSelectedCoverSource("custom");
    }
  };

  const handleYandexUrlSubmit = async () => {
    if (!yandexUrl.trim()) {
      setFetchError("Введите корректную ссылку на Яндекс.Музыку");
      return;
    }

    // Улучшенная валидация ссылки на Яндекс Музыку
    const yandexMusicRegex = /https?:\/\/(.*\.)?music\.yandex\.(ru|com)\/(album|track)\/\d+/i;
    if (!yandexMusicRegex.test(yandexUrl)) {
      setFetchError("Пожалуйста, введите корректную ссылку на альбом или трек в Яндекс.Музыке");
      return;
    }

    const albumIdMatch = yandexUrl.match(/album\/(\d+)/);
    if (!albumIdMatch) {
      setFetchError("Неверный формат ссылки на Яндекс.Музыку");
      return;
    }
    const albumId = albumIdMatch[1];

    setFetchError(null);
    setIsLoading(true);

    try {
      const apiUrl = `https://music.yandex.ru/handlers/album.jsx?album=${albumId}&lang=ru&external-domain=music.yandex.ru`;
      const proxyResponse = await fetch(`${SERVER_URL}/proxy?url=${encodeURIComponent(apiUrl)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!proxyResponse.ok) {
        throw new Error(`Ошибка запроса к прокси: ${proxyResponse.status}`);
      }

      const data = await proxyResponse.json();
      const artist = data.artists?.[0]?.name || "Unknown Artist";
      const title = data.title || "Unknown Title";
      const type = data.type || "album";
      const coverUrl = data.coverUri ? `https://${data.coverUri.replace("%%", "300x300")}` : "/placeholder.svg";

      setArtist(artist);
      setTitle(title);
      setType(type);
      setYandexPreviewUrl(coverUrl);
      setSelectedCoverSource("yandex");

      toast({
        title: "Успех",
        description: "Данные о треке успешно загружены",
      });
    } catch (error) {
      console.error("Ошибка получения данных:", error);
      setFetchError("Не удалось загрузить данные с Яндекс.Музыки");
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить данные: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearErrors = () => {
    setFetchError(null);
    setSubmitError(null);
  };

  const validateForm = () => {
    clearErrors();

    if (!artist.trim()) {
      setSubmitError("Укажите исполнителя");
      return false;
    }
    if (!title.trim()) {
      setSubmitError("Укажите название релиза");
      return false;
    }
    if (!type) {
      setSubmitError("Выберите тип релиза");
      return false;
    }
    if (!rating) {
      setSubmitError("Выберите рейтинг");
      return false;
    }
    if (!reviewText.trim()) {
      setSubmitError("Напишите текст рецензии");
      return false;
    }
    if (!yandexPreviewUrl && !previewUrl) {
      setSubmitError("Загрузите обложку альбома или используйте обложку из Яндекс.Музыки");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Ошибка",
        description: submitError,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Ошибка",
        description: "Пользователь не авторизован",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Загружаем обложку на сервер, если пользователь выбрал свою
      let customCoverUrl = "";
      if (selectedCoverSource === "custom" && coverFile) {
        const formData = new FormData();
        formData.append("cover", coverFile);
        const response = await fetch(`${SERVER_URL}/upload-cover`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Ошибка загрузки обложки");
        }
        customCoverUrl = data.coverUrl;
      }

      // 2. Генерируем albumId (если нет ссылки на Яндекс.Музыку, создаём свой ID)
      let albumId = "custom-" + Date.now().toString();
      if (yandexUrl) {
        const albumIdMatch = yandexUrl.match(/album\/(\d+)/);
        if (albumIdMatch) {
          albumId = albumIdMatch[1];
        }
      }

      // 3. Сохраняем альбом в Firestore (используем обложку из Яндекс.Музыки или placeholder)
      const albumData: AlbumData = {
        albumId,
        artist,
        title,
        type,
        coverUrl: yandexPreviewUrl || "/placeholder.svg", // Используем обложку из Яндекс.Музыки или placeholder
        createdAt: new Date().toISOString(),
      };
      await saveAlbum(albumData);

      // 4. Сохраняем рецензию в Firestore (сразу со статусом APPROVED, добавляем customCoverUrl)
      const reviewData: ReviewData = {
        albumId,
        userId: user.uid,
        rating: rating,
        reviewText,
        status: EnumStatus.APPROVED, // Админская рецензия сразу публикуется
        createdAt: new Date().toISOString(),
        customCoverUrl, // Сохраняем путь к загруженной обложке в рецензии
      };
      await saveReview(reviewData);

      toast({
        title: "Успех",
        description: "Рецензия успешно опубликована",
      });

      // Сбрасываем форму
      setYandexUrl("");
      setArtist("");
      setTitle("");
      setType("");
      setRating(null);
      setReviewText("");
      setPreviewUrl(null);
      setYandexPreviewUrl(null);
      setCoverFile(null);
      setSelectedCoverSource("yandex");
    } catch (error) {
      console.error("Ошибка сохранения рецензии:", error);
      setSubmitError("Не удалось сохранить рецензию");
      toast({
        title: "Ошибка",
        description: `Не удалось сохранить рецензию: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Создать рецензию (Администратор)</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="yandexUrl">Ссылка на Яндекс.Музыку (опционально)</Label>
          <div className="flex gap-2">
            <Input
              id="yandexUrl"
              value={yandexUrl}
              onChange={(e) => {
                setYandexUrl(e.target.value);
                clearErrors();
              }}
              placeholder="Введите ссылку на трек в Яндекс.Музыке"
            />
            <Button type="button" onClick={handleYandexUrlSubmit} disabled={isLoading}>
              {isLoading ? "Загрузка..." : "Загрузить"}
            </Button>
          </div>
          {fetchError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <Label htmlFor="coverImage">Обложка</Label>
          <Input id="coverImage" type="file" accept="image/*" onChange={handleImageUpload} className="mt-1" />

          {(previewUrl || yandexPreviewUrl) && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-4">
                {yandexPreviewUrl && (
                  <div className="space-y-2">
                    <Label>
                      <input type="radio" name="coverSource" checked={selectedCoverSource === "yandex"} onChange={() => setSelectedCoverSource("yandex")} className="mr-2" />
                      Обложка из Яндекс.Музыки
                    </Label>
                    <img src={yandexPreviewUrl} alt="Обложка из Яндекс.Музыки" className="w-48 h-48 object-cover rounded-md" />
                  </div>
                )}
                {previewUrl && (
                  <div className="space-y-2">
                    <Label>
                      <input type="radio" name="coverSource" checked={selectedCoverSource === "custom"} onChange={() => setSelectedCoverSource("custom")} className="mr-2" />
                      Загруженная обложка
                    </Label>
                    <img src={previewUrl} alt="Загруженная обложка" className="w-48 h-48 object-cover rounded-md" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="artist">Исполнитель</Label>
          <Input
            id="artist"
            value={artist}
            onChange={(e) => {
              setArtist(e.target.value);
              clearErrors();
            }}
            placeholder="Имя исполнителя"
          />
        </div>

        <div>
          <Label htmlFor="title">Название релиза</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearErrors();
            }}
            placeholder="Название релиза"
          />
        </div>

        <div>
          <Label htmlFor="type">Тип релиза</Label>
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value);
              clearErrors();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите тип релиза" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="album">Альбом</SelectItem>
              <SelectItem value="single">Сингл</SelectItem>
              <SelectItem value="ep">EP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <RatingSelect
          value={rating}
          onChange={(value) => {
            setRating(value);
            clearErrors();
          }}
        />
        <ReviewText
          value={reviewText}
          onChange={(value) => {
            setReviewText(value);
            clearErrors();
          }}
        />

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className={`w-full`} disabled={isLoading}>
          {isLoading ? "Публикация..." : "Опубликовать рецензию"}
        </Button>
      </form>
    </div>
  );
};

export default AdminCreateReview;
