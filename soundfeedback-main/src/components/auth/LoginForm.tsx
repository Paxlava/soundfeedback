import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, Lock } from "lucide-react"; // Меняем иконку с User на Mail
import { Link } from "react-router-dom";

type LoginFormData = {
  email: string; // Меняем username на email
  password: string;
};

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  onForgotPassword: () => void;
}

const LoginForm = ({ onSubmit, onForgotPassword }: LoginFormProps) => {
  const form = useForm<LoginFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type="email" className="pl-9" required />
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
                  <Input {...field} type="password" className="pl-9" required />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Войти
        </Button>
        <div className="flex justify-between text-sm">
          <Link to="/register" className="text-primary hover:underline">
            Создать аккаунт
          </Link>
          <Button variant="link" className="p-0 h-auto" type="button" onClick={onForgotPassword}>
            Забыли пароль?
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LoginForm;
