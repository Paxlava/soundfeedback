import { db } from "@/lib/firebaseConfig";
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, where, getDocs, query, DocumentData, arrayUnion, arrayRemove } from "firebase/firestore";
import { EnumRole, EnumRoleType } from "@/enums/role";
import { CommentData, Comment } from "@/types/reviewTypes";
import { UserData } from "@/types/userTypes";
import { fetchUserData } from "@/services/userService";

// Проверка данных комментария
const isValidCommentData = (data: DocumentData): data is CommentData => {
  return (
    typeof data.reviewId === "string" &&
    typeof data.userId === "string" &&
    typeof data.username === "string" &&
    typeof data.content === "string" &&
    typeof data.createdAt === "string" &&
    typeof data.likes === "number" &&
    typeof data.dislikes === "number" &&
    Array.isArray(data.likedBy) &&
    Array.isArray(data.dislikedBy) &&
    Array.isArray(data.replies)
  );
};

// Получение комментариев
export const getCommentsByReviewId = async (reviewId: string): Promise<Comment[]> => {
  try {
    const commentsRef = collection(db, "comments");
    const q = query(commentsRef, where("reviewId", "==", reviewId));
    const querySnapshot = await getDocs(q);
    const comments: Comment[] = [];

    for (const commentDoc of querySnapshot.docs) {
      const data = commentDoc.data();
      if (isValidCommentData(data)) {
        const userDoc = await getDoc(doc(db, "users", data.userId));
        const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;
        const username = userData?.username || data.username;

        comments.push({
          id: commentDoc.id,
          userId: data.userId,
          user: username,
          role: userData?.role,
          avatarUrl: userData?.avatarUrl,
          content: data.content,
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          likedBy: data.likedBy || [],
          dislikedBy: data.dislikedBy || [],
          isBanned: userData?.isBanned || false,
          replies: await Promise.all(
            data.replies.map(async (reply) => {
              const replyUserDoc = await getDoc(doc(db, "users", reply.userId));
              const replyUserData = replyUserDoc.exists() ? (replyUserDoc.data() as UserData) : null;
              const replyUsername = replyUserData?.username || reply.username;

              return {
                id: reply.id || "",
                userId: reply.userId,
                user: replyUsername,
                role: reply.role,
                avatarUrl: replyUserData?.avatarUrl,
                content: reply.content,
                likes: reply.likes || 0,
                dislikes: reply.dislikes || 0,
                likedBy: reply.likedBy || [],
                dislikedBy: reply.dislikedBy || [],
                createdAt: reply.createdAt,
                isBanned: replyUserData?.isBanned || false,
              };
            })
          ),
          date: new Date(data.createdAt).toLocaleDateString("ru-RU"),
          createdAt: data.createdAt,
        });
      }
    }

    // Сортируем комментарии по дате создания в обратном хронологическом порядке (от новых к старым)
    return comments.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  } catch (error) {
    throw new Error("Не удалось загрузить комментарии");
  }
};

// Добавление комментария
export const addComment = async (reviewId: string, userId: string, username: string, content: string): Promise<Comment> => {
  try {
    const commentData = {
      reviewId,
      userId,
      username,
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      replies: [],
    };

    const commentRef = await addDoc(collection(db, "comments"), commentData);

    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;

    return {
      id: commentRef.id,
      userId,
      user: username,
      role: userData?.role,
      avatarUrl: userData?.avatarUrl || "/placeholder.svg", // Устанавливаем аватарку
      content,
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      isBanned: userData?.isBanned || false,
      replies: [],
      date: new Date().toLocaleDateString("ru-RU"),
      createdAt: commentData.createdAt,
    };
  } catch (error) {
    throw new Error("Не удалось добавить комментарий");
  }
};

// Добавление ответа на комментарий
export const addReply = async (commentId: string, userId: string, username: string, content: string): Promise<Comment> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    // Получаем данные пользователя, чтобы взять его роль
    const userData = await fetchUserData(userId);
    if (!userData) {
      throw new Error("Пользователь не найден");
    }

    const replyData = {
      id: `${Date.now()}-${userId}`,
      userId,
      username,
      role: userData.role || "USER",
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      isBanned: userData.isBanned || false,
    };

    await updateDoc(commentRef, {
      replies: arrayUnion(replyData),
    });

    const updatedCommentDoc = await getDoc(commentRef);
    const updatedData = updatedCommentDoc.data();
    if (!isValidCommentData(updatedData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Загружаем данные пользователя для комментария
    const commentUserData = await fetchUserData(updatedData.userId);

    // Загружаем данные пользователей для ответов
    const repliesWithUserData = await Promise.all(
      updatedData.replies.map(async (reply) => {
        const replyUserData = await fetchUserData(reply.userId);
        return {
          ...reply,
          role: reply.role || replyUserData?.role || "USER",
          avatarUrl: replyUserData?.avatarUrl,
          isBanned: replyUserData?.isBanned || false,
        };
      })
    );

    // Сортируем ответы по дате создания в обратном хронологическом порядке (от новых к старым)
    const sortedReplies = repliesWithUserData.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      id: commentId,
      userId: updatedData.userId,
      user: updatedData.username,
      role: commentUserData?.role || EnumRole.USER,
      avatarUrl: commentUserData?.avatarUrl,
      content: updatedData.content,
      likes: updatedData.likes || 0,
      dislikes: updatedData.dislikes || 0,
      likedBy: updatedData.likedBy || [],
      dislikedBy: updatedData.dislikedBy || [],
      isBanned: commentUserData?.isBanned || false,
      replies: sortedReplies.map((reply) => ({
        id: reply.id || "",
        userId: reply.userId,
        user: reply.username,
        role: reply.role as EnumRoleType,
        avatarUrl: reply.avatarUrl,
        content: reply.content,
        likes: reply.likes || 0,
        dislikes: reply.dislikes || 0,
        likedBy: reply.likedBy || [],
        dislikedBy: reply.dislikedBy || [],
        createdAt: reply.createdAt,
        isBanned: reply.isBanned || false,
      })),
      date: new Date(updatedData.createdAt).toLocaleDateString("ru-RU"),
      createdAt: updatedData.createdAt,
    };
  } catch (error) {
    throw new Error("Не удалось добавить ответ на комментарий");
  }
};

// Лайк комментария
export const likeComment = async (commentId: string, userId: string): Promise<Comment> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    const commentData = commentDoc.data();
    if (!isValidCommentData(commentData)) {
      throw new Error("Неверный формат данных комментария");
    }

    const hasLiked = commentData.likedBy.includes(userId);
    const hasDisliked = commentData.dislikedBy.includes(userId);

    await updateDoc(commentRef, {
      likes: hasLiked ? commentData.likes - 1 : commentData.likes + 1,
      likedBy: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
      dislikes: hasDisliked ? commentData.dislikes - 1 : commentData.dislikes,
      dislikedBy: hasDisliked ? arrayRemove(userId) : commentData.dislikedBy,
    });

    const updatedCommentDoc = await getDoc(commentRef);
    const updatedData = updatedCommentDoc.data();
    if (!isValidCommentData(updatedData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Загружаем данные пользователя для комментария
    const userData = await fetchUserData(updatedData.userId);

    // Загружаем данные пользователей для ответов
    const repliesWithUserData = await Promise.all(
      updatedData.replies.map(async (reply) => {
        const replyUserData = await fetchUserData(reply.userId);
        return {
          ...reply,
          role: reply.role || replyUserData?.role || "USER",
          avatarUrl: replyUserData?.avatarUrl,
        };
      })
    );

    return {
      id: commentId,
      userId: updatedData.userId,
      user: updatedData.username,
      role: userData?.role || EnumRole.USER,
      avatarUrl: userData?.avatarUrl,
      content: updatedData.content,
      likes: updatedData.likes || 0,
      dislikes: updatedData.dislikes || 0,
      likedBy: updatedData.likedBy || [],
      dislikedBy: updatedData.dislikedBy || [],
      replies: repliesWithUserData.map((reply) => ({
        id: reply.id || "",
        userId: reply.userId,
        user: reply.username,
        role: reply.role as EnumRoleType,
        avatarUrl: reply.avatarUrl,
        content: reply.content,
        likes: reply.likes || 0,
        dislikes: reply.dislikes || 0,
        likedBy: reply.likedBy || [],
        dislikedBy: reply.dislikedBy || [],
        createdAt: reply.createdAt,
      })),
      date: new Date(updatedData.createdAt).toLocaleDateString("ru-RU"),
      createdAt: updatedData.createdAt,
    };
  } catch (error) {
    throw new Error("Не удалось поставить лайк");
  }
};

// Дизлайк комментария
export const dislikeComment = async (commentId: string, userId: string): Promise<Comment> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    const commentData = commentDoc.data();
    if (!isValidCommentData(commentData)) {
      throw new Error("Неверный формат данных комментария");
    }

    const hasLiked = commentData.likedBy.includes(userId);
    const hasDisliked = commentData.dislikedBy.includes(userId);

    await updateDoc(commentRef, {
      dislikes: hasDisliked ? commentData.dislikes - 1 : commentData.dislikes + 1,
      dislikedBy: hasDisliked ? arrayRemove(userId) : arrayUnion(userId),
      likes: hasLiked ? commentData.likes - 1 : commentData.likes,
      likedBy: hasLiked ? arrayRemove(userId) : commentData.likedBy,
    });

    const updatedCommentDoc = await getDoc(commentRef);
    const updatedData = updatedCommentDoc.data();
    if (!isValidCommentData(updatedData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Загружаем данные пользователя для комментария
    const userData = await fetchUserData(updatedData.userId);

    // Загружаем данные пользователей для ответов
    const repliesWithUserData = await Promise.all(
      updatedData.replies.map(async (reply) => {
        const replyUserData = await fetchUserData(reply.userId);
        return {
          ...reply,
          role: reply.role || replyUserData?.role || "USER",
          avatarUrl: replyUserData?.avatarUrl,
        };
      })
    );

    return {
      id: commentId,
      userId: updatedData.userId,
      user: updatedData.username,
      role: userData?.role || EnumRole.USER,
      avatarUrl: userData?.avatarUrl,
      content: updatedData.content,
      likes: updatedData.likes || 0,
      dislikes: updatedData.dislikes || 0,
      likedBy: updatedData.likedBy || [],
      dislikedBy: updatedData.dislikedBy || [],
      replies: repliesWithUserData.map((reply) => ({
        id: reply.id || "",
        userId: reply.userId,
        user: reply.username,
        role: reply.role as EnumRoleType,
        avatarUrl: reply.avatarUrl,
        content: reply.content,
        likes: reply.likes || 0,
        dislikes: reply.dislikes || 0,
        likedBy: reply.likedBy || [],
        dislikedBy: reply.dislikedBy || [],
        createdAt: reply.createdAt,
      })),
      date: new Date(updatedData.createdAt).toLocaleDateString("ru-RU"),
      createdAt: updatedData.createdAt,
    };
  } catch (error) {
    throw new Error("Не удалось поставить дизлайк");
  }
};

// Лайк ответа
export const likeReply = async (commentId: string, replyId: string, userId: string): Promise<Comment> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    const commentData = commentDoc.data();
    if (!isValidCommentData(commentData)) {
      throw new Error("Неверный формат данных комментария");
    }

    const reply = commentData.replies.find((r) => r.id === replyId);
    if (!reply) {
      throw new Error("Ответ не найден");
    }

    const hasLiked = reply.likedBy.includes(userId);
    const hasDisliked = reply.dislikedBy.includes(userId);

    const updatedReplies = commentData.replies.map((r) =>
      r.id === replyId
        ? {
            ...r,
            likes: hasLiked ? r.likes - 1 : r.likes + 1,
            likedBy: hasLiked ? r.likedBy.filter((id) => id !== userId) : [...r.likedBy, userId],
            dislikes: hasDisliked ? r.dislikes - 1 : r.dislikes,
            dislikedBy: hasDisliked ? r.dislikedBy.filter((id) => id !== userId) : r.dislikedBy,
          }
        : r
    );

    await updateDoc(commentRef, {
      replies: updatedReplies,
    });

    const updatedCommentDoc = await getDoc(commentRef);
    const updatedData = updatedCommentDoc.data();
    if (!isValidCommentData(updatedData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Загружаем данные пользователя для комментария
    const userData = await fetchUserData(updatedData.userId);

    // Загружаем данные пользователей для ответов
    const repliesWithUserData = await Promise.all(
      updatedData.replies.map(async (reply) => {
        const replyUserData = await fetchUserData(reply.userId);
        return {
          ...reply,
          role: reply.role || replyUserData?.role || "USER",
          avatarUrl: replyUserData?.avatarUrl,
        };
      })
    );

    return {
      id: commentId,
      userId: updatedData.userId,
      user: updatedData.username,
      role: userData?.role || EnumRole.USER,
      avatarUrl: userData?.avatarUrl,
      content: updatedData.content,
      likes: updatedData.likes || 0,
      dislikes: updatedData.dislikes || 0,
      likedBy: updatedData.likedBy || [],
      dislikedBy: updatedData.dislikedBy || [],
      replies: repliesWithUserData.map((reply) => ({
        id: reply.id || "",
        userId: reply.userId,
        user: reply.username,
        role: reply.role as EnumRoleType,
        avatarUrl: reply.avatarUrl,
        content: reply.content,
        likes: reply.likes || 0,
        dislikes: reply.dislikes || 0,
        likedBy: reply.likedBy || [],
        dislikedBy: reply.dislikedBy || [],
        createdAt: reply.createdAt,
      })),
      date: new Date(updatedData.createdAt).toLocaleDateString("ru-RU"),
      createdAt: updatedData.createdAt,
    };
  } catch (error) {
    throw new Error("Не удалось поставить лайк на ответ");
  }
};

// Дизлайк ответа
export const dislikeReply = async (commentId: string, replyId: string, userId: string): Promise<Comment> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    const commentData = commentDoc.data();
    if (!isValidCommentData(commentData)) {
      throw new Error("Неверный формат данных комментария");
    }

    const reply = commentData.replies.find((r) => r.id === replyId);
    if (!reply) {
      throw new Error("Ответ не найден");
    }

    const hasLiked = reply.likedBy.includes(userId);
    const hasDisliked = reply.dislikedBy.includes(userId);

    const updatedReplies = commentData.replies.map((r) =>
      r.id === replyId
        ? {
            ...r,
            dislikes: hasDisliked ? r.dislikes - 1 : r.dislikes + 1,
            dislikedBy: hasDisliked ? r.dislikedBy.filter((id) => id !== userId) : [...r.dislikedBy, userId],
            likes: hasLiked ? r.likes - 1 : r.likes,
            likedBy: hasLiked ? r.likedBy.filter((id) => id !== userId) : r.likedBy,
          }
        : r
    );

    await updateDoc(commentRef, {
      replies: updatedReplies,
    });

    const updatedCommentDoc = await getDoc(commentRef);
    const updatedData = updatedCommentDoc.data();
    if (!isValidCommentData(updatedData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Загружаем данные пользователя для комментария
    const userData = await fetchUserData(updatedData.userId);

    // Загружаем данные пользователей для ответов
    const repliesWithUserData = await Promise.all(
      updatedData.replies.map(async (reply) => {
        const replyUserData = await fetchUserData(reply.userId);
        return {
          ...reply,
          role: reply.role || replyUserData?.role || "USER",
          avatarUrl: replyUserData?.avatarUrl,
        };
      })
    );

    return {
      id: commentId,
      userId: updatedData.userId,
      user: updatedData.username,
      role: userData?.role || EnumRole.USER,
      avatarUrl: userData?.avatarUrl,
      content: updatedData.content,
      likes: updatedData.likes || 0,
      dislikes: updatedData.dislikes || 0,
      likedBy: updatedData.likedBy || [],
      dislikedBy: updatedData.dislikedBy || [],
      replies: repliesWithUserData.map((reply) => ({
        id: reply.id || "",
        userId: reply.userId,
        user: reply.username,
        role: reply.role as EnumRoleType,
        avatarUrl: reply.avatarUrl,
        content: reply.content,
        likes: reply.likes || 0,
        dislikes: reply.dislikes || 0,
        likedBy: reply.likedBy || [],
        dislikedBy: reply.dislikedBy || [],
        createdAt: reply.createdAt,
      })),
      date: new Date(updatedData.createdAt).toLocaleDateString("ru-RU"),
      createdAt: updatedData.createdAt,
    };
  } catch (error) {
    throw new Error("Не удалось поставить дизлайк на ответ");
  }
};

// Удаление комментария
export const deleteComment = async (commentId: string, userId: string, userRole: string): Promise<void> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    const commentData = commentDoc.data();
    if (!commentData) {
      throw new Error("Данные комментария недоступны");
    }

    const isAuthor = commentData.userId === userId;
    const isAdmin = userRole === EnumRole.ADMIN;
    if (!isAuthor && !isAdmin) {
      throw new Error("У вас нет прав для удаления этого комментария");
    }

    await deleteDoc(commentRef);
  } catch (error) {
    throw new Error("Не удалось удалить комментарий: " + (error.message || "Неизвестная ошибка"));
  }
};

// Удаление ответа
export const deleteReply = async (commentId: string, replyId: string, userId: string, userRole: string): Promise<Comment> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    const commentData = commentDoc.data();
    if (!isValidCommentData(commentData)) {
      throw new Error("Неверный формат данных комментария");
    }

    const reply = commentData.replies.find((r) => r.id === replyId);
    if (!reply) {
      throw new Error("Ответ не найден");
    }

    const isAuthor = reply.userId === userId;
    const isAdmin = userRole === "ADMIN";
    if (!isAuthor && !isAdmin) {
      throw new Error("У вас нет прав для удаления этого ответа");
    }

    const updatedReplies = commentData.replies.filter((r) => r.id !== replyId);
    await updateDoc(commentRef, {
      replies: updatedReplies,
    });

    const updatedCommentDoc = await getDoc(commentRef);
    const updatedData = updatedCommentDoc.data();
    if (!isValidCommentData(updatedData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Загружаем данные пользователя для комментария
    const userData = await fetchUserData(updatedData.userId);

    // Загружаем данные пользователей для ответов
    const repliesWithUserData = await Promise.all(
      updatedData.replies.map(async (reply) => {
        const replyUserData = await fetchUserData(reply.userId);
        return {
          ...reply,
          role: reply.role || replyUserData?.role || "USER",
          avatarUrl: replyUserData?.avatarUrl,
        };
      })
    );

    return {
      id: commentId,
      userId: updatedData.userId,
      user: updatedData.username,
      role: userData?.role || EnumRole.USER,
      avatarUrl: userData?.avatarUrl,
      content: updatedData.content,
      likes: updatedData.likes || 0,
      dislikes: updatedData.dislikes || 0,
      likedBy: updatedData.likedBy || [],
      dislikedBy: updatedData.dislikedBy || [],
      replies: repliesWithUserData.map((reply) => ({
        id: reply.id || "",
        userId: reply.userId,
        user: reply.username,
        role: reply.role as EnumRoleType,
        avatarUrl: reply.avatarUrl,
        content: reply.content,
        likes: reply.likes || 0,
        dislikes: reply.dislikes || 0,
        likedBy: reply.likedBy || [],
        dislikedBy: reply.dislikedBy || [],
        createdAt: reply.createdAt,
      })),
      date: new Date(updatedData.createdAt).toLocaleDateString("ru-RU"),
      createdAt: updatedData.createdAt,
    };
  } catch (error) {
    throw new Error("Не удалось удалить ответ: " + (error.message || "Неизвестная ошибка"));
  }
};

// Редактирование комментария
export const editComment = async (commentId: string, userId: string, userRole: string, newContent: string): Promise<Comment> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    const commentData = commentDoc.data();
    if (!isValidCommentData(commentData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Проверка прав на редактирование (только автор или админ могут редактировать)
    const isAuthor = commentData.userId === userId;
    const isAdmin = userRole === EnumRole.ADMIN;
    
    if (!isAuthor && !isAdmin) {
      throw new Error("У вас нет прав для редактирования этого комментария");
    }
    
    // Если пользователь заблокирован, он не может редактировать комментарии
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;
    
    if (userData?.isBanned) {
      throw new Error("Вы не можете редактировать комментарии, так как заблокированы");
    }

    // Обновляем содержимое комментария
    await updateDoc(commentRef, {
      content: newContent,
      updatedAt: new Date().toISOString() // Добавляем отметку о времени редактирования
    });

    // Получаем обновленный комментарий
    const updatedCommentDoc = await getDoc(commentRef);
    const updatedData = updatedCommentDoc.data();
    if (!isValidCommentData(updatedData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Загружаем данные пользователя для комментария
    const commentUserData = await fetchUserData(updatedData.userId);

    // Загружаем данные пользователей для ответов
    const repliesWithUserData = await Promise.all(
      updatedData.replies.map(async (reply) => {
        const replyUserData = await fetchUserData(reply.userId);
        return {
          ...reply,
          role: reply.role || replyUserData?.role || "USER",
          avatarUrl: replyUserData?.avatarUrl,
          isBanned: replyUserData?.isBanned || false,
        };
      })
    );

    return {
      id: commentId,
      userId: updatedData.userId,
      user: updatedData.username,
      role: commentUserData?.role,
      avatarUrl: commentUserData?.avatarUrl || "/placeholder.svg",
      content: updatedData.content,
      likes: updatedData.likes,
      dislikes: updatedData.dislikes,
      likedBy: updatedData.likedBy,
      dislikedBy: updatedData.dislikedBy,
      isBanned: commentUserData?.isBanned || false,
      replies: repliesWithUserData,
      date: new Date(updatedData.createdAt).toLocaleDateString("ru-RU"),
      createdAt: updatedData.createdAt,
      updatedAt: updatedData.updatedAt
    };
  } catch (error) {
    throw new Error("Не удалось отредактировать комментарий: " + (error.message || "Неизвестная ошибка"));
  }
};

// Редактирование ответа
export const editReply = async (commentId: string, replyId: string, userId: string, userRole: string, newContent: string): Promise<Comment> => {
  try {
    const commentRef = doc(db, "comments", commentId);
    const commentDoc = await getDoc(commentRef);
    if (!commentDoc.exists()) {
      throw new Error("Комментарий не найден");
    }

    const commentData = commentDoc.data();
    if (!isValidCommentData(commentData)) {
      throw new Error("Неверный формат данных комментария");
    }

    const reply = commentData.replies.find((r) => r.id === replyId);
    if (!reply) {
      throw new Error("Ответ не найден");
    }

    // Проверка прав на редактирование (только автор или админ могут редактировать)
    const isAuthor = reply.userId === userId;
    const isAdmin = userRole === EnumRole.ADMIN;
    
    if (!isAuthor && !isAdmin) {
      throw new Error("У вас нет прав для редактирования этого ответа");
    }
    
    // Если пользователь заблокирован, он не может редактировать ответы
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;
    
    if (userData?.isBanned) {
      throw new Error("Вы не можете редактировать ответы, так как заблокированы");
    }

    // Обновляем содержимое ответа
    const updatedReplies = commentData.replies.map((r) =>
      r.id === replyId
        ? {
            ...r,
            content: newContent,
            updatedAt: new Date().toISOString() // Добавляем отметку о времени редактирования
          }
        : r
    );

    await updateDoc(commentRef, {
      replies: updatedReplies,
    });

    // Получаем обновленный комментарий
    const updatedCommentDoc = await getDoc(commentRef);
    const updatedData = updatedCommentDoc.data();
    if (!isValidCommentData(updatedData)) {
      throw new Error("Неверный формат данных комментария");
    }

    // Загружаем данные пользователя для комментария
    const commentUserData = await fetchUserData(updatedData.userId);

    // Загружаем данные пользователей для ответов
    const repliesWithUserData = await Promise.all(
      updatedData.replies.map(async (reply) => {
        const replyUserData = await fetchUserData(reply.userId);
        return {
          ...reply,
          role: reply.role || replyUserData?.role || "USER",
          avatarUrl: replyUserData?.avatarUrl,
          isBanned: replyUserData?.isBanned || false,
        };
      })
    );

    return {
      id: commentId,
      userId: updatedData.userId,
      user: updatedData.username,
      role: commentUserData?.role,
      avatarUrl: commentUserData?.avatarUrl || "/placeholder.svg",
      content: updatedData.content,
      likes: updatedData.likes,
      dislikes: updatedData.dislikes,
      likedBy: updatedData.likedBy,
      dislikedBy: updatedData.dislikedBy,
      isBanned: commentUserData?.isBanned || false,
      replies: repliesWithUserData,
      date: new Date(updatedData.createdAt).toLocaleDateString("ru-RU"),
      createdAt: updatedData.createdAt,
      updatedAt: updatedData.updatedAt
    };
  } catch (error) {
    throw new Error("Не удалось отредактировать ответ: " + (error.message || "Неизвестная ошибка"));
  }
};
