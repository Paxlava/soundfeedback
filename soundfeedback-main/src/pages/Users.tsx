import { useState, useEffect, FormEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getUsersPaginated } from "@/services/userService";
import { UserData } from "@/types/userTypes";
import Loader from "@/components/Loader";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users as UsersIcon, Search, Star, Skull } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { UniversalPagination } from "@/components/ui/pagination";
import { debounce } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EnumRole } from "@/enums/role";

const MOBILE_ITEMS_PER_PAGE = 8;
const DESKTOP_ITEMS_PER_PAGE = 12;

const Users = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // Текст в поле ввода
  const [searchQuery, setSearchQuery] = useState(""); // Фактический поисковый запрос для API
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const isMobile = useIsMobile();

  // Определяем количество элементов на странице в зависимости от устройства
  const itemsPerPage = isMobile ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE;
  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  // Обработчик для поискового запроса при нажатии Enter
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm.trim());
    setPage(1);
  };

  // Загрузка пользователей
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await getUsersPaginated(page, itemsPerPage, searchQuery);
        
        // Фильтруем текущего пользователя из списка и удаляем дубликаты по имени
        const uniqueUsernames = new Set<string>();
        const filteredUsers = result.users.filter(userData => {
          // Пропускаем текущего пользователя
          if (user && userData.uid === user.uid) return false;
          
          // Пропускаем заблокированных пользователей
          if (userData.isBanned) return false;
          
          // Проверяем на дубликаты имен пользователей (например, Olegg)
          if (uniqueUsernames.has(userData.username.toLowerCase())) return false;
          
          // Добавляем имя в список обработанных
          uniqueUsernames.add(userData.username.toLowerCase());
          return true;
        });

        setUsers(filteredUsers);
        setTotalUsers(result.total - (result.total - filteredUsers.length)); // Корректируем общее количество
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить список пользователей");
        toast({
          title: "Ошибка",
          description: err.message || "Не удалось загрузить список пользователей",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [searchQuery, page, itemsPerPage, toast, user]);

  // Отображение загрузки
  if (isLoading && page === 1) {
    return <Loader />;
  }

  // Отображение ошибки
  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className={isMobile ? "px-2" : "container mx-auto max-w-2xl"}>
      <Card className={isMobile ? "shadow-none border-0" : ""}>
        <CardHeader className={`flex flex-row items-center justify-between ${isMobile ? 'px-3 py-2' : 'py-3'}`}>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
            <span className={isMobile ? "text-lg" : ""}>Пользователи</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className={isMobile ? "px-3 pt-0 pb-2" : "pt-0 pb-3"}>
          {/* Поиск */}
          <form onSubmit={handleSearch} className="relative mb-4">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder="Поиск пользователей... (нажмите Enter)"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          {/* Список пользователей */}
          {isLoading && page === 1 ? (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {searchQuery ? "Пользователи не найдены" : "Список пользователей пуст"}
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((userData) => (
                <Link 
                  key={userData.uid} 
                  to={`/user/${userData.username}`}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className={isMobile ? "h-8 w-8" : "h-9 w-9"}>
                    <AvatarImage src={userData.avatarUrl || ""} alt={userData.username} />
                    <AvatarFallback>{userData.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{userData.username}</span>
                        
                        {/* Показываем значок администратора */}
                        {userData.role === EnumRole.ADMIN && (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="h-5 w-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center transition-transform transform hover:scale-110">
                                <Star className="h-4 w-4 fill-white/60 stroke-white/50" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={10} side="right" className="transition-opacity duration-300">
                              {EnumRole.ADMIN}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Индикатор загрузки при подгрузке следующей страницы */}
              {isLoading && page > 1 && (
                <div className="flex justify-center py-3">
                  <Loader />
                </div>
              )}

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <UniversalPagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users; 