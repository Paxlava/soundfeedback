import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Mail, User } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const VerificationForm = () => {
  const { user, resendVerificationEmail } = useAuth();
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Функция запуска таймера
  const startResendTimer = useCallback(() => {
    setCanResend(false);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Обработчик повторной отправки письма
  const handleResendCode = async () => {
    if (canResend) {
      try {
        await resendVerificationEmail();
        startResendTimer();
        toast({
          title: "Ссылка для подтверждения отправлена",
          description: "Проверьте вашу почту",
        });
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  // Автоматическая проверка статуса верификации
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (user && !user.emailVerified) {
      interval = setInterval(async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.reload();
          if (currentUser.emailVerified) {
            toast({
              title: "Успешно",
              description: "Email подтвержден",
            });
            navigate("/profile");
            if (interval) clearInterval(interval);
          }
        }
      }, 3000); // Проверка каждые 3 секунды
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, navigate, toast]);

  // Запуск таймера при монтировании компонента
  useEffect(() => {
    startResendTimer();
  }, [startResendTimer]);

  // Обработчик возврата на предыдущую страницу
  const handleBack = () => {
    navigate("/register");
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Mail className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-2xl font-semibold">Проверьте вашу почту</h2>
            <p className="text-muted-foreground">
              {user?.email ? (
                <>
                  Мы отправили ссылку для подтверждения на <br />
                  <span className="font-medium text-foreground">{user.email}</span>
                </>
              ) : (
                "Пожалуйста, проверьте вашу почту для получения ссылки подтверждения и перейдите по ней."
              )}
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-center text-sm text-muted-foreground">
              {canResend ? (
                <Button variant="link" className="p-0 h-auto" onClick={handleResendCode}>
                  Отправить ссылку повторно
                </Button>
              ) : (
                <span>Повторная отправка через {countdown}с</span>
              )}
            </div>

            <Button variant="ghost" className="w-full" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerificationForm;
