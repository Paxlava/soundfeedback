import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "./hooks/useAuth";
import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "./components/Navigation";
import { ThemeProvider } from "./contexts/ThemeContext";

// Компоненты и страницы
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import TermsOfService from "./pages/TermsOfService";
import AdminCreateReview from "./pages/AdminCreateReview";
import UserCreateReview from "./pages/UserCreateReview";
import VerifyEmail from "./pages/VerifyEmail";
import ReviewDetail from "./pages/ReviewDetail";
import CreateNews from "./pages/CreateNews";
import { getUserReviewsWithStatusChanges, markReviewAsRead } from "./services/reviewNotificationService";
import { Review } from "./types/reviewTypes";
import { AuthorProvider } from "./contexts/AuthorContext";
import { EnumRole } from "@/enums/role";
import TestNewsAuthor from "./pages/TestNewsAuthor";
import UserReviews from "./pages/UserReviews";
import AdminReviews from "./pages/AdminReviews";
import SubscriptionsReviews from "./pages/SubscriptionsReviews";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import PublicProfile from "./pages/PublicProfile";
import Users from "./pages/Users";
import UserRelationshipsPage from "./pages/UserRelationshipsPage";

// Создаем экземпляр QueryClient
const queryClient = new QueryClient();

// Компонент защищенного маршрута
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== EnumRole.ADMIN) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

const App = () => {
  const { user } = useAuth();
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Получаем рецензии пользователя с изменением статуса
  useEffect(() => {
    const fetchUserReviews = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const reviews = await getUserReviewsWithStatusChanges(user.uid);
        setUserReviews(reviews);
      } catch (error) {
        console.error("Ошибка при получении рецензий:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserReviews();
  }, [user]);

  const handleReviewRead = (reviewId: string) => {
    if (user) {
      markReviewAsRead(reviewId);
      setUserReviews(prev => prev.filter(review => review.id !== reviewId));
    }
  };

  return (
    <ThemeProvider>
      <AuthorProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BrowserRouter>
              <div className="min-h-screen bg-background text-foreground">
                <Navigation />
                <main className="container mx-auto p-4 min-h-screen">
                  <Routes>
                    {/* Публичные маршруты */}
                    <Route path="/" element={<Home />} />
                    <Route path="/review/:id" element={<ReviewDetail />} />
                    <Route path="/news" element={<News />} />
                    <Route path="/news/:id" element={<NewsDetail />} />
                    <Route path="/reviews" element={<UserReviews />} />
                    <Route path="/admin-reviews" element={<AdminReviews />} />
                    <Route path="/user/:username" element={<PublicProfile />} />
                    <Route path="/profile/:username" element={<PublicProfile />} />
                    <Route path="/users" element={<Users />} />
                    
                    {/* Тестовый маршрут для демонстрации кеширования авторов */}
                    <Route path="/test-authors" element={<TestNewsAuthor />} />

                    {/* Маршруты только для админов */}
                    <Route
                      path="/admin/create-review"
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <AdminCreateReview />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/create-news"
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <CreateNews />
                        </ProtectedRoute>
                      }
                    />

                    {/* Маршруты для авторизованных пользователей */}
                    <Route
                      path="/create-review"
                      element={
                        <ProtectedRoute>
                          <UserCreateReview />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/subscription-reviews"
                      element={
                        <ProtectedRoute>
                          <SubscriptionsReviews />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/terms"
                      element={
                        <ProtectedRoute>
                          <TermsOfService />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />

                    {/* Маршруты аутентификации */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />

                    {/* Маршруты для подписчиков и подписок */}
                    <Route path="/subscribers" element={
                      <ProtectedRoute>
                        <UserRelationshipsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/subscribers/:userId" element={<UserRelationshipsPage />} />
                    <Route path="/subscriptions-list" element={
                      <ProtectedRoute>
                        <UserRelationshipsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/subscriptions/:userId" element={<UserRelationshipsPage />} />
                    
                    {/* Перенаправление со старого пути на новый */}
                    <Route path="/subscriptions" element={<Navigate to="/subscriptions-list" replace />} />
                  </Routes>
                </main>
                <Toaster />
                <Sonner />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthorProvider>
    </ThemeProvider>
  );
};

export default App;
