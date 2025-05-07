import { db } from "@/lib/firebaseConfig";
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, where, getDocs, query, DocumentData, orderBy, limit, startAfter, increment } from "firebase/firestore";
import { EnumStatus, EnumStatusType } from "@/enums/status";
import { EnumRoleType } from "@/enums/role";
import { ReviewData, Review, AlbumData } from "@/types/reviewTypes";
import { UserData } from "@/types/userTypes";
import { SERVER_URL } from "@/lib/utils";

// Проверка данных рецензии
const isValidReviewData = (data: DocumentData): data is ReviewData => {
  return (
    typeof data.albumId === "string" &&
    typeof data.userId === "string" &&
    typeof data.rating === "string" &&
    (["RECOMMEND", "NEUTRAL", "NOT_RECOMMEND"] as string[]).includes(data.rating) &&
    typeof data.reviewText === "string" &&
    typeof data.status === "string" &&
    (Object.values(EnumStatus) as string[]).includes(data.status) &&
    typeof data.createdAt === "string"
  );
};

// Сохранение альбома
export const saveAlbum = async (albumData: AlbumData): Promise<void> => {
  try {
    const albumRef = doc(db, "albums", albumData.albumId);
    await setDoc(albumRef, { ...albumData, createdAt: new Date().toISOString() });
  } catch (error) {
    throw new Error("Не удалось сохранить альбом в Firestore");
  }
};

// Получение альбома
export const getAlbum = async (albumId: string): Promise<AlbumData | null> => {
  try {
    const albumRef = doc(db, "albums", albumId);
    const albumDoc = await getDoc(albumRef);
    return albumDoc.exists() ? (albumDoc.data() as AlbumData) : null;
  } catch (error) {
    throw new Error("Не удалось загрузить альбом из Firestore");
  }
};

// Сохранение рецензии
export const saveReview = async (reviewData: ReviewData): Promise<string> => {
  console.log("Сохраняем рецензию с данными:", reviewData);
  try {
    const reviewRef = await addDoc(collection(db, "reviews"), {
      ...reviewData,
      status: reviewData.status,
      customCoverUrl: reviewData.customCoverUrl,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      uniqueViews: 0,
      likedBy: [],
      dislikedBy: [],
    });
    return reviewRef.id;
  } catch (error) {
    throw new Error(`Не удалось сохранить рецензию в Firestore: ${reviewData}`);
  }
};

// Обновление статуса рецензии
export const updateReviewStatus = async (
  reviewId: string, 
  status: EnumStatusType, 
  rejectReason?: string, 
  moderationComment?: string
): Promise<void> => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const updateData: Partial<ReviewData> = { status };
    
    if (status === EnumStatus.REJECTED) {
      if (rejectReason) {
        updateData.rejectReason = rejectReason;
      }
      if (moderationComment) {
        updateData.moderationComment = moderationComment;
      }
    }
    
    await updateDoc(reviewRef, updateData);
  } catch (error) {
    throw new Error("Не удалось обновить статус рецензии");
  }
};

// Получение всех рецензий
export const getReviews = async (status: EnumStatusType = EnumStatus.PENDING, reviewType: "user" | "admin" | "all" = "all"): Promise<Review[]> => {
  try {
    console.log(`Запрос рецензий со статусом: ${status}, тип: ${reviewType}`);
    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("status", "==", status));
    const querySnapshot = await getDocs(q);
    const reviews: Review[] = [];

    for (const reviewDoc of querySnapshot.docs) {
      const data = reviewDoc.data();
      if (isValidReviewData(data)) {
        const albumDoc = await getDoc(doc(db, "albums", data.albumId));
        const albumData = albumDoc.exists() ? (albumDoc.data() as AlbumData) : null;

        const userDoc = await getDoc(doc(db, "users", data.userId));
        const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;
        const userRole = userData?.role || "USER" as EnumRoleType;
        
        console.log(`Рецензия ${reviewDoc.id}, автор: ${userData?.username}, роль: ${userRole}`);

        // Фильтрация по типу рецензии (админская/пользовательская)
        if (reviewType === "admin" && userRole !== ("ADMIN" as EnumRoleType)) {
          console.log(`Пропускаем рецензию ${reviewDoc.id}: не от администратора`);
          continue;
        }
        if (reviewType === "user" && userRole === ("ADMIN" as EnumRoleType)) {
          console.log(`Пропускаем рецензию ${reviewDoc.id}: от администратора`);
          continue;
        }

        reviews.push({
          id: reviewDoc.id,
          artist: albumData?.artist || "Неизвестный артист",
          album: albumData?.title || "Неизвестный альбом",
          type: albumData?.type || "album",
          rating: data.rating,
          yandexMusicId: albumData?.albumId || "",
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          views: data.uniqueViews || 0,
          content: data.reviewText,
          date: new Date(data.createdAt).toLocaleDateString("ru-RU"),
          createdAt: data.createdAt,
          coverUrl: albumData?.coverUrl || "/placeholder.svg",
          authorId: data.userId,
          author: userData?.username || "Неизвестный автор", // Используем username из UserData
          likedBy: data.likedBy || [],
          dislikedBy: data.dislikedBy || [],
          status: data.status,
          rejectReason: data.rejectReason,
          customCoverUrl: data.customCoverUrl,
        });
      }
    }

    console.log(`Найдено ${reviews.length} подходящих рецензий`);
    return reviews;
  } catch (error) {
    console.error("Ошибка при загрузке рецензий:", error);
    throw new Error("Не удалось загрузить рецензии из Firestore");
  }
};

// Получение рецензий пользователя
export const getUserReviews = async (userId: string): Promise<Review[]> => {
  try {
    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const reviews: Review[] = [];

    for (const reviewDoc of querySnapshot.docs) {
      const data = reviewDoc.data();
      if (isValidReviewData(data)) {
        const albumDoc = await getDoc(doc(db, "albums", data.albumId));
        const albumData = albumDoc.exists() ? (albumDoc.data() as AlbumData) : null;

        const userDoc = await getDoc(doc(db, "users", data.userId));
        const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;

        reviews.push({
          id: reviewDoc.id,
          artist: albumData?.artist || "Неизвестный артист",
          album: albumData?.title || "Неизвестный альбом",
          type: albumData?.type || "album",
          rating: data.rating,
          yandexMusicId: albumData?.albumId || "",
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          views: data.uniqueViews || 0,
          content: data.reviewText,
          date: new Date(data.createdAt).toLocaleDateString("ru-RU"),
          createdAt: data.createdAt,
          coverUrl: albumData?.coverUrl || "/placeholder.svg",
          authorId: data.userId,
          author: userData?.username || "Неизвестный автор",
          likedBy: data.likedBy || [],
          dislikedBy: data.dislikedBy || [],
          status: data.status,
          rejectReason: data.rejectReason,
          customCoverUrl: data.customCoverUrl,
        });
      }
    }

    return reviews;
  } catch (error) {
    throw new Error("Не удалось загрузить рецензии пользователя из Firestore");
  }
};

// Получение рецензии по ID
export const getReviewById = async (id: string): Promise<Review> => {
  try {
    const reviewRef = doc(db, "reviews", id);
    const reviewDoc = await getDoc(reviewRef);
    if (!reviewDoc.exists()) {
      throw new Error("Рецензия не найдена");
    }

    const data = reviewDoc.data();
    if (!isValidReviewData(data)) {
      throw new Error("Неверный формат данных рецензии");
    }

    console.log("Данные рецензии из Firebase:", {
      reviewId: id,
      albumId: data.albumId,
      customCoverUrl: data.customCoverUrl
    });

    const albumDoc = await getDoc(doc(db, "albums", data.albumId));
    const albumData = albumDoc.exists() ? (albumDoc.data() as AlbumData) : null;

    console.log("Данные альбома:", {
      albumId: data.albumId,
      albumExists: albumDoc.exists(),
      coverUrl: albumData?.coverUrl
    });

    const userDoc = await getDoc(doc(db, "users", data.userId));
    const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;

    const review = {
      id: reviewDoc.id,
      artist: albumData?.artist || "Неизвестный артист",
      album: albumData?.title || "Неизвестный альбом",
      type: albumData?.type || "album",
      rating: data.rating,
      yandexMusicId: albumData?.albumId || "",
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
      views: data.uniqueViews || 0,
      content: data.reviewText,
      date: new Date(data.createdAt).toLocaleDateString("ru-RU"),
      createdAt: data.createdAt,
      coverUrl: albumData?.coverUrl || "/placeholder.svg",
      authorId: data.userId,
      author: userData?.username || "Неизвестный автор",
      likedBy: data.likedBy || [],
      dislikedBy: data.dislikedBy || [],
      status: data.status,
      rejectReason: data.rejectReason,
      customCoverUrl: data.customCoverUrl,
    };

    console.log("Окончательные данные рецензии:", {
      id: review.id,
      coverUrl: review.coverUrl,
      customCoverUrl: review.customCoverUrl
    });

    return review;
  } catch (error) {
    throw new Error("Не удалось загрузить рецензию из Firestore");
  }
};

// Обновление рецензии
export const updateReview = async (id: string, data: Partial<ReviewData>): Promise<void> => {
  try {
    const reviewRef = doc(db, "reviews", id);
    await updateDoc(reviewRef, data);
  } catch (error) {
    throw new Error("Не удалось обновить рецензию");
  }
};

// Удаление рецензии
export const deleteReview = async (id: string): Promise<void> => {
  try {
    const reviewRef = doc(db, "reviews", id);
    await deleteDoc(reviewRef);
  } catch (error) {
    throw new Error("Не удалось удалить рецензию");
  }
};

// Лайк рецензии
export const likeReview = async (reviewId: string, userId: string): Promise<Review> => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewDoc = await getDoc(reviewRef);
    if (!reviewDoc.exists()) {
      throw new Error("Рецензия не найдена");
    }

    const reviewData = reviewDoc.data() as ReviewData;
    const likedBy = reviewData.likedBy || [];
    const dislikedBy = reviewData.dislikedBy || [];

    if (likedBy.includes(userId)) {
      await updateDoc(reviewRef, {
        likes: (reviewData.likes || 0) - 1,
        likedBy: likedBy.filter((id) => id !== userId),
      });
    } else {
      await updateDoc(reviewRef, {
        likes: (reviewData.likes || 0) + 1,
        likedBy: [...likedBy, userId],
        dislikes: dislikedBy.includes(userId) ? (reviewData.dislikes || 0) - 1 : reviewData.dislikes || 0,
        dislikedBy: dislikedBy.filter((id) => id !== userId),
      });
    }

    return await getReviewById(reviewId);
  } catch (error) {
    throw new Error("Не удалось поставить лайк");
  }
};

// Дизлайк рецензии
export const dislikeReview = async (reviewId: string, userId: string): Promise<Review> => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewDoc = await getDoc(reviewRef);
    if (!reviewDoc.exists()) {
      throw new Error("Рецензия не найдена");
    }

    const reviewData = reviewDoc.data() as ReviewData;
    const likedBy = reviewData.likedBy || [];
    const dislikedBy = reviewData.dislikedBy || [];

    if (dislikedBy.includes(userId)) {
      await updateDoc(reviewRef, {
        dislikes: (reviewData.dislikes || 0) - 1,
        dislikedBy: dislikedBy.filter((id) => id !== userId),
      });
    } else {
      await updateDoc(reviewRef, {
        dislikes: (reviewData.dislikes || 0) + 1,
        dislikedBy: [...dislikedBy, userId],
        likes: likedBy.includes(userId) ? (reviewData.likes || 0) - 1 : reviewData.likes || 0,
        likedBy: likedBy.filter((id) => id !== userId),
      });
    }

    return await getReviewById(reviewId);
  } catch (error) {
    throw new Error("Не удалось поставить дизлайк");
  }
};

// Получение рецензий пользователя с пагинацией
export const getUserReviewsPaginated = async (
  userId: string,
  status: EnumStatusType,
  page: number = 1,
  limit: number = 3
): Promise<{ reviews: Review[]; total: number }> => {
  try {
    const reviewsRef = collection(db, "reviews");
    const q = query(
      reviewsRef,
      where("userId", "==", userId),
      where("status", "==", status)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Получаем все рецензии и сортируем их по дате
    const allReviews = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt as string
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Собираем все необходимые ID для batch запросов
    const albumIds = new Set<string>();
    const userIds = new Set<string>();
    
    allReviews.forEach(review => {
      if (isValidReviewData(review)) {
        albumIds.add(review.albumId);
        userIds.add(review.userId);
      }
    });

    // Получаем все необходимые альбомы одним запросом
    const albumsSnapshot = await Promise.all(
      Array.from(albumIds).map(id => getDoc(doc(db, "albums", id)))
    );
    const albums = new Map(
      albumsSnapshot
        .filter(doc => doc.exists())
        .map(doc => [doc.id, doc.data() as AlbumData])
    );

    // Получаем все необходимые пользователи одним запросом
    const usersSnapshot = await Promise.all(
      Array.from(userIds).map(id => getDoc(doc(db, "users", id)))
    );
    const users = new Map(
      usersSnapshot
        .filter(doc => doc.exists())
        .map(doc => [doc.id, doc.data() as UserData])
    );

    // Применяем пагинацию
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReviews = allReviews.slice(startIndex, endIndex);

    // Формируем результат
    const reviews = paginatedReviews.map(review => {
      if (!isValidReviewData(review)) return null;
      
      const albumData = albums.get(review.albumId);
      const userData = users.get(review.userId);

      const reviewData: Review = {
        id: review.id,
        artist: albumData?.artist || "Неизвестный артист",
        album: albumData?.title || "Неизвестный альбом",
        type: albumData?.type || "album",
        rating: review.rating,
        yandexMusicId: albumData?.albumId || "",
        likes: review.likes || 0,
        dislikes: review.dislikes || 0,
        views: review.uniqueViews || 0,
        content: review.reviewText,
        date: new Date(review.createdAt).toLocaleDateString("ru-RU"),
        createdAt: review.createdAt,
        coverUrl: albumData?.coverUrl || "/placeholder.svg",
        authorId: review.userId,
        author: userData?.username || "Неизвестный автор",
        likedBy: review.likedBy || [],
        dislikedBy: review.dislikedBy || [],
        status: review.status,
        rejectReason: review.rejectReason,
        customCoverUrl: review.customCoverUrl,
      };

      return reviewData;
    }).filter((review): review is Review => review !== null);

    return { 
      reviews, 
      total: allReviews.length 
    };
  } catch (error) {
    throw new Error("Не удалось загрузить рецензии пользователя из Firestore");
  }
};

// Получение рецензий редакции с пагинацией
export const getAdminReviewsPaginated = async (
  status: EnumStatusType = EnumStatus.APPROVED,
  page: number = 1,
  limit: number = 6,
  search: string = "",
  releaseType: string = "all",
  rating: string | "all" = "all",
  sortOrder: "newest" | "oldest" = "newest",
  currentUserId?: string,
  isAdmin?: boolean
): Promise<{ reviews: Review[]; total: number }> => {
  try {
    const reviewsRef = collection(db, "reviews");
    
    // Для обычных пользователей, которые не являются администраторами,
    // загружаем только одобренные рецензии
    let q;
    if (status !== EnumStatus.APPROVED && !isAdmin) {
      q = query(reviewsRef, where("status", "==", EnumStatus.APPROVED));
    } else {
      q = query(reviewsRef, where("status", "==", status));
    }
    
    const querySnapshot = await getDocs(q);
    
    // Получаем все рецензии и сортируем их по дате
    const allReviews = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Проверяем данные перед использованием
      if (!isValidReviewData(data)) return null;
      
      return {
        id: doc.id,
        albumId: data.albumId,
        userId: data.userId,
        rating: data.rating,
        reviewText: data.reviewText,
        status: data.status,
        createdAt: data.createdAt,
        rejectReason: data.rejectReason,
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        likedBy: data.likedBy || [],
        dislikedBy: data.dislikedBy || [],
        customCoverUrl: data.customCoverUrl
      };
    }).filter((review): review is (ReviewData & { id: string }) => review !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Фильтруем рецензии только от администраторов
    // Сначала получаем всех пользователей
    const userIds = new Set<string>();
    allReviews.forEach(review => {
      userIds.add(review.userId);
    });
    
    const usersSnapshot = await Promise.all(
      Array.from(userIds).map(id => getDoc(doc(db, "users", id)))
    );
    const users = new Map(
      usersSnapshot
        .filter(doc => doc.exists())
        .map(doc => [doc.id, doc.data() as UserData])
    );
    
    // Теперь фильтруем рецензии по роли пользователя
    let filteredReviews = allReviews.filter(review => {
      const userData = users.get(review.userId);
      return userData?.role === ("ADMIN" as EnumRoleType);
    });

    // Собираем все необходимые ID для batch запросов альбомов
    const albumIds = new Set<string>();
    
    filteredReviews.forEach(review => {
      albumIds.add(review.albumId);
    });

    // Получаем все необходимые альбомы одним запросом
    const albumsSnapshot = await Promise.all(
      Array.from(albumIds).map(id => getDoc(doc(db, "albums", id)))
    );
    const albums = new Map(
      albumsSnapshot
        .filter(doc => doc.exists())
        .map(doc => [doc.id, doc.data() as AlbumData])
    );

    // Применяем текстовый поиск для альбомов и исполнителей
    filteredReviews = filteredReviews.filter(review => {
      const albumData = albums.get(review.albumId);
      if (!albumData) return false;
      
      // Фильтр по тексту поиска для названия и исполнителя
      const artist = albumData.artist || "";
      const album = albumData.title || "";
      const type = albumData.type || "";
      
      const searchLower = search.toLowerCase();
      const artistMatch = artist.toLowerCase().includes(searchLower);
      const albumMatch = album.toLowerCase().includes(searchLower);
      const anyMatch = artistMatch || albumMatch;
      
      if (search && !anyMatch) return false;
      
      // Фильтр по типу релиза
      if (releaseType !== "all" && type !== releaseType) return false;
      
      // Фильтр по рейтингу
      if (rating !== "all" && review.rating !== rating) return false;
      
      return true;
    });

    // Сортировка по дате
    if (sortOrder === "oldest") {
      filteredReviews.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      filteredReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // Пагинация
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex);
    
    // Формируем результат
    const reviews = paginatedReviews.map(review => {
      const albumData = albums.get(review.albumId);
      const userData = users.get(review.userId);

      const reviewData: Review = {
        id: review.id,
        artist: albumData?.artist || "Неизвестный артист",
        album: albumData?.title || "Неизвестный альбом",
        type: albumData?.type || "album",
        rating: review.rating,
        yandexMusicId: albumData?.albumId || "",
        likes: review.likes || 0,
        dislikes: review.dislikes || 0,
        views: review.uniqueViews || 0,
        content: review.reviewText,
        date: new Date(review.createdAt).toLocaleDateString("ru-RU"),
        createdAt: review.createdAt,
        coverUrl: albumData?.coverUrl || "/placeholder.svg",
        authorId: review.userId,
        author: userData?.username || "Неизвестный автор",
        likedBy: review.likedBy || [],
        dislikedBy: review.dislikedBy || [],
        status: review.status,
        rejectReason: review.rejectReason,
        customCoverUrl: review.customCoverUrl,
      };

      return reviewData;
    });

    return { 
      reviews, 
      total: filteredReviews.length 
    };
  } catch (error) {
    throw new Error("Не удалось загрузить рецензии редакции из Firestore");
  }
};

// Получение рецензий пользователей с пагинацией и фильтрацией
export const getUserReviewsPaginatedWithFilters = async (
  status: EnumStatusType = EnumStatus.APPROVED,
  page: number = 1,
  limit: number = 6,
  search: string = "",
  releaseType: string = "all",
  rating: string | "all" = "all",
  sortOrder: "newest" | "oldest" = "newest",
  currentUserId?: string,
  isAdmin?: boolean
): Promise<{ reviews: Review[]; total: number }> => {
  try {
    const reviewsRef = collection(db, "reviews");
    
    // Для обычных пользователей, которые не являются администраторами,
    // загружаем только одобренные рецензии, если не указан currentUserId
    let q;
    if (status !== EnumStatus.APPROVED && !isAdmin && !currentUserId) {
      q = query(reviewsRef, where("status", "==", EnumStatus.APPROVED));
    } else {
      q = query(reviewsRef, where("status", "==", status));
    }
    
    const querySnapshot = await getDocs(q);
    
    // Получаем все рецензии и сортируем их по дате
    const allReviews = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        albumId: data.albumId,
        userId: data.userId,
        rating: data.rating,
        reviewText: data.reviewText,
        status: data.status,
        rejectReason: data.rejectReason,
        moderationComment: data.moderationComment,
        createdAt: data.createdAt,
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        likedBy: data.likedBy || [],
        dislikedBy: data.dislikedBy || [],
        customCoverUrl: data.customCoverUrl
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Фильтруем рецензии для неодобренных статусов
    let filteredReviews = allReviews;
    if (status !== EnumStatus.APPROVED && !isAdmin && currentUserId) {
      // Если не администратор и есть ID пользователя, показываем только его рецензии
      filteredReviews = allReviews.filter(review => review.userId === currentUserId);
    }

    // Собираем все необходимые ID для batch запросов
    const albumIds = new Set<string>();
    const userIds = new Set<string>();
    
    filteredReviews.forEach(review => {
      if (isValidReviewData(review)) {
        albumIds.add(review.albumId);
        userIds.add(review.userId);
      }
    });

    // Получаем все необходимые альбомы одним запросом
    const albumsSnapshot = await Promise.all(
      Array.from(albumIds).map(id => getDoc(doc(db, "albums", id)))
    );
    const albums = new Map(
      albumsSnapshot
        .filter(doc => doc.exists())
        .map(doc => [doc.id, doc.data() as AlbumData])
    );

    // Получаем все необходимые пользователи одним запросом
    const usersSnapshot = await Promise.all(
      Array.from(userIds).map(id => getDoc(doc(db, "users", id)))
    );
    const users = new Map(
      usersSnapshot
        .filter(doc => doc.exists())
        .map(doc => [doc.id, doc.data() as UserData])
    );

    // Теперь фильтруем рецензии, чтобы показывать только от обычных пользователей (не админов)
    filteredReviews = filteredReviews.filter(review => {
      const userData = users.get(review.userId);
      return userData?.role !== ("ADMIN" as EnumRoleType); // Противоположное условие по сравнению с getAdminReviewsPaginated
    });

    // Применяем текстовый поиск для альбомов и исполнителей
    filteredReviews = filteredReviews.filter(review => {
      const albumData = albums.get(review.albumId);
      if (!albumData) return false;
      
      // Фильтр по тексту поиска для названия и исполнителя
      const artist = albumData.artist || "";
      const album = albumData.title || "";
      const type = albumData.type || "";
      
      const searchLower = search.toLowerCase();
      const artistMatch = artist.toLowerCase().includes(searchLower);
      const albumMatch = album.toLowerCase().includes(searchLower);
      const anyMatch = artistMatch || albumMatch;
      
      if (search && !anyMatch) return false;
      
      // Фильтр по типу релиза
      if (releaseType !== "all" && type !== releaseType) return false;
      
      // Фильтр по рейтингу
      if (rating !== "all" && review.rating !== rating) return false;
      
      return true;
    });

    // Сортировка по дате
    if (sortOrder === "oldest") {
      filteredReviews.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      filteredReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // Пагинация
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex);
    
    // Формируем результат
    const reviews = paginatedReviews.map(review => {
      if (!isValidReviewData(review)) return null;
      
      const albumData = albums.get(review.albumId);
      const userData = users.get(review.userId);

      const reviewData: Review = {
        id: review.id,
        artist: albumData?.artist || "Неизвестный артист",
        album: albumData?.title || "Неизвестный альбом",
        type: albumData?.type || "album",
        rating: review.rating,
        yandexMusicId: albumData?.albumId || "",
        likes: review.likes || 0,
        dislikes: review.dislikes || 0,
        views: review.uniqueViews || 0,
        content: review.reviewText,
        date: new Date(review.createdAt).toLocaleDateString("ru-RU"),
        createdAt: review.createdAt,
        coverUrl: albumData?.coverUrl || "/placeholder.svg",
        authorId: review.userId,
        author: userData?.username || "Неизвестный автор",
        likedBy: review.likedBy || [],
        dislikedBy: review.dislikedBy || [],
        status: review.status,
        rejectReason: review.rejectReason,
        customCoverUrl: review.customCoverUrl,
      };

      return reviewData;
    }).filter((review): review is Review => review !== null);

    return { 
      reviews, 
      total: filteredReviews.length 
    };
  } catch (error) {
    throw new Error("Не удалось загрузить рецензии пользователей из Firestore");
  }
};

// Инкрементирование просмотров рецензии
export const incrementReviewViews = async (reviewId: string): Promise<void> => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const reviewDoc = await getDoc(reviewRef);
    
    if (!reviewDoc.exists()) {
      throw new Error("Рецензия не найдена");
    }
    
    // Используем Firebase increment для атомарного увеличения счетчика
    await updateDoc(reviewRef, {
      uniqueViews: increment(1)
    });
  } catch (error) {
    console.error("Ошибка при увеличении счетчика просмотров:", error);
    // Не выбрасываем ошибку, чтобы не блокировать загрузку страницы
  }
};

// Получение рецензий от пользователей, на которых подписан текущий пользователь
export const getSubscriptionReviewsPaginated = async (
  status: EnumStatusType = EnumStatus.APPROVED,
  page: number = 1,
  limit: number = 6,
  search: string = "",
  releaseType: string = "all",
  rating: string | "all" = "all",
  sortOrder: "newest" | "oldest" = "newest",
  currentUserId?: string
): Promise<{ reviews: Review[]; total: number }> => {
  console.log("==== НАЧАЛО ЗАГРУЗКИ РЕЦЕНЗИЙ ПОДПИСОК ====");
  console.log(`Параметры запроса:`, {
    status,
    page,
    limit,
    search,
    releaseType,
    rating,
    sortOrder,
    currentUserId
  });
  
  if (!currentUserId) {
    console.log("Ошибка: отсутствует ID пользователя");
    return { reviews: [], total: 0 };
  }

  try {
    console.log(`Получение рецензий от подписок для пользователя: ${currentUserId}`);
    
    // Сначала получаем список подписок пользователя
    const subscriptionRef = collection(db, "subscribers");
    const subscriptionQuery = query(subscriptionRef, where("subscriberId", "==", currentUserId));
    console.log(`Выполняем запрос подписок для userId: ${currentUserId}`);
    
    const subscriptionSnapshot = await getDocs(subscriptionQuery);
    console.log(`Получено подписок: ${subscriptionSnapshot.size}`);
    
    // Если пользователь не подписан ни на кого, возвращаем пустой результат
    if (subscriptionSnapshot.empty) {
      console.log("Пользователь не подписан ни на кого");
      return { reviews: [], total: 0 };
    }
    
    // Получаем ID пользователей, на которых подписан текущий пользователь
    const subscribedUserIds = subscriptionSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Подписка: ${doc.id}, targetUserId: ${data.targetUserId}`);
      return data.targetUserId;
    });
    
    console.log(`Найдено ${subscribedUserIds.length} подписок:`, subscribedUserIds);
    
    // Проверка на количество ID в запросе (ограничение Firestore - не более 10 значений в 'in')
    if (subscribedUserIds.length > 10) {
      console.log("ПРЕДУПРЕЖДЕНИЕ: Количество ID превышает лимит Firestore для 'in' (10). Будем делать несколько запросов.");
      // Здесь можно реализовать разбивку на части, но пока оставим как есть
    }
    
    // Создаем базовый запрос для рецензий
    const reviewsRef = collection(db, "reviews");
    
    // Строим запрос с фильтрами
    console.log(`Запрос рецензий со статусом ${status} от пользователей:`, subscribedUserIds);
    let reviewsQuery = query(
      reviewsRef,
      where("status", "==", status),
      where("userId", "in", subscribedUserIds)
    );
    
    // Получаем все рецензии, соответствующие запросу
    const reviewsSnapshot = await getDocs(reviewsQuery);
    console.log(`Найдено ${reviewsSnapshot.size} рецензий от подписок (до фильтрации)`);
    
    if (reviewsSnapshot.empty) {
      console.log("Нет рецензий от подписок");
      return { reviews: [], total: 0 };
    }
    
    // Вручную фильтруем результаты в памяти
    // Сначала получим данные по всем альбомам, чтобы не делать отдельный запрос для каждой рецензии
    const reviewsData: Array<{reviewDoc: any, reviewData: ReviewData}> = [];
    const albumIds = new Set<string>();
    
    console.log("Начинаем обработку полученных рецензий");
    reviewsSnapshot.forEach(reviewDoc => {
      const data = reviewDoc.data();
      console.log(`Обработка рецензии ${reviewDoc.id}:`, {
        albumId: data.albumId,
        userId: data.userId,
        rating: data.rating,
        status: data.status
      });
      
      if (!data.albumId || !data.userId || !data.reviewText || !data.rating || !data.status) {
        console.log(`Пропускаем рецензию ${reviewDoc.id} - неполные данные`);
        return; // Пропускаем рецензии с неполными данными
      }
      
      // Создаем типизированный объект ReviewData из данных Firestore
      const reviewData: ReviewData = {
        albumId: data.albumId,
        userId: data.userId,
        rating: data.rating,
        reviewText: data.reviewText,
        status: data.status,
        createdAt: data.createdAt || new Date().toISOString(),
        rejectReason: data.rejectReason,
        moderationComment: data.moderationComment,
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        likedBy: data.likedBy || [],
        dislikedBy: data.dislikedBy || [],
        customCoverUrl: data.customCoverUrl,
        uniqueViews: data.uniqueViews || 0
      };
      
      // Применяем фильтр по рейтингу
      if (rating !== "all" && reviewData.rating !== rating) {
        console.log(`Пропускаем рецензию ${reviewDoc.id} - не соответствует фильтру по рейтингу (${reviewData.rating} != ${rating})`);
        return;
      }

      // По текстовому содержанию рецензии
      if (search && !reviewData.reviewText.toLowerCase().includes(search.toLowerCase())) {
        // Если не найдено в тексте рецензии, сохраняем для дальнейшей проверки по данным альбома
        console.log(`Рецензия ${reviewDoc.id} - текст не содержит поисковый запрос '${search}', проверим данные альбома`);
        albumIds.add(reviewData.albumId);
      } else if (search) {
        console.log(`Рецензия ${reviewDoc.id} - текст содержит поисковый запрос '${search}'`);
      }
      
      reviewsData.push({
        reviewDoc,
        reviewData
      });
      
      // Добавляем ID альбома для загрузки данных
      albumIds.add(reviewData.albumId);
    });
    
    console.log(`После базовой фильтрации осталось ${reviewsData.length} рецензий`);
    console.log(`Загружаем данные для ${albumIds.size} альбомов`);
    
    // Получаем данные по всем альбомам одним запросом
    const albumsPromises = Array.from(albumIds).map(albumId => 
      getDoc(doc(db, "albums", albumId))
    );
    const albumDocs = await Promise.all(albumsPromises);
    const albumsMap = new Map<string, AlbumData>();
    
    albumDocs.forEach(albumDoc => {
      if (albumDoc.exists()) {
        const albumData = albumDoc.data() as AlbumData;
        albumsMap.set(albumDoc.id, albumData);
        console.log(`Загружен альбом ${albumDoc.id}: ${albumData.title} - ${albumData.artist} (тип: ${albumData.type})`);
      } else {
        console.log(`Альбом ${albumDoc.id} не найден`);
      }
    });
    
    // Фильтруем рецензии по типу релиза и поисковому запросу, используя данные альбомов
    const filteredReviewsWithId = reviewsData.filter(({reviewDoc, reviewData}) => {
      // Ищем альбом для текущей рецензии
      const albumData = albumsMap.get(reviewData.albumId);
      
      // Если данных по альбому нет, пропускаем эту рецензию
      if (!albumData) {
        console.log(`Пропускаем рецензию ${reviewDoc.id} - нет данных по альбому ${reviewData.albumId}`);
        return false;
      }
      
      // Применяем фильтр по типу релиза
      if (releaseType !== "all" && albumData.type !== releaseType) {
        console.log(`Пропускаем рецензию ${reviewDoc.id} - тип релиза не соответствует (${albumData.type} != ${releaseType})`);
        return false;
      }
      
      // Если есть поисковый запрос, проверяем данные альбома
      if (search) {
        const searchLower = search.toLowerCase();
        
        // Уже проверили текст рецензии выше, теперь проверяем альбом и исполнителя
        const artistIncludes = albumData.artist.toLowerCase().includes(searchLower);
        const titleIncludes = albumData.title.toLowerCase().includes(searchLower);
        const textIncludes = reviewData.reviewText.toLowerCase().includes(searchLower);
        
        const searchResult = textIncludes || artistIncludes || titleIncludes;
        console.log(`Рецензия ${reviewDoc.id} - поиск '${search}': текст=${textIncludes}, исполнитель=${artistIncludes}, альбом=${titleIncludes}, результат=${searchResult}`);
        
        // Рецензия проходит, если запрос найден в любом из полей
        return searchResult;
      }
      
      // Если нет поискового запроса, все ограничения прошли
      return true;
    }).map(({reviewDoc, reviewData}) => ({
      id: reviewDoc.id,
      reviewData
    }));
    
    console.log(`После фильтрации осталось ${filteredReviewsWithId.length} рецензий`);
    
    // Сортируем по дате
    filteredReviewsWithId.sort((a, b) => {
      const dateA = new Date(a.reviewData.createdAt).getTime();
      const dateB = new Date(b.reviewData.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    console.log(`Отсортировано по дате (${sortOrder})`);
    
    // Вычисляем общее количество и делаем пагинацию
    const total = filteredReviewsWithId.length;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, filteredReviewsWithId.length);
    const paginatedReviews = filteredReviewsWithId.slice(startIndex, endIndex);
    
    console.log(`Пагинация: страница ${page}, лимит ${limit}, показ с ${startIndex + 1} по ${endIndex} из ${total}`);
    
    // Преобразуем данные в формат Review
    const reviews: Review[] = [];
    
    for (const {id, reviewData} of paginatedReviews) {
      // Получаем данные альбома (из кэша, если есть)
      let albumData = albumsMap.get(reviewData.albumId);
      
      // Если альбом не был загружен ранее, делаем запрос
      if (!albumData) {
        console.log(`Загружаем данные альбома ${reviewData.albumId} для рецензии ${id}`);
        const albumDoc = await getDoc(doc(db, "albums", reviewData.albumId));
        if (albumDoc.exists()) {
          albumData = albumDoc.data() as AlbumData;
          albumsMap.set(reviewData.albumId, albumData);
        } else {
          console.log(`Альбом ${reviewData.albumId} для рецензии ${id} не найден`);
        }
      }
      
      // Получаем данные пользователя
      const userDoc = await getDoc(doc(db, "users", reviewData.userId));
      const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;
      
      console.log(`Данные пользователя ${reviewData.userId} для рецензии ${id}: `, userData ? `${userData.username}, забанен: ${userData.isBanned}` : "не найден");
      
      // Пропускаем рецензии заблокированных пользователей
      if (userData?.isBanned) {
        console.log(`Пропускаем рецензию ${id} - пользователь ${reviewData.userId} забанен`);
        continue;
      }
      
      if (!userData) {
        console.log(`Пропускаем рецензию ${id} - пользователь ${reviewData.userId} не найден`);
        continue;
      }
      
      if (!albumData) {
        console.log(`Пропускаем рецензию ${id} - альбом ${reviewData.albumId} не найден`);
        continue;
      }
      
      // Форматируем дату
      const date = new Date(reviewData.createdAt);
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
      
      // Собираем рецензию
      const review: Review = {
        id,
        type: albumData.type,
        album: albumData.title,
        artist: albumData.artist,
        releaseDate: albumData.releaseDate,
        coverUrl: albumData.coverUrl,
        rating: reviewData.rating,
        author: userData.username,
        date: formattedDate,
        authorId: reviewData.userId,
        reviewText: reviewData.reviewText,
        status: reviewData.status,
        rejectReason: reviewData.rejectReason,
        moderationComment: reviewData.moderationComment,
        likes: reviewData.likes,
        dislikes: reviewData.dislikes,
        likedBy: reviewData.likedBy,
        dislikedBy: reviewData.dislikedBy,
        customCoverUrl: reviewData.customCoverUrl,
        views: reviewData.uniqueViews
      };
      
      console.log(`Добавлена рецензия ${id}: ${review.album} - ${review.artist}, автор: ${review.author}`);
      reviews.push(review);
    }
    
    console.log(`==== ИТОГИ ЗАГРУЗКИ РЕЦЕНЗИЙ ПОДПИСОК ====`);
    console.log(`Найдено рецензий после всей фильтрации: ${reviews.length} из ${total} возможных`);
    
    return { reviews, total };
  } catch (error: any) {
    console.error("Ошибка при получении рецензий от подписок:", error);
    throw new Error("Не удалось загрузить рецензии от подписок: " + (error.message || "Неизвестная ошибка"));
  }
};

// Обновление обложки рецензии
export const updateReviewCover = async (reviewId: string, file: File): Promise<string> => {
  try {
    // Загружаем файл на сервер
    const formData = new FormData();
    formData.append("cover", file);
    const response = await fetch(`${SERVER_URL}/upload-cover`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Ошибка загрузки обложки");
    }
    
    const customCoverUrl = data.coverUrl;
    
    // Обновляем рецензию в Firestore
    const reviewRef = doc(db, "reviews", reviewId);
    await updateDoc(reviewRef, { customCoverUrl });
    
    return customCoverUrl;
  } catch (error) {
    throw new Error("Не удалось обновить обложку рецензии");
  }
};

// Удаление кастомной обложки рецензии
export const deleteReviewCover = async (reviewId: string, customCoverUrl: string): Promise<void> => {
  try {
    // Удаляем файл с сервера
    await fetch(`${SERVER_URL}/delete-cover`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverUrl: customCoverUrl }),
    });
    
    // Обновляем рецензию в Firestore, удаляя ссылку на кастомную обложку
    const reviewRef = doc(db, "reviews", reviewId);
    await updateDoc(reviewRef, { customCoverUrl: null });
  } catch (error) {
    throw new Error("Не удалось удалить обложку рецензии");
  }
};
