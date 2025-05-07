import { Link, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast"; // Для уведомлений
import { useAuth } from "@/hooks/useAuth";
import Loader from "./Loader";
import { EnumRole } from "@/enums/role";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Функция выхода из системы
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Успешно",
        description: "Вы вышли из системы",
      });
      setIsMenuOpen(false); // Закрываем меню после выхода
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось выйти из системы",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Логотип */}
          <div className="flex items-center justify-between flex-1 md:flex-none">
            <Link to="/" className="text-xl font-bold truncate max-w-[200px] sm:max-w-full">
              {isMobile ? (
                <div className="flex flex-col leading-tight">
                  <span>Андеграунд</span>
                  <span>должен быть услышан</span>
                </div>
              ) : (
                "Андеграунд должен быть услышан"
              )}
            </Link>
            {/* Бургер меню для мобильных устройств */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 rounded-md text-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Открыть меню"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Десктопная навигация */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-4">
              <Link to="/news" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/news") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                Новости
              </Link>
              <Link to="/reviews" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/reviews") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                Рецензии пользователей
              </Link>
              <Link to="/admin-reviews" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/admin-reviews") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                Рецензии редакции
              </Link>
              <Link to="/users" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/users") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                Пользователи
              </Link>
            </div>
          </div>
          
          {/* Десктопная аутентификация */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <div className="flex items-center space-x-4">
                <Loader />
              </div>
            ) : user ? (
              <>
                <Link to="/profile" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/profile") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                  Профиль
                </Link>
                <Link to="/subscription-reviews" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/subscription-reviews") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                  Подписки
                </Link>
                <Link to="/terms" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/terms") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                  Правила сайта
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/login") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                  Войти
                </Link>
                <Link to="/register" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/register") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Мобильное меню */}
        <div 
          className={cn(
            "md:hidden fixed left-0 right-0 top-16 bg-background border-b border-border transition-all duration-300 ease-in-out z-50",
            isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          )}
        >
          <div className="container mx-auto px-4 pb-4 pt-2 flex flex-col space-y-2">
            {/* Навигационные ссылки */}
            <Link 
              to="/news" 
              className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/news") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Новости
            </Link>
            <Link 
              to="/reviews" 
              className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/reviews") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Рецензии пользователей
            </Link>
            <Link 
              to="/admin-reviews" 
              className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/admin-reviews") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Рецензии редакции
            </Link>
            <Link 
              to="/users" 
              className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/users") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Пользователи
            </Link>

            {/* Разделитель */}
            <div className="h-px bg-muted my-2"></div>

            {/* Ссылки аутентификации */}
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader />
              </div>
            ) : user ? (
              <>
                <Link 
                  to="/profile" 
                  className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/profile") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Профиль
                </Link>
                <Link 
                  to="/subscription-reviews" 
                  className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/subscription-reviews") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Подписки
                </Link>
                <Link 
                  to="/terms" 
                  className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/terms") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Правила сайта
                </Link>
                
                {/* Кнопка выхода - скрываем для заблокированных пользователей */}
                {!user.isBanned && (
                  <button 
                    onClick={handleLogout} 
                    className="px-3 py-2 rounded-md text-sm font-medium block w-full text-left text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Выйти
                  </button>
                )}
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/login") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Войти
                </Link>
                <Link 
                  to="/register" 
                  className={`px-3 py-2 rounded-md text-sm font-medium block ${isActive("/register") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
