import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Mail } from "lucide-react";
import LoginForm from "@/components/auth/LoginForm";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import VerificationForm from "@/components/auth/VerificationForm";
import { messages } from "@/lib/translations";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";

type LoginFormData = {
  email: string;
  password: string;
};

type ResetFormData = {
  email: string;
};

const Login = () => {
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [resetEmail, setResetEmail] = useState("");
  const { toast } = useToast();
  const { loading, user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.emailVerified) {
          navigate("/profile");
        } else {
          navigate("/verify-email");
        }
      }
    }
  }, [loading, user, navigate]);

  const startResendTimer = () => {
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
  };

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast({ title: "Успешно", description: messages.notifications.success.login });
      if (user?.emailVerified) {
        navigate("/profile");
      } else {
        navigate("/verify-email");
      }
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === "auth/requires-recent-login") return;

        const errorMap: Record<string, string> = {
          "auth/invalid-credential": messages.notifications.error.firebase.auth.invalidCredential,
          "auth/user-not-found": messages.notifications.error.firebase.auth.userNotFound,
          "auth/wrong-password": messages.notifications.error.firebase.auth.wrongPassword,
          "auth/too-many-requests": messages.notifications.error.firebase.auth.tooManyRequests,
        };

        toast({
          title: "Ошибка",
          description: errorMap[error.code] || messages.notifications.error.generic,
          variant: "destructive",
        });
      }
    }
  };

  const handleResetRequest = async (data: ResetFormData) => {
    try {
      await sendPasswordResetEmail(auth, data.email);
      setResetEmail(data.email);
      setIsVerifying(true);
      startResendTimer();
      toast({
        title: "Код отправлен",
        description: messages.notifications.success.emailSent,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResendCode = async () => {
    if (canResend && resetEmail) {
      try {
        await sendPasswordResetEmail(auth, resetEmail);
        startResendTimer();
        toast({
          title: "Код отправлен",
          description: messages.notifications.success.emailSent,
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

  const resetStates = () => {
    setIsResettingPassword(false);
    setIsVerifying(false);
    setResetEmail("");
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isVerifying ? (
              <>
                <Mail className="h-6 w-6" />
                Подтверждение Email
              </>
            ) : isResettingPassword ? (
              <>
                <Mail className="h-6 w-6" />
                Сброс пароля
              </>
            ) : (
              <>
                <LogIn className="h-6 w-6" />
                Вход в систему
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isVerifying ? <VerificationForm /> : isResettingPassword ? <ResetPasswordForm onSubmit={handleResetRequest} onBack={resetStates} canResend={canResend} countdown={countdown} /> : <LoginForm onSubmit={handleLogin} onForgotPassword={() => setIsResettingPassword(true)} />}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
