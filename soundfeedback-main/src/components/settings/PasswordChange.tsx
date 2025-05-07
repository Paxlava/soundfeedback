import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebaseConfig";
import { reauthenticateUser, updateUserPassword } from "@/services/authService";
import { useIsMobile } from "@/hooks/use-mobile";

type PasswordChangeForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const PasswordChange = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const form = useForm<PasswordChangeForm>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/; // Минимум 8 символов, хотя бы одна буква и одна цифра

  const onSubmit = async (data: PasswordChangeForm) => {
    if (!user || !auth.currentUser) {
      toast({
        title: "Ошибка",
        description: "Пользователь не авторизован",
        variant: "destructive",
      });
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Реаутентификация пользователя
      await reauthenticateUser(auth.currentUser, data.currentPassword);

      // Обновление пароля
      await updateUserPassword(auth.currentUser, data.newPassword);

      toast({
        title: "Успешно",
        description: "Пароль успешно изменён",
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить пароль",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          rules={{
            required: "Текущий пароль обязателен",
            minLength: {
              value: 6,
              message: "Пароль должен содержать минимум 6 символов",
            },
          }}
          render={({ field }) => (
            <FormItem className={isMobile ? "space-y-2" : "space-y-3"}>
              <FormLabel className={isMobile ? "text-sm" : ""}>Текущий пароль</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className={`absolute left-3 ${isMobile ? 'top-2.5' : 'top-3'} h-4 w-4 text-muted-foreground`} />
                  <Input {...field} type="password" className={`pl-9 ${isMobile ? 'h-9 text-sm' : ''}`} />
                </div>
              </FormControl>
              <FormMessage className={isMobile ? "text-xs" : ""} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          rules={{
            required: "Новый пароль обязателен",
            pattern: {
              value: passwordPattern,
              message: "Пароль должен содержать минимум 6 символов, хотя бы одну букву и одну цифру",
            },
          }}
          render={({ field }) => (
            <FormItem className={isMobile ? "space-y-2" : "space-y-3"}>
              <FormLabel className={isMobile ? "text-sm" : ""}>Новый пароль</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className={`absolute left-3 ${isMobile ? 'top-2.5' : 'top-3'} h-4 w-4 text-muted-foreground`} />
                  <Input {...field} type="password" className={`pl-9 ${isMobile ? 'h-9 text-sm' : ''}`} />
                </div>
              </FormControl>
              <FormMessage className={isMobile ? "text-xs" : ""} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          rules={{
            required: "Подтверждение пароля обязательно",
            validate: (value) => value === form.getValues("newPassword") || "Пароли не совпадают",
          }}
          render={({ field }) => (
            <FormItem className={isMobile ? "space-y-2" : "space-y-3"}>
              <FormLabel className={isMobile ? "text-sm" : ""}>Подтвердите новый пароль</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className={`absolute left-3 ${isMobile ? 'top-2.5' : 'top-3'} h-4 w-4 text-muted-foreground`} />
                  <Input {...field} type="password" className={`pl-9 ${isMobile ? 'h-9 text-sm' : ''}`} />
                </div>
              </FormControl>
              <FormMessage className={isMobile ? "text-xs" : ""} />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          size={isMobile ? "sm" : "default"}
          disabled={isLoading || !form.formState.isValid}
        >
          {isLoading ? "Изменение..." : isMobile ? "Изменить" : "Изменить пароль"}
        </Button>
      </form>
    </Form>
  );
};

export default PasswordChange;
