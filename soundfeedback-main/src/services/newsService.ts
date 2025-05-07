import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { News } from "@/types/newsTypes";
import { SERVER_URL } from "@/lib/utils";

// Проверка типов файлов
const isValidImageFile = (file: File): boolean => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(file.name.toLowerCase().split(".").pop()!);
  const mimetype = filetypes.test(file.type);
  return extname && mimetype;
};

export const createNews = async (data: Omit<News, "id" | "createdAt">): Promise<string> => {
  try {
    const newsRef = await addDoc(collection(db, "news"), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return newsRef.id;
  } catch (error) {
    throw new Error("Не удалось создать новость в Firestore");
  }
};

export const uploadNewsImages = async (files: File[]): Promise<string[]> => {
  try {
    // Проверяем типы файлов перед отправкой
    const invalidFiles = files.filter((file) => !isValidImageFile(file));
    if (invalidFiles.length > 0) {
      throw new Error("Все файлы должны быть в формате JPEG или PNG");
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    const response = await fetch(`${SERVER_URL}/upload-news`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Не удалось загрузить изображения");
    }

    const data = await response.json();
    return data.imageUrls; // Теперь сервер возвращает imageUrls
  } catch (error) {
    throw error;
  }
};

export const getNews = async (): Promise<News[]> => {
  try {
    const newsSnapshot = await getDocs(collection(db, "news"));
    const newsList: News[] = newsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as News[];
    return newsList;
  } catch (error) {
    throw new Error("Не удалось загрузить новости");
  }
};

export const getNewsPaginated = async (
  page: number = 1,
  limit: number = 5
): Promise<{ news: News[]; total: number }> => {
  try {
    const newsSnapshot = await getDocs(collection(db, "news"));
    const allNews: News[] = newsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as News[];
    
    // Сортируем новости по дате создания (от новых к старым)
    allNews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Применяем пагинацию
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNews = allNews.slice(startIndex, endIndex);
    
    return {
      news: paginatedNews,
      total: allNews.length
    };
  } catch (error) {
    throw new Error("Не удалось загрузить новости");
  }
};

export const updateNews = async (id: string, data: Partial<News>, newFiles: File[], oldImageUrls: string[], deletedImages: string[] = []): Promise<string[]> => {
  try {
    // Удаляем указанные изображения из oldImageUrls
    let updatedImageUrls = oldImageUrls.filter((url) => !deletedImages.includes(url));

    // Загружаем новые изображения, если они есть
    if (newFiles.length > 0) {
      const newImageUrls = await uploadNewsImages(newFiles);
      updatedImageUrls = [...updatedImageUrls, ...newImageUrls];
    }

    // Удаляем изображения с сервера
    if (deletedImages.length > 0) {
      const response = await fetch(`${SERVER_URL}/delete-news`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: deletedImages }), // Обновляем на imageUrls
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Не удалось удалить изображения");
      }
    }

    // Обновляем данные в Firebase
    const newsRef = doc(db, "news", id);
    await updateDoc(newsRef, {
      ...data,
      imageUrls: updatedImageUrls,
    });

    return updatedImageUrls;
  } catch (error) {
    throw error;
  }
};

export const deleteNews = async (id: string, imageUrls: string[]): Promise<void> => {
  try {
    // Удаляем изображения с сервера
    if (imageUrls.length > 0) {
      const response = await fetch(`${SERVER_URL}/delete-news`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls }), // Обновляем на imageUrls
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Не удалось удалить изображения");
      }
    }

    // Удаляем новость из Firestore
    const newsRef = doc(db, "news", id);
    await deleteDoc(newsRef);
  } catch (error) {
    throw error;
  }
};

/**
 * Получение детальной информации о новости по ID
 * @param id ID новости
 * @returns Данные новости
 */
export const getNewsById = async (id: string): Promise<News> => {
  try {
    const newsRef = doc(db, "news", id);
    const newsDoc = await getDoc(newsRef);
    
    if (!newsDoc.exists()) {
      throw new Error("Новость не найдена");
    }
    
    return {
      id: newsDoc.id,
      ...newsDoc.data()
    } as News;
  } catch (error) {
    console.error("Ошибка при получении новости:", error);
    throw new Error("Не удалось загрузить новость");
  }
};
