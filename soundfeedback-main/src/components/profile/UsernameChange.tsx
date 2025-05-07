import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Lock, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebaseConfig";
import { reauthenticateUser, updateUsername } from "@/services/authService";
import { messages } from "@/lib/translations";
import { FirebaseError } from "firebase/app";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

type UsernameChangeForm = {
  newUsername: string;
  password: string;
};

interface UsernameChangeProps {
  onSuccess?: () => void;
}

const UsernameChange = ({ onSuccess }: UsernameChangeProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, refreshUserData } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const form = useForm<UsernameChangeForm>({
    defaultValues: {
      newUsername: "",
      password: "",
    },
    mode: "onChange",
  });

  const usernamePattern = /^[a-zA-Zа-яА-Я0-9_-]+$/; // Разрешены только латиница, кириллица, цифры, _ и -

  const onSubmit = async (data: UsernameChangeForm) => {
    if (!user || !auth.currentUser) {
      toast({
        title: "Ошибка",
        description: "Пользователь не авторизован",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Реаутентификация пользователя
      await reauthenticateUser(auth.currentUser, data.password);

      // Обновление имени пользователя
      await updateUsername(auth.currentUser, data.newUsername);

      // Обновляем данные пользователя в контексте
      await refreshUserData();

      toast({
        title: "Успех",
        description: "Имя пользователя успешно изменено",
      });

      form.reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        toast({
          title: "Ошибка",
          description: messages.notifications.error.firebase.auth.wrongPassword,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка",
          description: error.message || "Не удалось изменить имя пользователя",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isMobile && (
        <div className="mb-4">
          <div className="flex flex-col space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Текущее имя пользователя</h2>
            <div className="flex items-center">
              <Badge variant="outline" className="text-xs py-1 px-2">
                <User className="h-3 w-3 mr-1" />
                {user?.displayName || "Не задано"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="newUsername"
            rules={{
              required: "Имя пользователя обязательно",
              minLength: {
                value: 3,
                message: "Мин. 3 символа",
              },
              maxLength: {
                value: 20,
                message: "Макс. 20 символов",
              },
              pattern: {
                value: usernamePattern,
                message: "Только буквы, цифры, _ и -",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isMobile ? "text-xs" : ""}>Новое имя пользователя</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      {...field} 
                      className="pl-9"
                      placeholder="Введите новое имя" 
                      size={isMobile ? 18 : undefined}
                    />
                  </div>
                </FormControl>
                <FormMessage className={isMobile ? "text-xs" : ""} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            rules={{
              required: "Пароль обязателен",
              minLength: {
                value: 6,
                message: "Мин. 6 символов",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isMobile ? "text-xs" : ""}>Текущий пароль</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      {...field} 
                      type="password" 
                      className="pl-9"
                      placeholder="Введите пароль" 
                      size={isMobile ? 18 : undefined}
                    />
                  </div>
                </FormControl>
                <FormMessage className={isMobile ? "text-xs" : ""} />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !form.formState.isValid}
            size={isMobile ? "sm" : "default"}
          >
            {isLoading ? "Изменение..." : isMobile ? "Изменить имя" : "Изменить имя пользователя"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default UsernameChange;
