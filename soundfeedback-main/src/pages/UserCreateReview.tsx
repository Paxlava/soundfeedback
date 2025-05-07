import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import RatingSelect from "@/components/review/RatingSelect";
import ReviewText from "@/components/review/ReviewText";
import { messages } from "@/lib/translations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { SERVER_URL } from "@/lib/utils";
import { EnumRatingType } from "@/enums/rating";
import { saveAlbum, getAlbum, saveReview } from "@/services/reviewService";
import { useAuth } from "@/hooks/useAuth";
import { EnumStatus } from "@/enums/status";
import { ReviewData } from "@/types/reviewTypes";

interface ReleaseData {
  albumId: string;
  artist: string;
  title: string;
  type: string;
  coverUrl: string;
}

const UserCreateReview = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [releaseData, setReleaseData] = useState<ReleaseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [yandexMusicUrl, setYandexMusicUrl] = useState("");
  const [rating, setRating] = useState<EnumRatingType>(null);
  const [reviewText, setReviewText] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchReleaseData = async (url: string) => {
    if (!url.trim()) {
      setFetchError(messages.notifications.error.invalidUrl);
      return;
    }

    // Улучшенная валидация ссылки на Яндекс Музыку
    const yandexMusicRegex = /https?:\/\/(.*\.)?music\.yandex\.(ru|com)\/(album|track)\/\d+/i;
    if (!yandexMusicRegex.test(url)) {
      setFetchError("Пожалуйста, введите корректную ссылку на альбом или трек в Яндекс.Музыке");
      return;
    }

    const albumIdMatch = url.match(/album\/(\d+)/);
    if (!albumIdMatch) {
      setFetchError(messages.notifications.error.invalidUrl);
      return;
    }
    const albumId = albumIdMatch[1];

    setFetchError(null);
    setIsLoading(true);

    try {
      let albumData = await getAlbum(albumId);

      if (albumData) {
        console.log(`Альбом ${albumId} найден в Firestore`);
        setReleaseData({
          albumId: albumData.albumId,
          artist: albumData.artist,
          title: albumData.title,
          type: albumData.type,
          coverUrl: albumData.coverUrl,
        });
      } else {
        console.log(`Альбом ${albumId} не найден в Firestore, запрашиваем данные у Яндекс.Музыки`);
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
        const type = data.type || "Album";
        const coverUrl = data.coverUri ? `https://${data.coverUri.replace("%%", "300x300")}` : "/placeholder.svg";

        albumData = {
          albumId,
          artist,
          title,
          type,
          coverUrl,
          createdAt: new Date().toISOString(),
        };

        await saveAlbum(albumData);
        setReleaseData(albumData);
      }

      toast({
        title: "Успешно",
        description: messages.notifications.success.dataFetched,
      });
    } catch (error) {
      console.error("Ошибка получения данных:", error);
      setFetchError(messages.notifications.error.fetchFailed);
      toast({
        title: "Ошибка",
        description: `${messages.notifications.error.fetchFailed}: ${error.message}`,
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

    if (!releaseData) {
      setSubmitError(messages.notifications.error.noReleaseData);
      return false;
    }
    if (!rating) {
      setSubmitError(messages.notifications.error.noRating);
      return false;
    }
    if (!reviewText.trim()) {
      setSubmitError(messages.notifications.error.noReviewText);
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

    setIsLoading(true);
    const userId = user.uid;

    try {
      const reviewData: ReviewData = {
        albumId: releaseData!.albumId,
        userId,
        rating,
        reviewText,
        status: EnumStatus.PENDING,
        createdAt: new Date().toISOString(),
        customCoverUrl: "",
      };
      await saveReview(reviewData);

      toast({
        title: "Успешно",
        description: "Рецензия отправлена на модерацию",
      });

      setReleaseData(null);
      setYandexMusicUrl("");
      setRating(null);
      setReviewText("");
    } catch (error) {
      console.error("Ошибка сохранения рецензии:", error);
      setSubmitError(messages.notifications.error.reviewSubmitFailed);
      toast({
        title: "Ошибка",
        description: messages.notifications.error.reviewSubmitFailed,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">{messages.review.create.title}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="yandexMusicUrl">{messages.review.create.yandexMusicUrl}</Label>
          <div className="flex gap-2">
            <Input
              id="yandexMusicUrl"
              placeholder={messages.review.create.urlPlaceholder}
              value={yandexMusicUrl}
              onChange={(e) => {
                setYandexMusicUrl(e.target.value);
                clearErrors();
              }}
            />
            <Button type="button" onClick={() => fetchReleaseData(yandexMusicUrl)} disabled={isLoading}>
              {isLoading ? messages.review.create.loadingStatus : messages.review.create.fetchButton}
            </Button>
          </div>

          {fetchError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
        </div>

        {releaseData && (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{messages.review.create.cover}</Label>
                <img src={releaseData.coverUrl} alt="Album cover" className="w-full aspect-square object-cover rounded-md" />
              </div>
              <div className="space-y-4">
                <div>
                  <Label>{messages.review.create.artist}</Label>
                  <p className="text-lg font-medium">{releaseData.artist}</p>
                </div>
                <div>
                  <Label>{messages.review.create.releaseTitle}</Label>
                  <p className="text-lg font-medium">{releaseData.title}</p>
                </div>
                <div>
                  <Label>{messages.review.create.releaseType}</Label>
                  <p className="text-lg font-medium">{releaseData.type}</p>
                </div>
              </div>
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? messages.review.create.sendingStatus : messages.review.create.submitButton}
            </Button>
          </>
        )}

        {!releaseData && !fetchError && (
          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>Введите ссылку на Яндекс.Музыку и нажмите кнопку "{messages.review.create.fetchButton}" для загрузки данных релиза.</AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
};

export default UserCreateReview;
