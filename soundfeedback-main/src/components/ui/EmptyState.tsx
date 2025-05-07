import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Компонент для отображения пустого состояния списков или отсутствия данных
 * 
 * @param icon - Иконка Lucide для отображения (опционально)
 * @param title - Заголовок пустого состояния
 * @param description - Описание пустого состояния (опционально)
 * @param actionLabel - Текст кнопки действия (опционально)
 * @param onAction - Функция обратного вызова для действия (опционально)
 * @param className - Дополнительные классы для контейнера
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div className={`bg-muted/20 rounded-lg p-8 text-center ${className}`}>
      {Icon && <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />}
      
      <p className="text-lg font-medium text-foreground mb-2">{title}</p>
      
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      
      {actionLabel && onAction && (
        <Button 
          variant="outline" 
          onClick={onAction}
          className="mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState; 