import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { Loader2, Lock } from "lucide-react";
import { messages } from "@/lib/translations";
import { useAuth } from "@/hooks/useAuth";
import VerificationForm from "@/components/auth/VerificationForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Пароль должен содержать минимум 6 символов").max(50, "Пароль не должен превышать 50 символов").regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву").regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, refreshUserData } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    const code = urlParams.get("oobCode");

    setOobCode(code);

    if (loading) return;

    // Если пользователь уже подтвердил email, перенаправляем на профиль
    if (user?.emailVerified) {
      navigate("/profile");
      return;
    }

    // Если нет mode, значит это страница ожидания подтверждения
    if (!mode) {
      if (!user) {
        navigate("/login");
      }
      return;
    }

    // Обработка действий с кодом подтверждения
    if (!code) {
      toast({
        title: "Ошибка",
        description: "Код действия отсутствует.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (mode === "verifyEmail") {
      setIsProcessing(true);
      applyActionCode(auth, code)
        .then(async () => {
          if (auth.currentUser) {
            await auth.currentUser.reload();
            await refreshUserData();
            toast({
              title: "Успех",
              description: messages.notifications.success.emailVerified,
            });
            navigate("/profile");
          }
        })
        .catch((error) => {
          toast({
            title: "Ошибка",
            description: messages.notifications.error.firebase.auth.invalidActionCode,
            variant: "destructive",
          });
          setShowVerificationForm(true);
        })
        .finally(() => {
          setIsProcessing(false);
        });
    } else if (mode === "resetPassword") {
      setIsProcessing(true);
      verifyPasswordResetCode(auth, code)
        .then(() => {
          setShowResetPasswordForm(true);
        })
        .catch((error) => {
          toast({
            title: "Ошибка",
            description: messages.notifications.error.firebase.auth.invalidActionCode,
            variant: "destructive",
          });
          navigate("/login");
        })
        .finally(() => {
          setIsProcessing(false);
        });
    } else {
      toast({
        title: "Ошибка",
        description: "Недопустимое действие.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [navigate, toast, user, loading, refreshUserData]);

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    if (!oobCode) {
      toast({
        title: "Ошибка",
        description: "Код для сброса пароля отсутствует.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await confirmPasswordReset(auth, oobCode, data.newPassword);
      toast({
        title: "Успех",
        description: "Пароль успешно изменён. Теперь вы можете войти с новым паролем.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при сбросе пароля.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || isProcessing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" />
        <h1 className="text-xl">{showResetPasswordForm ? "Сброс пароля..." : "Проверка электронной почты..."}</h1>
      </div>
    );
  }

  // Если нет mode и пользователь не подтвердил email, показываем страницу ожидания
  if (!oobCode && user && !user.emailVerified) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <VerificationForm />
      </div>
    );
  }

  if (showVerificationForm) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <VerificationForm />
      </div>
    );
  }

  if (showResetPasswordForm) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Сброс пароля</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Новый пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="password" className="pl-9" {...form.register("newPassword")} />
                </div>
                {form.formState.errors.newPassword && <p className="text-sm text-red-500 mt-1">{form.formState.errors.newPassword.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Подтвердите пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="password" className="pl-9" {...form.register("confirmPassword")} />
                </div>
                {form.formState.errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{form.formState.errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing || !form.formState.isValid}>
                {isProcessing ? "Сохранение..." : "Сохранить новый пароль"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default VerifyEmail;
