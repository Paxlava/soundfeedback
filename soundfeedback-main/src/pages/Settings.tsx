import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsernameChange from "@/components/profile/UsernameChange";
import PasswordChange from "@/components/settings/PasswordChange";
import UserManagement from "@/components/admin/UserManagement";
import ReviewModeration from "@/components/admin/ReviewModeration";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import { Settings as SettingsIcon, Shield, LockKeyhole, FileText, User, UserCog, ArrowLeft, Palette } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EnumRole } from "@/enums/role";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const Settings = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === EnumRole.ADMIN;
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("username");
  const [showTabs, setShowTabs] = useState(true);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Получаем значение параметра tab из URL
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    
    // Если параметр есть и он валиден, устанавливаем его как активный таб
    if (tabParam && ["username", "password", "admin", "moderation", "appearance"].includes(tabParam)) {
      setActiveTab(tabParam);
      setShowTabs(false); // Скрываем панель вкладок если переход по прямой ссылке
    } else {
      setShowTabs(true);
    }
  }, [location]);

  const handleBackToProfile = () => {
    navigate('/profile');
  };

  const getCurrentSectionTitle = () => {
    if (activeTab === "username") return "Изменение имени";
    if (activeTab === "password") return "Изменение пароля";
    if (activeTab === "admin") return "Управление пользователями";
    if (activeTab === "moderation") return "Модерация";
    if (activeTab === "appearance") return "Внешний вид";
    return "Настройки";
  };

  return (
    <div className={`${isMobile ? 'px-2' : 'max-w-4xl'} mx-auto`}>
      <Card className={isMobile ? "border-0 shadow-none" : ""}>
        <CardHeader className={`flex flex-row items-center justify-between ${isMobile ? 'px-3 py-3' : ''}`}>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
            <span className={isMobile ? "text-lg" : ""}>
              {!showTabs ? getCurrentSectionTitle() : "Настройки"}
            </span>
          </CardTitle>
          {!showTabs && (
            <Button variant="ghost" size={isMobile ? "sm" : "default"} onClick={handleBackToProfile} className="flex items-center gap-1">
              <ArrowLeft className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
              {isMobile ? "Назад" : "Назад в профиль"}
            </Button>
          )}
        </CardHeader>
        <CardContent className={isMobile ? "px-3 py-2" : ""}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {showTabs && (
              <TabsList className={`${isMobile ? 'flex flex-wrap' : 'w-full'}`}>
                <TabsTrigger value="username" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{isMobile ? "Имя" : "Имя пользователя"}</span>
                </TabsTrigger>
                <TabsTrigger value="password" className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4" />
                  <span>Пароль</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>Внешний вид</span>
                </TabsTrigger>
                {isAdmin && (
                  <>
                    <TabsTrigger value="admin" className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      <span>{isMobile ? "Пользователи" : "Управление пользователями"}</span>
                    </TabsTrigger>
                    <TabsTrigger value="moderation" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Модерация</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            )}
            <TabsContent value="username">
              <UsernameChange />
            </TabsContent>
            <TabsContent value="password">
              <PasswordChange />
            </TabsContent>
            <TabsContent value="appearance">
              <AppearanceSettings />
            </TabsContent>
            {isAdmin && (
              <>
                <TabsContent value="admin">
                  <div>
                    {!isMobile && (
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                        <UserCog className="h-5 w-5" />
                        Управление пользователями
                      </h3>
                    )}
                    <UserManagement />
                  </div>
                </TabsContent>
                <TabsContent value="moderation">
                  <div>
                    {!isMobile && (
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                        <FileText className="h-5 w-5" />
                        Модерация рецензий
                      </h3>
                    )}
                    <ReviewModeration />
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
