import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { searchUsers, updateUserBanStatus } from "@/services/userService";
import { Search, User, Ban, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface BanManagementProps {
  onSuccess?: () => void;
}

const BanManagement = ({ onSuccess }: BanManagementProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundUsers, setFoundUsers] = useState<{ id: string; username: string; isBanned: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filter, setFilter] = useState<"all" | "banned" | "active">("all");
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Состояния для диалога подтверждения
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmUserId, setConfirmUserId] = useState<string>("");
  const [confirmUsername, setConfirmUsername] = useState<string>("");
  const [confirmCurrentStatus, setConfirmCurrentStatus] = useState<boolean>(false);
  const [confirmTitle, setConfirmTitle] = useState<string>("");
  const [confirmDescription, setConfirmDescription] = useState<string>("");
  const [isConfirmLoading, setIsConfirmLoading] = useState<boolean>(false);

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
        usersData.map((userData) => ({
          id: userData.uid,
          username: userData.username,
          isBanned: userData.isBanned || false,
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

  const handleBanClick = (userId: string, currentStatus: boolean, username: string) => {
    if (!user) return;

    if (user.uid === userId) {
      toast({
        title: "Ошибка",
        description: "Вы не можете забанить самого себя",
        variant: "destructive",
      });
      return;
    }

    // Настраиваем диалог подтверждения
    setConfirmUserId(userId);
    setConfirmUsername(username);
    setConfirmCurrentStatus(currentStatus);
    
    const newStatus = !currentStatus;
    setConfirmTitle(newStatus ? "Заблокировать пользователя?" : "Разблокировать пользователя?");
    setConfirmDescription(
      newStatus 
        ? `Вы уверены, что хотите заблокировать пользователя ${username}?` 
        : `Вы уверены, что хотите разблокировать пользователя ${username}?`
    );
    
    setShowConfirmDialog(true);
  };

  const toggleBanStatus = async () => {
    if (!confirmUserId) return;
    
    setIsConfirmLoading(true);

    try {
      const newStatus = !confirmCurrentStatus;
      await updateUserBanStatus(confirmUserId, newStatus);

      if (newStatus) {
        // При блокировке сохраняем флаг, что пользователь заблокирован
        localStorage.setItem(`sf_user_was_banned_${confirmUserId}`, 'true');
        // И удаляем флаг показа уведомления о блокировке, чтобы оно показалось снова
        localStorage.removeItem(`sf_ban_notification_shown_${confirmUserId}`);
      } else if (!newStatus) {
        // При разблокировке удаляем флаг показа предыдущего уведомления о разблокировке
        localStorage.removeItem(`sf_unban_notification_shown_${confirmUserId}`);
        // И устанавливаем флаг что пользователь был заблокирован
        localStorage.setItem(`sf_user_was_banned_${confirmUserId}`, 'true');
      }

      setFoundUsers((prevUsers) => 
        prevUsers.map((user) => (user.id === confirmUserId ? { ...user, isBanned: newStatus } : user))
      );
      
      toast({
        title: "Статус обновлён",
        description: `Пользователь ${confirmUsername} ${newStatus ? "заблокирован" : "разблокирован"}`,
      });

      if (onSuccess) {
        onSuccess();
      }
      
      // Закрываем диалог
      setShowConfirmDialog(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить статус блокировки",
        variant: "destructive",
      });
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const filteredUsers = foundUsers.filter(user => {
    if (filter === "all") return true;
    if (filter === "banned") return user.isBanned;
    if (filter === "active") return !user.isBanned;
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
            variant={filter === "banned" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("banned")}
            className="flex items-center gap-1"
          >
            <Ban className="w-4 h-4" />
            Заблокированные
          </Button>
          <Button 
            variant={filter === "active" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("active")}
            className="flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            Активные
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
                      <Badge 
                        variant={user.isBanned ? "destructive" : "default"} 
                        className="text-xs"
                      >
                        {user.isBanned ? (
                          <span className="flex items-center gap-1">
                            <Ban className="w-3 h-3" />
                            Заблокирован
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Активен
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant={user.isBanned ? "default" : "destructive"}
                    onClick={() => handleBanClick(user.id, user.isBanned, user.username)}
                    className="flex items-center gap-1"
                    size="sm"
                  >
                    {user.isBanned ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Разблокировать
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        Заблокировать
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Диалог подтверждения блокировки/разблокировки */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
            >
              Отмена
            </Button>
            <Button 
              onClick={toggleBanStatus}
              disabled={isConfirmLoading}
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

export default BanManagement;
