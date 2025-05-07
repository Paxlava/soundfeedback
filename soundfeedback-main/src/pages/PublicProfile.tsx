import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, User, Bookmark, ChevronLeft, ChevronRight, MoreHorizontal, Skull, UserPlus, UserX, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ReviewsList from "@/components/profile/ReviewsList";
import { getUserReviewsPaginated } from "@/services/reviewService";
import { EnumStatus } from "@/enums/status";
import { getUserByUsername, getUserStats, initializeUserStats, initializeSubscriberStats, subscribeToUser, unsubscribeFromUser, checkSubscription, updateSubscriptionCounters, fetchUserData } from "@/services/userService";
import { Review } from "@/types/reviewTypes";
import { UserData } from "@/types/userTypes";
import Loader from "@/components/Loader";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, UniversalPagination } from "@/components/ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

const MOBILE_ITEMS_PER_PAGE = 3;
const DESKTOP_ITEMS_PER_PAGE = 6;

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth(); // Получаем текущего авторизованного пользователя
  const [userProfile, setUserProfile] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ writtenReviews: number; readReviews: number; subscribersCount: number; subscriptionsCount: number } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const isMobile = useIsMobile();

  // Определяем количество элементов на странице в зависимости от устройства
  const itemsPerPage = isMobile ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE;

  // Состояния для рецензий
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedPage, setApprovedPage] = useState(1);
  const approvedTotalPages = Math.ceil(approvedTotal / itemsPerPage);

  // Проверка, является ли просматриваемый профиль профилем текущего пользователя
  useEffect(() => {
    // Если пользователь авторизован и смотрит свой профиль, перенаправляем его на обычный профиль
    if (user && username) {
      // В Firebase Auth имя пользователя хранится как displayName,
      // но в URL и в базе данных оно хранится как username
      // Поэтому сравниваем имя пользователя из URL с displayName текущего пользователя
      if (user.displayName && user.displayName.toLowerCase() === username.toLowerCase()) {
        navigate("/profile");
      }
    }
  }, [user, username, navigate]);

  // Проверка, подписан ли текущий пользователь на просматриваемого пользователя
  useEffect(() => {
    const checkUserSubscription = async () => {
      if (user && userProfile) {
        try {
          const isUserSubscribed = await checkSubscription(user.uid, userProfile.uid);
          setIsSubscribed(isUserSubscribed);
        } catch (error) {
          console.error("Ошибка при проверке подписки:", error);
        }
      }
    };

    checkUserSubscription();
  }, [user, userProfile]);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!username) {
        setError("Имя пользователя не указано");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setIsLoadingStats(true);
        setIsLoadingReviews(true);
        setIsPaginationLoading(true);
        setError(null);

        const userData = await getUserByUsername(username);
        if (!userData) {
          setError("Пользователь не найден");
          setIsLoading(false);
          return;
        }

        // Выводим полные данные для отладки
        console.log("Полные данные пользователя:", userData);

        setUserProfile(userData);

        // Инициализируем счетчики подписчиков, если их нет
        await initializeSubscriberStats(userData.uid);

        // Обновляем счетчики подписок на основе актуальных данных
        await updateSubscriptionCounters(userData.uid);

        // Загружаем только одобренные рецензии для публичного профиля
        const approvedData = await getUserReviewsPaginated(userData.uid, EnumStatus.APPROVED, approvedPage, itemsPerPage);
        setApprovedReviews(approvedData.reviews);
        setApprovedTotal(approvedData.total);

        await initializeUserStats(userData.uid);
        const userStats = await getUserStats(userData.uid);
        const userInfo = await fetchUserData(userData.uid);

        setStats({
          writtenReviews: approvedData.total,
          readReviews: userStats.readReviews,
          subscribersCount: userInfo?.subscribersCount ?? 0,
          subscriptionsCount: userInfo?.subscriptionsCount ?? 0,
        });
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить профиль");
        toast({
          title: "Ошибка",
          description: err.message || "Не удалось загрузить профиль",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsLoadingStats(false);
        setIsLoadingReviews(false);
        setIsPaginationLoading(false);
      }
    };

    loadProfileData();
  }, [username, toast, approvedPage, itemsPerPage]);

  // Обработчик подписки/отписки
  const handleSubscription = async () => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!userProfile) return;

    try {
      setIsSubscribing(true);

      if (isSubscribed) {
        await unsubscribeFromUser(user.uid, userProfile.uid);
        setIsSubscribed(false);
        toast({
          title: "Успешно",
          description: `Вы отписались от пользователя ${userProfile.username}`,
        });
      } else {
        await subscribeToUser(user.uid, userProfile.uid);
        setIsSubscribed(true);
        toast({
          title: "Успешно",
          description: `Вы подписались на пользователя ${userProfile.username}`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Ошибка",
        description: err.message || "Не удалось выполнить действие",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (error || !userProfile) {
    return <div className="text-center py-8 text-red-500">{error || "Пользователь не найден"}</div>;
  }

  // Если пользователь заблокирован, показываем специальный UI
  if (userProfile.isBanned) {
    return (
      <div className={isMobile ? "px-2" : "container mx-auto"}>
        <Card className={isMobile ? "shadow-none border-0" : ""}>
          <CardHeader className={`flex flex-row items-center justify-between ${isMobile ? "px-3 py-3" : ""}`}>
            <CardTitle className="flex items-center gap-2">
              <User className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
              <span className={isMobile ? "text-lg" : ""}>Профиль пользователя</span>
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "px-3 pt-0 pb-3" : ""}>
            {/* Отображаем заголовок профиля с информацией о блокировке */}
            <ProfileHeader username={userProfile?.username || "Noname"} role={userProfile.role} avatarUrl={userProfile.avatarUrl || null} isPublic={true} className="" avatarClassName={isMobile ? "h-20 w-20" : ""} userInfoClassName={isMobile ? "text-center" : "text-center"} isBanned={true} />

            {/* Сообщение о блокировке */}
            <div className="mt-6 border border-red-200 bg-red-50 rounded-lg p-4 flex flex-col items-center text-center space-y-3">
              <Skull className="h-10 w-10 text-red-600" />
              <h3 className="text-xl font-medium text-red-600">Аккаунт заблокирован</h3>
              <p className="text-muted-foreground">Этот пользователь был заблокирован администрацией сайта. Контент пользователя недоступен.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderProfileHeader = () => {
    return (
      <div className="flex flex-col items-center">
        <ProfileHeader
          username={userProfile?.username || "Noname"}
          role={userProfile.role}
          avatarUrl={userProfile.avatarUrl || null}
          isPublic={true}
          className=""
          avatarClassName={isMobile ? "h-20 w-20" : ""}
          userInfoClassName={isMobile ? "text-center" : "text-center"}
          isBanned={userProfile.isBanned || false}
        />
      </div>
    );
  };

  const renderSubscriptionButton = () => {
    if (!user || user.uid === userProfile.uid) return null;

    return (
      <div className="flex justify-center my-6">
        <Button onClick={handleSubscription} disabled={isSubscribing} variant={isSubscribed ? "destructive" : "default"} className="w-full max-w-xs">
          {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isSubscribed ? <UserX className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
          {isSubscribed ? "Отписаться" : "Подписаться"}
        </Button>
      </div>
    );
  };

  const renderProfileStats = () => {
    if (isLoadingStats) {
      return <div className="text-center py-4">Загрузка статистики...</div>;
    }
    return <ProfileStats stats={stats} userId={userProfile?.uid} className={isMobile ? "grid-cols-2 gap-2" : ""} itemClassName={isMobile ? "text-sm py-2" : ""} />;
  };

  return (
    <div className={isMobile ? "px-2" : "container mx-auto"}>
      <Card className={isMobile ? "shadow-none border-0" : ""}>
        <CardHeader className={`flex flex-row items-center justify-between ${isMobile ? "px-3 py-3" : ""}`}>
          <CardTitle className="flex items-center gap-2">
            <User className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
            <span className={isMobile ? "text-lg" : ""}>Профиль пользователя</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? "px-3 pt-0 pb-3" : ""}>
          {renderProfileHeader()}
          {renderProfileStats()}
          {renderSubscriptionButton()}

          <div className={`mt-${isMobile ? "4" : "6"} space-y-${isMobile ? "2" : "4"}`}>
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5" />
              <h3 className={isMobile ? "text-lg" : "text-xl font-medium"}>Рецензии пользователя</h3>
            </div>
            {isLoadingReviews ? (
              <div className="text-center py-4">Загрузка рецензий...</div>
            ) : approvedReviews.length > 0 ? (
              <>
                <ReviewsList reviews={approvedReviews} />
                {approvedTotalPages > 1 && <UniversalPagination currentPage={approvedPage} totalPages={approvedTotalPages} onPageChange={setApprovedPage} isPaginationLoading={isPaginationLoading} />}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">У пользователя нет опубликованных рецензий</div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="pb-8"></div>
    </div>
  );
};

export default PublicProfile;
