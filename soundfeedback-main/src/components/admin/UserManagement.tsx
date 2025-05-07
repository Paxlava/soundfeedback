import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { searchUsers, updateUserRole, updateUserBanStatus, getAllUsers, toggleUserBan } from "@/services/userService";
import { EnumRole, getRoleKey, getRoleValue } from "@/enums/role";
import { Search, User, Shield, Ban, CheckCircle, Mail, MailX, ChevronLeft, ChevronRight, MoreHorizontal, UserCheck, ShieldAlert, Loader2, Crown, UserX, SquareUserRound, ShieldCheck, UserCog, CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, UniversalPagination } from "@/components/ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarByUsername } from "@/lib/utils";
import { SERVER_URL } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface User {
  id: string;
  username: string;
  role: string;
  isBanned: boolean;
  emailVerified: boolean;
  avatarUrl?: string;
  email: string;
  originalRole: string;
}

interface UserManagementProps {
  onSuccess?: () => void;
}

const ITEMS_PER_PAGE = 8; // Увеличиваем количество пользователей на странице
const MAX_VISIBLE_PAGES = 5;

// Тип для действия, ожидающего подтверждения
type PendingActionType = {
  userId: string;
  username: string;
  action: "admin" | "ban";
  currentValue: boolean;
} | null;

const UserManagement = ({ onSuccess }: UserManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Состояния для отслеживания текущих действий
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<"admin" | "ban" | null>(null);
  
  // Состояния для диалога подтверждения
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingActionType>(null);
  
  // Добавляем необходимые состояния для диалога подтверждения
  const [currentValue, setCurrentValue] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [confirmTitle, setConfirmTitle] = useState<string>("");
  const [confirmDescription, setConfirmDescription] = useState<string>("");
  
  // Добавляем отдельное состояние для отслеживания выполнения действия в диалоге
  const [isConfirmLoading, setIsConfirmLoading] = useState<boolean>(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Добавляем реф для хранения таймера
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Получение пользователей с пагинацией
  const getUsersPaginated = async (page = 1, limit = ITEMS_PER_PAGE, searchTerm = "") => {
    try {
      const allUsers = await getAllUsers();
      
      // Исключаем текущего пользователя из списка, чтобы админ не мог заблокировать сам себя
      const filteredByCurrentUser = allUsers.filter(u => u.uid !== user?.uid);
      
      // Фильтрация по поиску только по никам пользователей
      const filtered = searchTerm 
        ? filteredByCurrentUser.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : filteredByCurrentUser;
      
      // Сортировка: сначала админы, потом остальные
      const sorted = [...filtered].sort((a, b) => {
        if (a.role === EnumRole.ADMIN && b.role !== EnumRole.ADMIN) return -1;
        if (a.role !== EnumRole.ADMIN && b.role === EnumRole.ADMIN) return 1;
        return 0;
      });
      
      // Общее количество пользователей (для пагинации)
      const total = sorted.length;
      
      // Применяем пагинацию
      const startIndex = (page - 1) * limit;
      const paginatedUsers = sorted.slice(startIndex, startIndex + limit);
      
      return {
        users: paginatedUsers,
        total: total
      };
    } catch (error) {
      console.error("Ошибка при получении пользователей:", error);
      throw error;
    }
  };

  // Функция загрузки пользователей с корректным преобразованием ролей
  const loadUsers = async (page: number, search: string) => {
    try {
      if (page === currentPage && !isLoading) {
        setIsPaginationLoading(true);
      } else {
        setIsLoading(true);
      }
      
      const { users: loadedUsers, total } = await getUsersPaginated(page, ITEMS_PER_PAGE, search);
      
      // Преобразуем данные пользователей
      const mappedUsers = loadedUsers.map(userData => {
        // Сохраняем оригинальную роль из БД
        const roleFromDB = userData.role as string;
        
        // Получаем локализованное значение роли для отображения
        const displayRole = roleFromDB === "ADMIN" ? "Администратор" : "Пользователь";
        
        console.log(`Пользователь ${userData.username}: роль в БД ${roleFromDB}, отображаемая роль ${displayRole}`);
        
        return {
          id: userData.uid,
          username: userData.username,
          // Сохраняем оригинальную роль из БД для правильного сравнения
          originalRole: roleFromDB,
          // Отображаемая роль для UI
          role: displayRole,
          isBanned: userData.isBanned || false,
          emailVerified: userData.emailVerified || false,
          avatarUrl: userData.avatarUrl,
          email: userData.email || ""
        };
      });
      
      setUsers(mappedUsers);
      setFilteredUsers(mappedUsers);
      setTotalUsers(total);
      setHasSearched(true);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список пользователей",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsPaginationLoading(false);
    }
  };

  useEffect(() => {
    // Загружаем список пользователей при монтировании компонента
    loadUsers(1, "");
    setHasSearched(true);
  }, []);

  useEffect(() => {
    // Эта функция загружает пользователей при изменении страницы
    if (hasSearched) {
      loadUsers(currentPage, searchQuery);
    }
  }, [currentPage]);
  
  useEffect(() => {
    // При изменении поискового запроса сбрасываем страницу на первую
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else if (hasSearched) {
      // Если уже на первой странице, просто обновляем результаты
      loadUsers(1, searchQuery);
    }
  }, [searchQuery, hasSearched]);

  // Обновляем поле поиска для автоматического поиска при изменении текста
  const handleSearchInputChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    
    // Добавляем небольшую задержку перед выполнением поиска
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      // Если строка поиска пустая, загружаем всех пользователей
      loadUsers(1, newValue);
    }, 300);
  };

  const handleSearch = () => {
    loadUsers(1, searchQuery);
  };
  
  // Обработчики для подготовки действий с подтверждением
  const handleActionClick = (userId: string, action: "admin" | "ban") => {
    // Находим пользователя в списке
    const user = users.find(u => u.id === userId);
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Пользователь не найден",
        variant: "destructive"
      });
      return;
    }
    
    // Устанавливаем текущее значение для диалога подтверждения
    let currentValue = false;
    let confirmTitle = "";
    let confirmDescription = "";
    
    if (action === "admin") {
      // Проверяем, является ли пользователь уже администратором
      currentValue = user.role === EnumRole.ADMIN;
      confirmTitle = currentValue 
        ? "Отозвать права администратора?" 
        : "Назначить администратором?";
      confirmDescription = currentValue
        ? `Вы уверены, что хотите отозвать права администратора у пользователя ${user.username}?`
        : `Вы уверены, что хотите назначить пользователя ${user.username} администратором?`;
    } else if (action === "ban") {
      currentValue = user.isBanned || false;
      confirmTitle = currentValue ? "Разблокировать пользователя?" : "Заблокировать пользователя?";
      confirmDescription = currentValue
        ? `Вы уверены, что хотите разблокировать пользователя ${user.username}?`
        : `Вы уверены, что хотите заблокировать пользователя ${user.username}?`;
    }
    
    // Устанавливаем данные о действии, ожидающем подтверждения
    setPendingAction({
      userId,
      username: user.username || "",
      action,
      currentValue
    });
    
    setCurrentValue(currentValue);
    setUsername(user.username || "");
    
    // Устанавливаем заголовок и описание диалога
    setConfirmTitle(confirmTitle);
    setConfirmDescription(confirmDescription);
    
    // Показываем диалог подтверждения
    setShowConfirmDialog(true);
  };
  
  // Функция для выполнения утвержденного действия
  const executeAction = async () => {
    if (!pendingAction) return;
    
    const { userId, action, currentValue } = pendingAction;
    
    setIsConfirmLoading(true);
    setProcessingUserId(userId);
    
    try {
      // Находим пользователя в текущем списке
      const userToUpdate = users.find(user => user.id === userId);
      if (!userToUpdate) {
        toast({
          title: "Ошибка",
          description: "Пользователь не найден",
          variant: "destructive"
        });
        return;
      }
      
      if (action === "admin") {
        // Проверяем, является ли пользователь сейчас администратором по оригинальной роли
        const isCurrentlyAdmin = userToUpdate.originalRole === "ADMIN";
        
        // Определяем новую роль для базы данных
        const newRoleKey = isCurrentlyAdmin ? "USER" : "ADMIN";
        
        console.log(`Текущая роль: ${userToUpdate.originalRole}, isAdmin: ${isCurrentlyAdmin}`);
        console.log(`Отправляем в БД роль: ${newRoleKey}`);
        
        // Отправляем роль на сервер
        await updateUserRole(userId, newRoleKey);
        
        // Определяем новую отображаемую роль для UI
        const newDisplayRole = isCurrentlyAdmin ? "Пользователь" : "Администратор";
        
        console.log(`Новое отображаемое значение роли: ${newDisplayRole}`);
        
        // Создаем обновленный объект пользователя
        const updatedUserObj = {
          ...userToUpdate,
          originalRole: newRoleKey,
          role: newDisplayRole
        };
        
        // Обновляем списки пользователей для UI
        setUsers(prevUsers => 
          prevUsers.map(u => u.id === userId ? updatedUserObj : u)
        );
        
        setFilteredUsers(prevFiltered => 
          prevFiltered.map(u => u.id === userId ? updatedUserObj : u)
        );
        
        toast({
          title: "Успех",
          description: isCurrentlyAdmin 
            ? `Права администратора отозваны у пользователя ${userToUpdate.username}` 
            : `Пользователь ${userToUpdate.username} назначен администратором`,
          variant: "default"
        });
      } else if (action === "ban") {
        // Остальной код для блокировки пользователя остается прежним
        const isCurrentlyBanned = userToUpdate.isBanned;
        const newBanStatus = !isCurrentlyBanned;
        
        await toggleUserBan(userId, newBanStatus);
        
        // Если происходит блокировка, сохраняем информацию о блокировке
        if (newBanStatus) {
          localStorage.setItem(`sf_user_was_banned_${userId}`, 'true');
          // И удаляем флаг показа уведомления о блокировке, чтобы оно показалось снова
          localStorage.removeItem(`sf_ban_notification_shown_${userId}`);
        } 
        // Если происходит разблокировка, устанавливаем флаг что пользователь был заблокирован
        // и удаляем предыдущее уведомление о разблокировке, чтобы оно показалось при следующем заходе на сайт
        else if (!newBanStatus) {
          localStorage.removeItem(`sf_unban_notification_shown_${userId}`);
          localStorage.setItem(`sf_user_was_banned_${userId}`, 'true');
        }
        
        const updatedUserObj = { 
          ...userToUpdate, 
          isBanned: newBanStatus 
        };
        
        setUsers(prevUsers => 
          prevUsers.map(u => u.id === userId ? updatedUserObj : u)
        );
        
        setFilteredUsers(prevFiltered => 
          prevFiltered.map(u => u.id === userId ? updatedUserObj : u)
        );
        
        toast({
          title: "Успех",
          description: newBanStatus
            ? `Пользователь ${userToUpdate.username} заблокирован`
            : `Пользователь ${userToUpdate.username} разблокирован`,
          variant: "default"
        });
      }
      
      // Принудительно загружаем пользователей после успешного действия
      await loadUsers(currentPage, searchQuery);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`Ошибка при выполнении действия ${action}:`, error);
      toast({
        title: "Ошибка",
        description: `Не удалось выполнить действие: ${error.message || "Неизвестная ошибка"}`,
        variant: "destructive"
      });
      
      // В случае ошибки перезагружаем данные с сервера
      loadUsers(currentPage, searchQuery).catch(err => {
        console.error("Ошибка при обновлении списка пользователей:", err);
      });
    } finally {
      setIsConfirmLoading(false);
      setProcessingUserId(null);
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  // Функция для получения диапазона страниц для пагинации
  const getPageRange = () => {
    const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);
    
    if (totalPages <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const halfVisible = Math.floor(MAX_VISIBLE_PAGES / 2);
    let startPage = currentPage - halfVisible;
    let endPage = currentPage + halfVisible;
    
    if (startPage < 1) {
      startPage = 1;
      endPage = MAX_VISIBLE_PAGES;
    }
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, totalPages - MAX_VISIBLE_PAGES + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  // Вычисляем общее количество страниц
  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  // Функция обработки изменения страницы
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && !isPaginationLoading) {
      setCurrentPage(page);
    }
  };
  
  // Функция для корректной обработки URL аватара
  const getAvatarUrl = (url: string | undefined): string => {
    if (!url) return "";
    
    // Если URL начинается с http(s):// или data:, возвращаем как есть
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    
    // Если это относительный путь, добавляем SERVER_URL
    if (url.startsWith('/')) {
      return `${SERVER_URL}${url}`;
    }
    
    return url;
  };

  // Компонент скелетона
  const UserSkeleton = () => (
    <Card>
      <CardContent className={isMobile ? "p-3" : "p-4"}>
        <div className="flex gap-3 items-center">
          <Skeleton className="rounded-full h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">

      
      <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск по никам пользователей" 
            value={searchQuery} 
            onChange={handleSearchInputChange}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <UserSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <Alert variant="default" className="bg-muted">
          <UserCheck className="h-4 w-4" />
          <AlertTitle>Нет результатов</AlertTitle>
          <AlertDescription>
            Пользователи не найдены. Попробуйте изменить запрос поиска.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && users.length > 0 && (
        <>
          <div className="space-y-3">
            {isPaginationLoading ? 
              Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <UserSkeleton key={i} />) :
              users.map((user) => {
                console.log(`Пользователь ${user.username}, роль: ${user.role}, originalRole: ${user.originalRole}`);
                return (
                  <Card key={user.id} className={user.isBanned ? "border-destructive/20" : ""}>
                    <CardContent className={isMobile ? "p-3" : "p-4"}>
                      <div className="flex gap-3 items-center">
                        <Avatar className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} border-2 border-border`}>
                          <AvatarImage src={getAvatarUrl(user.avatarUrl)} alt={user.username} />
                          <AvatarFallback>{getAvatarByUsername(user.username)}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          <div className={`flex flex-wrap gap-1 mt-1`}>
                            <Badge 
                              variant={user.role === "Администратор" ? "default" : "secondary"} 
                              className="text-xs py-0"
                            >
                              <span className="flex items-center gap-1">
                                {user.role === "Администратор" ? (
                                  <>
                                    <Shield className={isMobile ? "w-3 h-3" : "w-3 h-3"} />
                                    {isMobile ? "Админ" : "Администратор"}
                                  </>
                                ) : (
                                  <>
                                    <User className={isMobile ? "w-3 h-3" : "w-3 h-3"} />
                                    Пользователь
                                  </>
                                )}
                              </span>
                            </Badge>
                            <Badge 
                              variant={user.isBanned ? "destructive" : "outline"} 
                              className="text-xs py-0"
                            >
                              <span className="flex items-center gap-1">
                                {user.isBanned ? (
                                  <>
                                    <Ban className={isMobile ? "w-3 h-3" : "w-3 h-3"} />
                                    {isMobile ? "Заблок." : "Заблокирован"}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className={isMobile ? "w-3 h-3" : "w-3 h-3"} />
                                    Активен
                                  </>
                                )}
                              </span>
                            </Badge>
                          </div>
                        </div>
                        
                        {isMobile ? (
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              onClick={() => handleActionClick(user.id, "admin")}
                              variant={user.originalRole === "ADMIN" ? "default" : "secondary"}
                              className={`relative h-9 w-9 ${processingUserId === user.id && pendingAction?.action === "admin" ? "animate-pulse" : ""}`}
                              disabled={processingUserId === user.id}
                              title={user.originalRole === "ADMIN" ? "Снять права админа" : "Назначить админом"}
                            >
                              {processingUserId === user.id && pendingAction?.action === "admin" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.originalRole === "ADMIN" ? (
                                <CircleUserRound className="h-4 w-4" />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Button
                              size="icon"
                              onClick={() => handleActionClick(user.id, "ban")}
                              variant={user.isBanned ? "outline" : "destructive"}
                              className={`relative h-9 w-9 ${processingUserId === user.id && pendingAction?.action === "ban" ? "animate-pulse" : ""}`}
                              disabled={processingUserId === user.id}
                              title={user.isBanned ? "Разблокировать" : "Заблокировать"}
                            >
                              {processingUserId === user.id && pendingAction?.action === "ban" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.isBanned ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              onClick={() => handleActionClick(user.id, "admin")}
                              variant={user.originalRole === "ADMIN" ? "default" : "secondary"}
                              className={`relative h-9 w-9 ${processingUserId === user.id && pendingAction?.action === "admin" ? "animate-pulse" : ""}`}
                              disabled={processingUserId === user.id}
                              title={user.originalRole === "ADMIN" ? "Снять права админа" : "Назначить админом"}
                            >
                              {processingUserId === user.id && pendingAction?.action === "admin" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.originalRole === "ADMIN" ? (
                                <CircleUserRound className="h-4 w-4" />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Button
                              size="icon"
                              onClick={() => handleActionClick(user.id, "ban")}
                              variant={user.isBanned ? "outline" : "destructive"}
                              className={`relative h-9 w-9 ${processingUserId === user.id && pendingAction?.action === "ban" ? "animate-pulse" : ""}`}
                              disabled={processingUserId === user.id}
                              title={user.isBanned ? "Разблокировать" : "Заблокировать"}
                            >
                              {processingUserId === user.id && pendingAction?.action === "ban" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : user.isBanned ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            }
          </div>

          {/* Заменяем существующую пагинацию на UniversalPagination */}
          <UniversalPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isPaginationLoading={isPaginationLoading}
          />
          
          <div className="text-center text-xs text-muted-foreground mt-2">
            Показано {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalUsers)} из {totalUsers} пользователей
          </div>
        </>
      )}
      
      {/* Диалог подтверждения действия */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className={isMobile ? "w-[calc(100%-32px)] p-4 max-w-md" : ""}>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          
          <DialogFooter className={isMobile ? "flex-col gap-2 mt-4" : "mt-4"}>
            <Button 
              onClick={() => setShowConfirmDialog(false)}
              variant="outline" 
              className={isMobile ? "w-full" : ""}
            >
              Отмена
            </Button>
            <Button 
              onClick={executeAction}
              disabled={isConfirmLoading}
              className={isMobile ? "w-full" : ""}
            >
              {isConfirmLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement; 