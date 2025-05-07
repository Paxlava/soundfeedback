import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";
import RegisterForm from "@/components/auth/RegisterForm";
import { messages } from "@/lib/translations";
import { auth } from "@/lib/firebaseConfig";
import { applyActionCode } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/utils";

type RegisterFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptRules: boolean;
  isAdult: boolean;
};

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { register, user } = useAuth();

  const handleSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      toast({
        title: "Ошибка",
        description: messages.notifications.error.passwordMismatch,
        variant: "destructive",
      });
      return;
    }

    try {
      await register({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      toast({
        title: "Ссылка для подтверждения отправлена",
        description: messages.notifications.success.emailSent,
      });
      navigate("/verify-email");
    } catch (error: any) {
      logger.error("Ошибка при регистрации:", error);
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Произошла ошибка при регистрации. Пожалуйста, попробуйте еще раз.",
        variant: "destructive",
      });
      // Остаемся на странице регистрации
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get("oobCode");

    if (oobCode) {
      applyActionCode(auth, oobCode)
        .then(async () => {
          if (auth.currentUser) {
            await auth.currentUser.reload();
            toast({
              title: "Email подтвержден",
              description: "Вы будете перенаправлены...",
            });
            navigate("/profile");
          }
        })
        .catch((error) => {
          toast({
            title: "Ошибка",
            description: error.message,
            variant: "destructive",
          });
        });
    }
  }, [navigate, toast]);

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6" />
            Регистрация
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
