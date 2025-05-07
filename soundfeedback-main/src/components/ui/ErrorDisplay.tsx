import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Компонент для отображения ошибок с опциональной возможностью повторной загрузки данных
 * 
 * @param title - Заголовок сообщения об ошибке (по умолчанию "Ошибка загрузки")
 * @param message - Текст сообщения об ошибке
 * @param onRetry - Функция обратного вызова для повторной попытки (опционально)
 * @param retryLabel - Текст кнопки повтора (по умолчанию "Повторить загрузку")
 * @param className - Дополнительные классы для контейнера
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = "Ошибка загрузки",
  message,
  onRetry,
  retryLabel = "Повторить загрузку",
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-6 space-y-4 text-center ${className}`}>
      <Alert variant="destructive" className="max-w-md mx-auto">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      
      {onRetry && (
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={onRetry}
        >
          <RefreshCcw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
};

export default ErrorDisplay; 