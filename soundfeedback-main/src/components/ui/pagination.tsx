import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Перейти на предыдущую страницу"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Перейти на следующую страницу"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">Больше страниц</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

interface UniversalPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isPaginationLoading?: boolean;
}

const UniversalPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  isPaginationLoading = false
}: UniversalPaginationProps) => {
  const isMobile = useIsMobile();

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4">
      <Pagination>
        {isMobile ? (
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={cn(
                  "px-2",
                  currentPage === 1 ? "pointer-events-none opacity-50" : "",
                  buttonVariants({ variant: "ghost", size: "sm" })
                )}
                aria-label="Предыдущая страница"
              >
                <ChevronLeft className="h-4 w-4" />
              </PaginationLink>
            </PaginationItem>

            <PaginationItem>
              <span className="text-sm p-2">
                {currentPage} из {totalPages}
              </span>
            </PaginationItem>

            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={cn(
                  "px-2",
                  currentPage === totalPages ? "pointer-events-none opacity-50" : "",
                  buttonVariants({ variant: "ghost", size: "sm" })
                )}
                aria-label="Следующая страница"
              >
                <ChevronRight className="h-4 w-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        ) : (
          <PaginationContent className="gap-3">
            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={cn(
                  "px-3 py-2",
                  currentPage === 1 ? "pointer-events-none opacity-50" : "",
                  buttonVariants({ variant: "ghost", size: "default" })
                )}
                aria-label="Предыдущая страница"
              >
                <ChevronLeft className="h-5 w-5" />
              </PaginationLink>
            </PaginationItem>

            {/* Умное отображение номеров страниц для ПК */}
            {(() => {
              const pages = [];
              
              // Всегда показываем первую страницу с более крупным размером
              pages.push(
                <PaginationItem key={1}>
                  <PaginationLink
                    onClick={() => onPageChange(1)}
                    isActive={currentPage === 1}
                    className={cn(
                      "px-3 py-2 font-semibold",
                      currentPage === 1 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                    )}
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
              );
              
              // Если текущая страница > 2, показываем многоточие
              if (currentPage > 2) {
                pages.push(
                  <PaginationItem key="ellipsis-start">
                    <PaginationEllipsis className="text-lg" />
                  </PaginationItem>
                );
              }
              
              // Показываем 3 страницы вокруг текущей (если возможно)
              for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => onPageChange(i)}
                      isActive={currentPage === i}
                      className={cn(
                        "px-3 py-2 font-semibold",
                        currentPage === i ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                      )}
                    >
                      {i}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              
              // Если текущая страница < последняя - 1, показываем многоточие
              if (currentPage < totalPages - 1) {
                pages.push(
                  <PaginationItem key="ellipsis-end">
                    <PaginationEllipsis className="text-lg" />
                  </PaginationItem>
                );
              }
              
              // Всегда показываем последнюю страницу с более крупным размером
              if (totalPages > 1) {
                pages.push(
                  <PaginationItem key={totalPages}>
                    <PaginationLink
                      onClick={() => onPageChange(totalPages)}
                      isActive={currentPage === totalPages}
                      className={cn(
                        "px-3 py-2 font-semibold",
                        currentPage === totalPages ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                      )}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              
              return pages;
            })()}

            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={cn(
                  "px-3 py-2",
                  currentPage === totalPages ? "pointer-events-none opacity-50" : "",
                  buttonVariants({ variant: "ghost", size: "default" })
                )}
                aria-label="Следующая страница"
              >
                <ChevronRight className="h-5 w-5" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        )}
      </Pagination>
    </div>
  );
};

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  UniversalPagination
}

