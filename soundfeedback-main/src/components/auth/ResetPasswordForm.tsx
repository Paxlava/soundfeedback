import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

// Схема валидации с помощью zod
const resetFormSchema = z.object({
  email: z.string().email({ message: "Введите корректный email" }).min(1, { message: "Email обязателен" }),
});

type ResetFormData = z.infer<typeof resetFormSchema>;

interface ResetPasswordFormProps {
  onSubmit?: (data: ResetFormData) => void; // Сделаем onSubmit опциональным, так как мы сами обработаем отправку
  onBack: () => void;
  canResend: boolean;
  countdown: number;
}

const ResetPasswordForm = ({ onBack, canResend, countdown }: ResetPasswordFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Инициализация формы с валидацией
  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: {
      email: "",
    },
  });

  // Обработчик отправки формы
  const handleSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: "Успех",
        description: "Письмо с инструкциями по сбросу пароля отправлено на ваш email.",
      });
      form.reset(); // Сбрасываем форму после успешной отправки
    } catch (error: any) {
      console.error("Ошибка при отправке письма для сброса пароля:", error);
      let errorMessage = "Произошла ошибка при отправке письма. Попробуйте снова.";

      // Обработка специфичных ошибок Firebase
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "Пользователь с таким email не найден.";
          break;
        case "auth/invalid-email":
          errorMessage = "Некорректный email.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Слишком много запросов. Пожалуйста, подождите.";
          break;
        default:
          errorMessage = error.message || errorMessage;
      }

      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type="email" className="pl-9" placeholder="Введите ваш email" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading || !canResend}>
          {isLoading ? "Отправка..." : canResend ? "Отправить инструкции" : `Повторная отправка через ${countdown}с`}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Вернуться к входу
        </Button>
      </form>
    </Form>
  );
};

export default ResetPasswordForm;
