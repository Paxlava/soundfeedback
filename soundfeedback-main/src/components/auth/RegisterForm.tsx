import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; // Для валидации через zod
import * as z from "zod"; // Схема валидации
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { User, Lock, Mail, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { messages } from "@/lib/translations";
import { useState } from "react";

type RegisterFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptRules: boolean;
  isAdult: boolean;
};

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Определяем схему валидации с zod
  const formSchema = z
    .object({
      username: z.string().min(3, messages.form.username.minLength).max(50, messages.form.username.maxLength),
      email: z.string().email(messages.form.email.invalid),
      password: z.string().min(6, messages.form.password.minLength).max(50, "Пароль не должен превышать 50 символов").regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву").regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
      confirmPassword: z.string().min(6, messages.form.confirmPassword.minLength).max(50, "Пароль не должен превышать 50 символов").regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву").regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
      acceptTerms: z.boolean().refine((val) => val === true, {
        message: messages.form.acceptTerms.required,
      }),
      acceptRules: z.boolean().refine((val) => val === true, {
        message: "Необходимо принять правила сайта",
      }),
      isAdult: z.boolean().refine((val) => val === true, {
        message: "Вам должно быть не менее 18 лет",
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.form.confirmPassword.mismatch,
      path: ["confirmPassword"],
    });

  // Инициализируем форму с валидацией
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acceptRules: false,
      isAdult: false,
    },
    mode: "onChange", // Валидация в реальном времени при каждом изменении
  });

  // Кнопка активируется автоматически, когда форма валидна
  const isFormValid = form.formState.isValid;

  const handleSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя пользователя</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type="text" className="pl-9" placeholder="Введите имя пользователя" />
                </div>
              </FormControl>
              <FormMessage className="text-sm" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type="email" className="pl-9" placeholder="Введите email" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type="password" className="pl-9" placeholder="Введите пароль" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Подтвердите пароль</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type="password" className="pl-9" placeholder="Подтвердите пароль" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  Я принимаю{" "}
                  <Dialog>
                    <DialogTrigger asChild>
                      <span className="text-primary cursor-pointer hover:underline">лицензионное соглашение</span>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Лицензионное соглашение</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 text-sm py-4">
                        <h3 className="text-lg font-medium">ЛИЦЕНЗИОННОЕ СОГЛАШЕНИЕ ПОЛЬЗОВАТЕЛЯ</h3>
                        <p>Настоящее Лицензионное соглашение (далее — Соглашение) является юридически обязательным договором между вами (физическим или юридическим лицом) и владельцем данного сервиса.</p>
                        <Alert>
                          <AlertDescription>Внимательно прочитайте условия настоящего Соглашения перед регистрацией. Регистрируясь, вы подтверждаете свое согласие с условиями данного Соглашения.</AlertDescription>
                        </Alert>
                        <h4 className="font-medium">1. ПРЕДМЕТ СОГЛАШЕНИЯ</h4>
                        <p>1.1 Предметом настоящего Соглашения является право использования сервиса, предоставляемое владельцем сервиса на условиях простой (неисключительной) лицензии.</p>
                        <p>1.2 Все положения настоящего Соглашения распространяются на сервис в целом, а также на его отдельные компоненты.</p>
                        <h4 className="font-medium">2. АВТОРСКИЕ ПРАВА</h4>
                        <p>2.1 Сервис и все его компоненты являются объектами авторского права. Все права на сервис и его компоненты защищены законом.</p>
                        <p>2.2 Вы не имеете права копировать, модифицировать, распространять или иным образом использовать сервис, кроме случаев, прямо предусмотренных настоящим Соглашением.</p>
                        <h4 className="font-medium">3. ПРАВИЛА ИСПОЛЬЗОВАНИЯ</h4>
                        <p>3.1 Вы обязуетесь не использовать сервис для:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>нарушения прав третьих лиц;</li>
                          <li>распространения материалов, нарушающих законодательство;</li>
                          <li>размещения вредоносного ПО;</li>
                          <li>совершения действий, которые могут нарушить нормальную работу сервиса.</li>
                        </ul>
                        <h4 className="font-medium">4. ОТВЕТСТВЕННОСТЬ</h4>
                        <p>4.1 В случае нарушения условий настоящего Соглашения, администрация сервиса имеет право приостановить или прекратить ваш доступ к сервису.</p>
                        <p>4.2 Сервис предоставляется «как есть», без каких-либо гарантий.</p>
                        <h4 className="font-medium">5. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h4>
                        <p>5.1 Настоящее Соглашение вступает в силу с момента вашей регистрации на сервисе.</p>
                        <p>5.2 Администрация сервиса оставляет за собой право изменять условия настоящего Соглашения в одностороннем порядке.</p>
                      </div>
                      <DialogClose asChild>
                        <Button variant="outline" className="w-full">
                          Закрыть
                        </Button>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="acceptRules"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  Я принимаю{" "}
                  <Dialog>
                    <DialogTrigger asChild>
                      <span className="text-primary cursor-pointer hover:underline">правила сайта</span>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Правила сайта</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 text-sm py-4">
                        <h3 className="text-lg font-medium">ПРАВИЛА ПОЛЬЗОВАНИЯ САЙТОМ</h3>
                        <p>Настоящие Правила определяют условия использования сервиса SoundFeedback.</p>
                        <Alert>
                          <AlertDescription>Пожалуйста, внимательно ознакомьтесь с правилами перед использованием сайта. Регистрация на сайте означает ваше согласие с этими правилами.</AlertDescription>
                        </Alert>
                        <h4 className="font-medium">1. ОБЩИЕ ПОЛОЖЕНИЯ</h4>
                        <p>1.1 SoundFeedback — это сервис для публикации и обсуждения рецензий на музыкальные релизы.</p>
                        <p>1.2 Администрация оставляет за собой право изменять настоящие правила без предварительного уведомления.</p>
                        <h4 className="font-medium">2. ПРАВИЛА ПОВЕДЕНИЯ</h4>
                        <p>2.1 Пользователи обязуются:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Соблюдать культуру общения, уважать мнение других пользователей</li>
                          <li>Не использовать нецензурную лексику</li>
                          <li>Не размещать оскорбительный, дискриминационный или пропагандистский контент</li>
                          <li>Не размещать спам, рекламу, не относящуюся к музыке</li>
                          <li>Не размещать материалы, нарушающие авторские права</li>
                        </ul>
                        <h4 className="font-medium">3. РЕЦЕНЗИИ И КОММЕНТАРИИ</h4>
                        <p>3.1 Рецензии должны содержать развернутое мнение о релизе.</p>
                        <p>3.2 Плагиат и копирование чужих рецензий запрещены.</p>
                        <p>3.3 Администрация оставляет за собой право модерировать и отклонять рецензии, нарушающие правила.</p>
                        <h4 className="font-medium">4. ОТВЕТСТВЕННОСТЬ</h4>
                        <p>4.1 Пользователи несут полную ответственность за публикуемый контент.</p>
                        <p>4.2 За нарушение правил администрация может применить предупреждение, временный или постоянный бан.</p>
                        <h4 className="font-medium">5. КОНФИДЕНЦИАЛЬНОСТЬ</h4>
                        <p>5.1 Пользователи обязуются не распространять персональные данные других участников.</p>
                        <p>5.2 Администрация гарантирует защиту персональных данных в соответствии с политикой конфиденциальности.</p>
                      </div>
                      <DialogClose asChild>
                        <Button variant="outline" className="w-full">
                          Закрыть
                        </Button>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isAdult"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  Я подтверждаю, что мне исполнилось 18 лет
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={!isFormValid || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Регистрация...
            </>
          ) : (
            "Зарегистрироваться"
          )}
        </Button>
        <div className="text-sm text-center">
          <Link to="/login" className="text-primary hover:underline">
            Уже есть аккаунт? Войти
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default RegisterForm;
