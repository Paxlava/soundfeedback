import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Settings, Bell, Star, ChevronLeft, ChevronRight, MoreHorizontal, User, UserCog, Lock, Users, FileCheck, Clock, X, LogOut, Trash2, Award, Pencil, Bookmark, PenTool, Skull, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import NotificationsList from "@/components/notifications/NotificationsList";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ReviewsList from "@/components/profile/ReviewsList";
import ProfileStats from "@/components/profile/ProfileStats";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getUserReviewsPaginated } from "@/services/reviewService";
import { EnumStatus } from "@/enums/status";
import { EnumRole } from "@/enums/role";
import { messages } from "@/lib/translations";
import { Review } from "@/types/reviewTypes";
import { getUserStats, initializeUserStats, promoteFeodorToAdmin, initializeSubscriberStats, fetchUserData, updateSubscriptionCounters } from "@/services/userService";
import { cn, logger } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, UniversalPagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

const MOBILE_ITEMS_PER_PAGE = 3;
const DESKTOP_ITEMS_PER_PAGE = 6;

// Компонент для отображения многоточия
const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);

const Profile = () => {
  const { user, loading, refreshUserData, logout, deleteAccount } = useAuth();
  const [stats, setStats] = useState<{ writtenReviews: number; readReviews: number; subscribersCount: number; subscriptionsCount: number } | null>(null);
  const { updateAvatar, deleteAvatar, loading: avatarLoading } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useIsMobile();

  // Определяем количество элементов на странице в зависимости от устройства
  const itemsPerPage = isMobile ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE;

  // Состояния для рецензий разных статусов
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [rejectedReviews, setRejectedReviews] = useState<Review[]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [rejectedTotal, setRejectedTotal] = useState(0);

  const [approvedPage, setApprovedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);

  // Состояния для отслеживания загрузки пагинации
  const [isPaginationLoading, setIsPaginationLoading] = useState({
    approved: false,
    pending: false,
    rejected: false,
  });

  const isAdmin = user?.role === EnumRole.ADMIN;

  useEffect(() => {
    // Назначить Федосера администратором только при первой загрузке компонента
    const setFeodorAdmin = async () => {
      try {
        await promoteFeodorToAdmin();
        logger.log("Права администратора для Федосера восстановлены");
      } catch (error) {
        logger.error("Ошибка при восстановлении прав администратора:", error);
      }
    };

    // Вызываем только один раз при монтировании компонента
    setFeodorAdmin();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей гарантирует выполнение только при монтировании

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setError("Пожалуйста, войдите в систему");
        setIsLoadingReviews(false);
        setIsLoadingStats(false);
        return;
      }

      try {
        setIsLoadingReviews(true);
        setIsLoadingStats(true);
        setError(null);

        // Устанавливаем загрузку для соответствующих разделов
        setIsPaginationLoading({
          approved: true,
          pending: true,
          rejected: true,
        });

        // Инициализируем счетчики подписчиков, если их нет
        await initializeSubscriberStats(user.uid);

        // Обновляем счетчики подписок на основе актуальных данных в базе
        await updateSubscriptionCounters(user.uid);

        // Загружаем рецензии для каждого статуса
        const [approvedData, pendingData, rejectedData] = await Promise.all([
          getUserReviewsPaginated(user.uid, EnumStatus.APPROVED, approvedPage, itemsPerPage),
          getUserReviewsPaginated(user.uid, EnumStatus.PENDING, pendingPage, itemsPerPage),
          getUserReviewsPaginated(user.uid, EnumStatus.REJECTED, rejectedPage, itemsPerPage),
        ]);

        setApprovedReviews(approvedData.reviews);
        setPendingReviews(pendingData.reviews);
        setRejectedReviews(rejectedData.reviews);
        setApprovedTotal(approvedData.total);
        setPendingTotal(pendingData.total);
        setRejectedTotal(rejectedData.total);

        // Загружаем статистику
        await initializeUserStats(user.uid);
        const userStats = await getUserStats(user.uid);

        // Получаем полные данные пользователя из Firestore
        const userData = await fetchUserData(user.uid);

        setStats({
          writtenReviews: approvedData.total + pendingData.total,
          readReviews: userStats.readReviews,
          subscribersCount: userData?.subscribersCount ?? 0,
          subscriptionsCount: userData?.subscriptionsCount ?? 0,
        });

        setIsLoadingReviews(false);
        setIsLoadingStats(false);

        // Сбрасываем состояния загрузки пагинации
        setIsPaginationLoading({
          approved: false,
          pending: false,
          rejected: false,
        });
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить данные");
        toast({
          title: "Ошибка",
          description: err.message || "Не удалось загрузить данные",
          variant: "destructive",
        });
        setIsLoadingReviews(false);
        setIsLoadingStats(false);

        // Сбрасываем состояния загрузки пагинации при ошибке
        setIsPaginationLoading({
          approved: false,
          pending: false,
          rejected: false,
        });
      }
    };

    loadUserData();
  }, [user, toast, approvedPage, pendingPage, rejectedPage, itemsPerPage]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: messages.notifications.error.fileTooLarge,
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Ошибка",
          description: messages.notifications.error.fileTypeNotSupported,
          variant: "destructive",
        });
        return;
      }

      try {
        await updateAvatar(file);
        await refreshUserData();
        toast({
          title: "Успех",
          description: messages.notifications.success.avatarUpdated,
        });
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: error.message || messages.notifications.error.avatarUploadFailed,
          variant: "destructive",
        });
      }
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await deleteAvatar();
      await refreshUserData();
      toast({
        title: "Успех",
        description: messages.notifications.success.avatarDeleted,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || messages.notifications.error.avatarDeleteFailed,
        variant: "destructive",
      });
    }
  };

  const handleSettingsClick = () => {
    setShowSettingsDialog(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Успешно",
        description: "Вы вышли из системы",
      });
      setShowLogoutDialog(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось выйти из системы",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "УДАЛИТЬ") {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите УДАЛИТЬ для подтверждения",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccount(password);
      toast({
        title: "Успешно",
        description: "Ваш аккаунт был удален",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить аккаунт",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteAccountDialog(false);
      setPassword("");
      setDeleteConfirm("");
    }
  };

  const approvedTotalPages = Math.ceil(approvedTotal / itemsPerPage);
  const pendingTotalPages = Math.ceil(pendingTotal / itemsPerPage);
  const rejectedTotalPages = Math.ceil(rejectedTotal / itemsPerPage);

  // Тут добавим рендеринг для мобильного устройства
  const renderProfileHeader = () => {
    return <ProfileHeader user={user} avatarLoading={avatarLoading} onAvatarChange={handleAvatarChange} onAvatarDelete={handleAvatarDelete} className="" avatarClassName={isMobile ? "h-20 w-20" : ""} userInfoClassName={isMobile ? "text-center" : "text-center"} isBanned={user?.isBanned || false} />;
  };

  const renderProfileStats = () => {
    if (isLoadingStats) {
      return <div className="text-center py-4">Загрузка статистики...</div>;
    }
    return <ProfileStats stats={stats} isLoadingStats={isLoadingStats} userId={user?.uid} className={isMobile ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"} itemClassName={isMobile ? "text-sm py-2" : ""} />;
  };

  // Добавляем компонент для рендеринга кнопок создания рецензий и новостей
  const renderActionButtons = () => {
    if (!user?.emailVerified) {
      return (
        <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 shadow-sm text-center mt-4">
          <p className="text-sm">Пожалуйста, подтвердите вашу почту, чтобы получить доступ к функциям.</p>
        </div>
      );
    }

    return (
      <div className={`mt-${isMobile ? "4" : "6"} flex ${isMobile ? "flex-col" : "flex-row justify-center"} gap-3`}>
        {isAdmin ? (
          <>
            <Button className={`${isMobile ? "w-full" : "min-w-[200px]"} flex items-center gap-2`} onClick={() => navigate("/admin/create-review")}>
              <PenTool className="h-4 w-4" />
              {isMobile ? "Создать рецензию" : "Создать рецензию (адм.)"}
            </Button>
            <Button className={`${isMobile ? "w-full" : "min-w-[200px]"} flex items-center gap-2`} onClick={() => navigate("/create-news")}>
              <Pencil className="h-4 w-4" />
              Создать новость
            </Button>
          </>
        ) : (
          <Button className={`${isMobile ? "w-full" : "min-w-[200px] mx-auto"} flex items-center gap-2`} onClick={() => navigate("/create-review")}>
            <PenTool className="h-4 w-4" />
            Написать рецензию
          </Button>
        )}
      </div>
    );
  };

  // Добавляем проверку на заблокированный аккаунт после проверки на авторизацию
  if (!user && !loading) {
    return <div className="text-center">Пожалуйста, войдите в систему</div>;
  }

  // Добавляем проверку на заблокированный аккаунт
  if (user?.isBanned) {
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 px-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Skull className="h-14 w-14 text-red-600" />
              <h2 className="text-2xl font-bold text-red-600">Аккаунт заблокирован</h2>
              <p className="text-muted-foreground">Ваш аккаунт был заблокирован администрацией сайта. Вы не можете использовать функции профиля.</p>
              <p className="text-sm text-muted-foreground">Если вы считаете, что произошла ошибка, пожалуйста, свяжитесь с администрацией.</p>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                <p className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Выход из аккаунта невозможен, так как ваш профиль заблокирован.</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={isMobile ? "px-2" : "container mx-auto"}>
      <Card className={isMobile ? "shadow-none border-0" : ""}>
        <CardHeader className={`flex flex-row items-center justify-between ${isMobile ? "px-3 py-3" : ""}`}>
          <CardTitle className="flex items-center gap-2">
            <User className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
            <span className={isMobile ? "text-lg" : ""}>Профиль</span>
          </CardTitle>
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? "sm" : "default"} className="h-9 px-3">
                  <Settings className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                  {!isMobile && <span className="ml-2">Настройки</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => navigate("/settings?tab=username")}>
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Изменить имя пользователя</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings?tab=password")}>
                  <Lock className="mr-2 h-4 w-4" />
                  <span>Изменить пароль</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/settings?tab=admin")}>
                      <UserCog className="mr-2 h-4 w-4" />
                      <span>Управление пользователями</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings?tab=moderation")}>
                      <FileCheck className="mr-2 h-4 w-4" />
                      <span>Модерация рецензий</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLogoutDialog(true)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteAccountDialog(true)} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Удалить аккаунт</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className={isMobile ? "px-3 pt-0 pb-3" : ""}>
          {renderProfileHeader()}
          {renderProfileStats()}
          {renderActionButtons()}

          {!isAdmin ? (
            <Tabs defaultValue="approved" className={`mt-${isMobile ? "4" : "6"}`}>
              <TabsList className={`${isMobile ? "grid grid-cols-3 gap-1" : "w-full"}`}>
                <TabsTrigger value="approved" className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>{isMobile ? "Опубл." : "Опубликованные"}</span>
                  {approvedTotal > 0 && <span className="ml-1 text-xs bg-primary/10 rounded-full px-2 py-0.5">{approvedTotal}</span>}
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{isMobile ? "Ожид." : "Ожидающие"}</span>
                  {pendingTotal > 0 && <span className="ml-1 text-xs bg-primary/10 rounded-full px-2 py-0.5">{pendingTotal}</span>}
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  <span>{isMobile ? "Откл." : "Отклоненные"}</span>
                  {rejectedTotal > 0 && <span className="ml-1 text-xs bg-primary/10 rounded-full px-2 py-0.5">{rejectedTotal}</span>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approved" className={`space-y-${isMobile ? "2" : "4"}`}>
                {isLoadingReviews ? (
                  <div className="text-center py-4">Загрузка рецензий...</div>
                ) : approvedReviews.length > 0 ? (
                  <>
                    <ReviewsList reviews={approvedReviews} statusType={EnumStatus.APPROVED} />
                    {approvedTotalPages > 1 && <UniversalPagination currentPage={approvedPage} totalPages={approvedTotalPages} onPageChange={setApprovedPage} isPaginationLoading={isPaginationLoading.approved} />}
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">У вас нет опубликованных рецензий</div>
                )}
              </TabsContent>

              <TabsContent value="pending" className={`space-y-${isMobile ? "2" : "4"}`}>
                {isLoadingReviews ? (
                  <div className="text-center py-4">Загрузка рецензий...</div>
                ) : pendingReviews.length > 0 ? (
                  <>
                    <ReviewsList reviews={pendingReviews} statusType={EnumStatus.PENDING} />
                    {pendingTotalPages > 1 && <UniversalPagination currentPage={pendingPage} totalPages={pendingTotalPages} onPageChange={setPendingPage} isPaginationLoading={isPaginationLoading.pending} />}
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">У вас нет рецензий на рассмотрении</div>
                )}
              </TabsContent>

              <TabsContent value="rejected" className={`space-y-${isMobile ? "2" : "4"}`}>
                {isLoadingReviews ? (
                  <div className="text-center py-4">Загрузка рецензий...</div>
                ) : rejectedReviews.length > 0 ? (
                  <>
                    <ReviewsList reviews={rejectedReviews} statusType={EnumStatus.REJECTED} />
                    {rejectedTotalPages > 1 && <UniversalPagination currentPage={rejectedPage} totalPages={rejectedTotalPages} onPageChange={setRejectedPage} isPaginationLoading={isPaginationLoading.rejected} />}
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">У вас нет отклоненных рецензий</div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className={`mt-${isMobile ? "4" : "6"} space-y-${isMobile ? "2" : "4"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5" />
                <h3 className={isMobile ? "text-lg" : "text-xl font-medium"}>Мои рецензии</h3>
              </div>
              {isLoadingReviews ? (
                <div className="text-center py-4">Загрузка рецензий...</div>
              ) : approvedReviews.length > 0 ? (
                <>
                  <ReviewsList reviews={approvedReviews} />
                  {approvedTotalPages > 1 && <UniversalPagination currentPage={approvedPage} totalPages={approvedTotalPages} onPageChange={setApprovedPage} />}
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">У вас нет рецензий</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалоговое окно подтверждения выхода */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className={`${isMobile ? "max-w-[90%] p-4" : "sm:max-w-md"} rounded-lg`}>
          <DialogHeader className={isMobile ? "space-y-2 mb-2" : ""}>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <LogOut className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
              <span className={isMobile ? "text-base" : ""}>Выход из системы</span>
            </DialogTitle>
            <DialogDescription className={isMobile ? "text-sm" : ""}>Вы действительно хотите выйти из системы?</DialogDescription>
          </DialogHeader>
          <DialogFooter className={`flex ${isMobile ? "flex-col space-y-2 mt-4" : "space-x-2 justify-end"}`}>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)} size={isMobile ? "sm" : "default"} className={isMobile ? "w-full" : ""}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleLogout} size={isMobile ? "sm" : "default"} className={isMobile ? "w-full" : ""}>
              Выйти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалоговое окно удаления аккаунта */}
      <Dialog
        open={showDeleteAccountDialog}
        onOpenChange={(open) => {
          setShowDeleteAccountDialog(open);
          if (!open) {
            setPassword("");
            setDeleteConfirm("");
          }
        }}
      >
        <DialogContent className={`${isMobile ? "max-w-[90%] p-4" : "sm:max-w-md"} rounded-lg`}>
          <DialogHeader className={isMobile ? "space-y-2 mb-2" : ""}>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
              <span className={isMobile ? "text-base" : ""}>Удаление аккаунта</span>
            </DialogTitle>
            <DialogDescription className={`${isMobile ? "text-xs pt-1" : "pt-2"}`}>Это действие безвозвратно удалит ваш аккаунт и все связанные с ним данные. Вы не сможете восстановить информацию после удаления.</DialogDescription>
          </DialogHeader>

          <div className={`space-y-${isMobile ? "3" : "4"} py-${isMobile ? "1" : "2"}`}>
            <div className="space-y-2">
              <Label htmlFor="password" className={isMobile ? "text-sm" : ""}>
                Ваш пароль
              </Label>
              <Input id="password" type="password" placeholder="Введите ваш пароль" value={password} onChange={(e) => setPassword(e.target.value)} className={isMobile ? "h-8 text-sm" : ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete" className={isMobile ? "text-sm" : ""}>
                Для подтверждения введите УДАЛИТЬ
              </Label>
              <Input id="confirm-delete" placeholder="УДАЛИТЬ" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className={`${deleteConfirm === "УДАЛИТЬ" ? "border-red-500" : ""} ${isMobile ? "h-8 text-sm" : ""}`} />
            </div>
          </div>

          <DialogFooter className={`flex ${isMobile ? "flex-col space-y-2 mt-2" : "space-x-2 justify-end"}`}>
            <Button variant="outline" onClick={() => setShowDeleteAccountDialog(false)} size={isMobile ? "sm" : "default"} className={isMobile ? "w-full" : ""}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting || deleteConfirm !== "УДАЛИТЬ" || !password} size={isMobile ? "sm" : "default"} className={isMobile ? "w-full" : ""}>
              {isDeleting ? "Удаление..." : isMobile ? "Удалить" : "Удалить аккаунт"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
