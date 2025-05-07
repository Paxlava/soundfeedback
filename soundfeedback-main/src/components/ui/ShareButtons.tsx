import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface ShareButtonsProps {
  url: string;
  title: string;
  className?: string;
  variant?: "default" | "outline" | "ghost"; // варианты стилей кнопок
  size?: "default" | "sm" | "lg" | "icon"; // размеры кнопок
}

const ShareButtons: React.FC<ShareButtonsProps> = ({
  url,
  title,
  className,
  variant = "outline",
  size = "icon"
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Абсолютный URL для шаринга
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  
  // Функция копирования ссылки
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({
        title: "Ссылка скопирована",
        description: "Ссылка успешно скопирована в буфер обмена",
      });
      
      // Сбрасываем состояние через 2 секунды
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("flex items-center", className)}>
      <TooltipProvider>
        {/* Кнопка копирования ссылки */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={copyToClipboard}
              className="focus:outline-none"
              aria-label="Копировать ссылку"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Скопировано!" : "Копировать ссылку"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default ShareButtons; 