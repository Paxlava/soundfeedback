import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Search, ArrowLeft } from "lucide-react";
import Loader from "@/components/Loader";
import { 
  getUserSubscribers, 
  getUserSubscriptions, 
  fetchUserData
} from "@/services/userService";
import { UserData } from "@/types/userTypes";
import { useAuth } from "@/hooks/useAuth";
import { UniversalPagination } from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EnumRole } from "@/enums/role";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Number of users per page
const USERS_PER_PAGE = 12;

const UserRelationshipsPage = () => {
  // Получаем параметры маршрута и местоположение
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Определяем тип отношения на основе пути URL
  const isSubscribersPage = location.pathname.includes("/subscribers");
  
  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [relationshipType, setRelationshipType] = useState<"subscribers" | "subscriptions">(
    isSubscribersPage ? "subscribers" : "subscriptions"
  );
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [userName, setUserName] = useState<string | null>(null);

  // Обновляем тип отношения при изменении пути
  useEffect(() => {
    setRelationshipType(isSubscribersPage ? "subscribers" : "subscriptions");
  }, [isSubscribersPage]);

  // Загружаем данные при изменении userId или типа отношений
  useEffect(() => {
    loadUserRelationships();
  }, [userId, relationshipType]);

  // Обновляем отфильтрованных пользователей при изменении поискового запроса
  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  // Загрузка списка подписчиков или подписок
  const loadUserRelationships = async () => {
    setIsLoading(true);
    try {
      const targetUserId = userId || (user ? user.uid : "");
      
      if (!targetUserId) {
        navigate("/login");
        return;
      }

      // Получаем имя пользователя
      const userData = await fetchUserData(targetUserId);
      if (userData) {
        setUserName(userData.username);
      }

      // Получаем список подписчиков или подписок
      let usersList: UserData[];
      if (relationshipType === "subscribers") {
        usersList = await getUserSubscribers(targetUserId);
      } else {
        usersList = await getUserSubscriptions(targetUserId);
      }

      // Фильтруем заблокированных пользователей
      usersList = usersList.filter(u => !u.isBanned);
      
      setUsers(usersList);
      setFilteredUsers(usersList);
    } catch (error: any) {
      console.error("Ошибка при загрузке данных:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтрация пользователей по поисковому запросу
  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowercaseQuery = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredUsers(filtered);
  };

  // Переключение между страницами
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Расчет пагинации
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE, 
    currentPage * USERS_PER_PAGE
  );

  // Заголовок страницы
  const getPageTitle = () => {
    const baseTitle = relationshipType === "subscribers" ? "Подписчики" : "Подписки";
    return userName ? `${baseTitle} пользователя ${userName}` : baseTitle;
  };

  // Получение иконки страницы
  const getPageIcon = () => {
    return relationshipType === "subscribers" ? (
      <Users className="h-5 w-5" />
    ) : (
      <UserPlus className="h-5 w-5" />
    );
  };

  // Отображение загрузки
  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="container mx-auto py-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              className="p-0 h-8 w-8" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {getPageIcon()}
            <span>{getPageTitle()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени пользователя..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {paginatedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery 
                ? "Не найдено пользователей, соответствующих запросу" 
                : relationshipType === "subscribers"
                  ? "У этого пользователя нет подписчиков"
                  : "Этот пользователь ни на кого не подписан"
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedUsers.map((userData) => (
                <Card 
                  key={userData.uid} 
                  className="flex flex-col cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/profile/${userData.username}`)}
                >
                  <CardContent className="flex items-center p-6">
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarImage src={userData.avatarUrl || ""} alt={userData.username} />
                      <AvatarFallback>{userData.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{userData.username}</p>
                      <p className={cn(
                        "text-xs",
                        userData.role === EnumRole.ADMIN ? "text-blue-500" : "text-muted-foreground"
                      )}>
                        {userData.role === EnumRole.ADMIN ? "Администратор" : "Пользователь"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6">
              <UniversalPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRelationshipsPage; 