import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { searchUsers, updateUserRole } from "@/services/userService";
import { EnumRole, getRoleKey, getRoleValue } from "@/enums/role";
import { Shield, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminManagementProps {
  onSuccess?: () => void;
}

const AdminManagement = ({ onSuccess }: AdminManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundUsers, setFoundUsers] = useState<{ id: string; username: string; role: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.length < 3) {
      setFoundUsers([]);
      setHasSearched(false);
      return;
    }

    const searchTimeout = setTimeout(() => {
      searchUser();
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const searchUser = async () => {
    if (searchQuery.length < 3) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const usersData = await searchUsers(searchQuery);
      setFoundUsers(
        usersData.map((user) => ({
          id: user.uid,
          username: user.username,
          role: getRoleValue(user.role) || EnumRole.USER,
        }))
      );
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось найти пользователей",
        variant: "destructive",
      });
      setFoundUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentRole: string, username: string) => {
    if (!user) return;

    if (user.uid === userId) {
      toast({
        title: "Ошибка",
        description: "Вы не можете изменить свою собственную роль",
        variant: "destructive",
      });
      return;
    }

    try {
      const newRole = currentRole === EnumRole.ADMIN ? EnumRole.USER : EnumRole.ADMIN;
      await updateUserRole(userId, getRoleKey(newRole));

      setFoundUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? { ...user, role: newRole } : user)));
      toast({
        title: "Статус обновлён",
        description: `Пользователь ${username} ${newRole === EnumRole.ADMIN ? "теперь администратор" : "больше не администратор"}`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить статус пользователя",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = foundUsers.filter(user => {
    if (filter === "all") return true;
    if (filter === "admin") return user.role === EnumRole.ADMIN;
    if (filter === "user") return user.role === EnumRole.USER;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Введите логин пользователя (минимум 3 символа)" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("all")}
          >
            Все
          </Button>
          <Button 
            variant={filter === "admin" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("admin")}
            className="flex items-center gap-1"
          >
            <Shield className="w-4 h-4" />
            Админы
          </Button>
          <Button 
            variant={filter === "user" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("user")}
            className="flex items-center gap-1"
          >
            <User className="w-4 h-4" />
            Пользователи
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-9 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && hasSearched && filteredUsers.length === 0 && (
        <Alert variant="default" className="bg-muted">
          <AlertDescription>
            {searchQuery.length >= 3 
              ? "Пользователи не найдены. Попробуйте изменить запрос."
              : "Введите не менее 3 символов для поиска."}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && filteredUsers.length > 0 && (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={user.role === EnumRole.ADMIN ? "default" : "secondary"} className="text-xs">
                        {user.role === EnumRole.ADMIN ? (
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Администратор
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Пользователь
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant={user.role === EnumRole.ADMIN ? "destructive" : "default"}
                    onClick={() => toggleAdminStatus(user.id, user.role, user.username)}
                    className="flex items-center gap-1"
                    size="sm"
                  >
                    <Shield className="w-4 h-4" />
                    {user.role === EnumRole.ADMIN ? "Снять админку" : "Сделать админом"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
