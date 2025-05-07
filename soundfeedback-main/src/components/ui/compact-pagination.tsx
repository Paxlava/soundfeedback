import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface CompactPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const CompactPagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: CompactPaginationProps) => {
  const isMobile = useIsMobile();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center my-4">
      <div className="inline-flex items-center border border-input rounded-md">
        {/* Кнопка "Предыдущая страница" */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={cn(
            "p-2 border-r border-input",
            currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
          )}
          aria-label="Предыдущая страница"
        >
          &lt;
        </button>

        {/* Отображение номеров страниц */}
        {(() => {
          const items = [];
          const maxVisiblePages = isMobile ? 3 : 5;
          
          // Логика для определения диапазона отображаемых страниц
          let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
          
          if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
          }
          
          // Добавляем первую страницу
          if (startPage > 1) {
            items.push(
              <button
                key={1}
                onClick={() => onPageChange(1)}
                className={cn(
                  "px-3 py-2 border-r border-input",
                  currentPage === 1 ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent"
                )}
              >
                1
              </button>
            );
            
            // Добавляем многоточие после первой страницы, если нужно
            if (startPage > 2) {
              items.push(
                <span key="ellipsis-start" className="px-2 py-2 border-r border-input">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              );
            }
          }
          
          // Добавляем промежуточные страницы
          for (let i = startPage; i <= endPage; i++) {
            if (i !== 1 && i !== totalPages) {
              items.push(
                <button
                  key={i}
                  onClick={() => onPageChange(i)}
                  className={cn(
                    "px-3 py-2 border-r border-input",
                    currentPage === i ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent"
                  )}
                >
                  {i}
                </button>
              );
            }
          }
          
          // Добавляем многоточие перед последней страницей, если нужно
          if (endPage < totalPages - 1) {
            items.push(
              <span key="ellipsis-end" className="px-2 py-2 border-r border-input">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }
          
          // Добавляем последнюю страницу
          if (endPage < totalPages) {
            items.push(
              <button
                key={totalPages}
                onClick={() => onPageChange(totalPages)}
                className={cn(
                  "px-3 py-2 border-r border-input",
                  currentPage === totalPages ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent"
                )}
              >
                {totalPages}
              </button>
            );
          }
          
          return items;
        })()}

        {/* Кнопка "Следующая страница" */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={cn(
            "p-2",
            currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
          )}
          aria-label="Следующая страница"
        >
          &gt;
        </button>
      </div>
    </div>
  );
}; 