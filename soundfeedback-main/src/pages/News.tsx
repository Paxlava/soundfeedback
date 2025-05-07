import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import NewsItem from "@/components/news/NewsItem";
import NewsEditDialog from "@/components/news/NewsEditDialog";
import { getNewsPaginated, updateNews, deleteNews } from "@/services/newsService";
import { News } from "@/types/newsTypes";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, UniversalPagination } from "@/components/ui/pagination";
import { EnumRole } from "@/enums/role";
import Loader from "@/components/Loader";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const ITEMS_PER_PAGE = 5;

// Компонент для отображения многоточия
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
    <span className="sr-only">More pages</span>
  </span>
);

const NewsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [news, setNews] = useState<News[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsPaginationLoading(true);
        const result = await getNewsPaginated(currentPage, ITEMS_PER_PAGE);
        setNews(result.news);
        setTotalItems(result.total);
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: error.message || "Не удалось загрузить новости",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setIsPaginationLoading(false);
      }
    };

    fetchNews();
  }, [toast, currentPage]);

  const handleEdit = (newsItem: News) => {
    setEditingNews(newsItem);
    setShowEditDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Вы уверены, что хотите удалить эту новость?")) {
      try {
        const newsItem = news.find((item) => item.id === id);
        if (newsItem) {
          await deleteNews(id, newsItem.imageUrls);
          // После удаления обновляем список новостей
          const result = await getNewsPaginated(currentPage, ITEMS_PER_PAGE);
          setNews(result.news);
          setTotalItems(result.total);
          
          toast({
            title: "Успех",
            description: "Новость успешно удалена",
          });
        }
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: error.message || "Не удалось удалить новость",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveEdit = async (title: string, text: string, newFiles: File[], deletedImages: string[]) => {
    if (!editingNews) return;

    try {
      const updatedData: Partial<News> = { title, text };
      const updatedImageUrls = await updateNews(editingNews.id!, updatedData, newFiles, editingNews.imageUrls, deletedImages);

      // Обновляем список новостей после редактирования
      const result = await getNewsPaginated(currentPage, ITEMS_PER_PAGE);
      setNews(result.news);
      
      toast({
        title: "Успех",
        description: "Новость успешно обновлена",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить новость",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className={`space-y-6 ${isMobile ? 'mx-auto px-2' : 'max-w-4xl mx-auto'}`}>
      {isMobile && (
        <h1 className="text-2xl font-bold mb-4 px-2 text-center">
          Новости
        </h1>
      )}
      
      {news.length === 0 ? (
        <p className="text-center">Новостей пока нет.</p>
      ) : (
        news.map((newsItem) => (
          <NewsItem
            key={newsItem.id}
            news={newsItem}
            isAdmin={user?.role === EnumRole.ADMIN}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))
      )}

      {totalPages > 1 && (
        <UniversalPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          isPaginationLoading={isPaginationLoading}
        />
      )}

      {editingNews && (
        <NewsEditDialog
          news={editingNews}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default NewsPage;