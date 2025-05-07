import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Mail } from "lucide-react";

interface VerificationFormProps {
  otp: string;
  setOtp: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  canResend: boolean;
  countdown: number;
  email?: string;
  maxLenght?: number;
}

const VerificationForm = ({ otp, setOtp, onVerify, onResend, onBack, canResend, countdown, email, maxLenght = 6 }: VerificationFormProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Mail className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-semibold">Проверьте вашу почту</h2>
        <p className="text-muted-foreground">
          {email ? (
            <>
              Мы отправили код подтверждения на <br />
              <span className="font-medium text-foreground">{email}</span>
            </>
          ) : (
            "Введите код подтверждения, отправленный на ваш email"
          )}
        </p>
      </div>

      <div className="flex justify-center">
        {/* <InputOTP
          maxLength={6}
          value={otp}
          onChange={(value) => setOtp(value)}
          containerClassName="group flex items-center has-[:disabled]:opacity-50"
          render={({ slots }) => (
            <InputOTPGroup className="gap-2">
              {slots.map((slot, index) => (
                <InputOTPSlot
                  key={index}
                  {...slot}
                  index={index}
                  className="w-12 h-12 text-center text-2xl border-2 rounded-md focus:border-primary focus:ring-2 focus:ring-primary text-white" // Changed to white text on black backgroud
                />
              ))}
            </InputOTPGroup>
          )}
        /> */}
        <InputOTP maxLength={maxLenght} value={otp} onChange={(value) => setOtp(value)} containerClassName="group flex items-center has-[:disabled]:opacity-50">
          <InputOTPGroup className="flex flex-row gap-2">
            {Array.from({ length: maxLenght }, (_, index) => (
              <InputOTPSlot key={index} index={index} className="w-12 h-12 text-center text-2xl border-2 rounded-md focus:border-primary focus:ring-2 focus:ring-primary" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="space-y-2">
        <Button onClick={onVerify} className="w-full" disabled={otp.length !== 6}>
          Подтвердить код
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          {canResend ? (
            <Button variant="link" className="p-0 h-auto" onClick={onResend}>
              Отправить код повторно
            </Button>
          ) : (
            <span>Повторная отправка через {countdown}с</span>
          )}
        </div>

        <Button variant="ghost" className="w-full" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
      </div>
    </div>
  );
};

export default VerificationForm;
