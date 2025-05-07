import { db } from "@/lib/firebaseConfig";
import { addDoc, collection, doc, getDoc, getDocs, increment, query, updateDoc, where, deleteDoc } from "firebase/firestore";
import { AuthUser } from "@/hooks/useAuth";
import { SERVER_URL, logger } from "@/lib/utils";
import { UserData } from "@/types/userTypes";
import { EnumRoleType } from "@/enums/role";

export const fetchUserData = async (userId: string) => {
  const userDoc = await getDoc(doc(db, "users", userId));
  return userDoc.exists() ? (userDoc.data() as UserData) : null;
};

// Получение статистики пользователя
export const getUserStats = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error("Пользователь не найден");
    }

    const userData = userDoc.data();
    return {
      readReviews: userData.readReviews || 0,
    };
  } catch (error) {
    throw new Error("Не удалось загрузить статистику пользователя: " + (error.message || "Неизвестная ошибка"));
  }
};

// Увеличение количества прочитанных рецензий
export const incrementReadReviews = async (userId: string, reviewId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error("Пользователь не найден");
    }

    // Проверяем, читал ли пользователь эту рецензию ранее
    const readReviewsRef = collection(db, `users/${userId}/readReviews`);
    const q = query(readReviewsRef, where("reviewId", "==", reviewId));
    const readReviewsSnapshot = await getDocs(q);

    if (!readReviewsSnapshot.empty) {
      // Пользователь уже читал эту рецензию
      return false;
    }

    // Добавляем запись о прочтении
    await addDoc(readReviewsRef, {
      reviewId,
      readAt: new Date().toISOString(),
    });

    // Увеличиваем счётчик прочитанных рецензий пользователя
    await updateDoc(userRef, {
      readReviews: increment(1),
    });

    // Увеличиваем счётчик уникальных просмотров рецензии
    const reviewRef = doc(db, "reviews", reviewId);
    await updateDoc(reviewRef, {
      uniqueViews: increment(1),
    });

    return true;
  } catch (error) {
    throw new Error("Не удалось обновить статистику прочитанных рецензий: " + (error.message || "Неизвестная ошибка"));
  }
};

// Инициализация статистики для нового пользователя
export const initializeUserStats = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error("Пользователь не найден");
    }

    const userData = userDoc.data();
    if (!("readReviews" in userData)) {
      await updateDoc(userRef, {
        readReviews: 0,
      });
    }
  } catch (error) {
    throw new Error("Не удалось инициализировать статистику пользователя: " + (error.message || "Неизвестная ошибка"));
  }
};

export const updateAvatar = async (user: AuthUser, file: File) => {
  if (!user.uid) throw new Error("User ID not found");

  // Получаем текущий аватар из Firestore
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const oldAvatarUrl = userDoc.data()?.avatarUrl;

  // Удаляем старый аватар с сервера, если он существует
  if (oldAvatarUrl) {
    await fetch(`${SERVER_URL}/delete-avatar`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: oldAvatarUrl, username: user.displayName }),
    });
  }

  // Загружаем новый аватар на сервер
  const formData = new FormData();
  formData.append("avatar", file);
  formData.append("username", user.displayName);
  const response = await fetch(`${SERVER_URL}/upload-avatar`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Ошибка загрузки аватара");
  }

  const avatarUrl = data.avatarUrl;

  // Обновляем путь в Firestore
  await updateDoc(doc(db, "users", user.uid), { avatarUrl });
  return avatarUrl;
};

export const deleteAvatar = async (user: AuthUser) => {
  if (!user.uid) throw new Error("User ID not found");

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const avatarUrl = userDoc.data()?.avatarUrl;

  if (avatarUrl) {
    // Удаляем файл с сервера
    const response = await fetch(`${SERVER_URL}/delete-avatar`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl, username: user.displayName }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Ошибка удаления аватара");
    }

    await updateDoc(doc(db, "users", user.uid), { avatarUrl: null });
  }
};

export const getUserData = async (uid: string) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? userDoc.data() : null;
};

// Поиск пользователя по имени (используем displayName вместо username) с учетом регистра
export const getUserByUsername = async (displayName: string): Promise<UserData | null> => {
  try {
    const usersRef = collection(db, "users");
    // Ищем точное совпадение имени пользователя без учета регистра
    const q = query(usersRef, where("username", "==", displayName));
    let querySnapshot = await getDocs(q);

    // Если не нашли точное совпадение, пробуем поиск по нижнему регистру
    if (querySnapshot.empty) {
      const qLower = query(usersRef, where("username", "==", displayName.toLowerCase()));
      querySnapshot = await getDocs(qLower);
    }

    // Если все еще не нашли, пробуем поиск с первой заглавной буквой
    if (querySnapshot.empty && displayName.length > 0) {
      const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
      const qCapitalized = query(usersRef, where("username", "==", capitalized));
      querySnapshot = await getDocs(qCapitalized);
    }

    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const data = userDoc.data();
    return {
      uid: userDoc.id,
      username: data.username,
      avatarUrl: data.avatarUrl,
      role: data.role,
      isBanned: data.isBanned || false,
    };
  } catch (error) {
    throw new Error("Не удалось загрузить данные пользователя");
  }
};

// Получение всех пользователей
export const getAllUsers = async (): Promise<UserData[]> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);

    const users: UserData[] = [];
    querySnapshot.forEach((userDoc) => {
      const data = userDoc.data() as { 
        username: string; 
        avatarUrl?: string; 
        role: string; 
        isBanned?: boolean;
        emailVerified?: boolean;
        email?: string;
      };
      
      users.push({
        uid: userDoc.id,
        username: data.username,
        avatarUrl: data.avatarUrl,
        role: data.role as EnumRoleType,
        isBanned: data.isBanned || false,
        emailVerified: data.emailVerified || false,
        email: data.email || "",
      });
    });

    return users;
  } catch (error) {
    logger.error("Ошибка при получении пользователей:", error);
    throw new Error("Не удалось загрузить данные пользователей");
  }
};

// Поиск всех пользователей по написанию никнейма в поле
export const searchUsers = async (substring: string): Promise<UserData[]> => {
  try {
    const usersRef = collection(db, "users");
    let q;
    
    if (substring === '') {
      // Для пустого запроса возвращаем всех пользователей
      q = query(usersRef);
    } else {
      // Получаем всех пользователей и фильтруем их в памяти
      q = query(usersRef);
    }
    
    const querySnapshot = await getDocs(q);

    const users: UserData[] = [];
    querySnapshot.forEach((userDoc) => {
      const data = userDoc.data() as { 
        username: string; 
        avatarUrl?: string; 
        role: string; 
        isBanned?: boolean;
        emailVerified?: boolean;
      };
      
      // Для непустого запроса фильтруем по вхождению подстроки в имя пользователя без учета регистра
      if (substring === '' || data.username.toLowerCase().includes(substring.toLowerCase())) {
        users.push({
          uid: userDoc.id,
          username: data.username,
          avatarUrl: data.avatarUrl,
          role: data.role as EnumRoleType,
          isBanned: data.isBanned || false,
          emailVerified: data.emailVerified || false,
        });
      }
    });

    return users;
  } catch (error) {
    console.error("Ошибка при поиске пользователей:", error);
    throw new Error("Не удалось загрузить данные пользователей");
  }
};

// Обновление роли пользователя
export const updateUserRole = async (userId: string, newRole: string) => {
  try {
    logger.log(`Обновление роли пользователя ${userId} на ${newRole}`);
    const userRef = doc(db, "users", userId);
    
    // Проверяем существование пользователя
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error("Пользователь не найден");
    }
    
    // Отладочная информация: что находится в БД до обновления
    logger.log("Текущие данные пользователя в БД:", userDoc.data());
    
    // Создаем объект с данными для обновления
    const updateData: Record<string, any> = { role: newRole };
    
    logger.log("Данные для обновления:", updateData);
    
    // Обновляем роль в базе данных
    await updateDoc(userRef, updateData);
    
    // Ждем 500 мс, чтобы дать Firebase время на обновление данных
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Получаем обновленные данные для проверки и возврата
    const updatedUserDoc = await getDoc(userRef);
    const updatedData = updatedUserDoc.data();
    logger.log(`Роль пользователя ${userId} обновлена. Новые данные:`, updatedData);
    
    return {
      ...(updatedData || {}),
      uid: userId,
      role: updatedData?.role // Возвращаем именно то, что сохранено в БД
    };
  } catch (error) {
    logger.error("Ошибка при обновлении роли пользователя:", error);
    throw new Error("Не удалось обновить роль пользователя: " + (error.message || "Неизвестная ошибка"));
  }
};

// Обновление статуса блокировки пользователя
export const updateUserBanStatus = async (userId: string, isBanned: boolean) => {
  try {
    const userRef = doc(db, "users", userId);
    const updateData: Record<string, any> = { isBanned };
    
    if (isBanned) {
      updateData.banDate = new Date().toISOString();
    } else {
      updateData.unbanDate = new Date().toISOString();
    }
    
    await updateDoc(userRef, updateData);
  } catch (error) {
    throw new Error("Не удалось обновить статус блокировки: " + (error.message || "Неизвестная ошибка"));
  }
};

// Альтернативное название для updateUserBanStatus для удобства использования
export const toggleUserBan = async (userId: string, isBanned: boolean) => {
  return updateUserBanStatus(userId, isBanned);
};

// Флаг для отслеживания выполнения функции promoteFeodorToAdmin
let feodorAdminPromoteAttempted = false;

// Функция для назначения пользователя "Федосер" администратором
export const promoteFeodorToAdmin = async () => {
  // Если функция уже была вызвана, не выполняем повторный запрос
  if (feodorAdminPromoteAttempted) {
    logger.log("Попытка сделать Федосера админом уже была выполнена в этой сессии");
    return true;
  }

  try {
    // Поиск пользователя "Федосер" по имени
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", "Федосер"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      feodorAdminPromoteAttempted = true; // Отмечаем, что попытка была сделана
      throw new Error("Пользователь 'Федосер' не найден");
    }
    
    // Берем первого найденного пользователя (должен быть только один)
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    // Проверяем, является ли пользователь уже администратором
    if (userData.role === "ADMIN") {
      logger.log("Пользователь 'Федосер' уже является администратором");
      feodorAdminPromoteAttempted = true; // Отмечаем, что попытка была сделана
      return true;
    }
    
    // Обновляем его роль на ADMIN
    await updateUserRole(userId, "ADMIN");
    feodorAdminPromoteAttempted = true; // Отмечаем, что попытка была сделана
    
    logger.log("Пользователь 'Федосер' успешно назначен администратором");
    return true;
  } catch (error) {
    feodorAdminPromoteAttempted = true; // Отмечаем, что попытка была сделана даже при ошибке
    logger.error("Ошибка при назначении 'Федосер' администратором:", error);
    throw new Error("Не удалось назначить 'Федосер' администратором: " + 
      (error instanceof Error ? error.message : "неизвестная ошибка"));
  }
};

// Получение пользователей с пагинацией
export const getUsersPaginated = async (page: number = 1, limit: number = 10, searchQuery: string = ""): Promise<{ users: UserData[], total: number }> => {
  try {
    const usersRef = collection(db, "users");
    // Для всех запросов получаем все документы и выполняем фильтрацию на стороне клиента
    const q = query(usersRef);
    
    // Получаем все документы
    const querySnapshot = await getDocs(q);
    
    const allUsers: UserData[] = [];
    querySnapshot.forEach((userDoc) => {
      const data = userDoc.data() as { 
        username: string; 
        avatarUrl?: string; 
        role: string; 
        isBanned?: boolean;
        emailVerified?: boolean;
        email?: string;
      };
      
      // Фильтрация в памяти по имени пользователя (без учета регистра)
      if (searchQuery.trim() === '' || 
          data.username.toLowerCase().includes(searchQuery.toLowerCase())) {
        allUsers.push({
          uid: userDoc.id,
          username: data.username,
          avatarUrl: data.avatarUrl,
          role: data.role as EnumRoleType,
          isBanned: data.isBanned || false,
          emailVerified: data.emailVerified || false,
          email: data.email || "",
        });
      }
    });
    
    // Определяем общее количество после фильтрации
    const total = allUsers.length;
    
    // Применяем пагинацию в памяти
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = allUsers.slice(startIndex, endIndex);
    
    return {
      users: paginatedUsers,
      total
    };
  } catch (error) {
    logger.error("Ошибка при получении пользователей:", error);
    throw new Error("Не удалось загрузить данные пользователей");
  }
};

// ************ Подписчики ************

// Подписаться на пользователя
export const subscribeToUser = async (userId: string, targetUserId: string): Promise<void> => {
  try {
    if (userId === targetUserId) {
      throw new Error("Нельзя подписаться на самого себя");
    }

    // Проверяем, существует ли пользователь, на которого подписываемся
    const targetUserDoc = await getDoc(doc(db, "users", targetUserId));
    if (!targetUserDoc.exists()) {
      throw new Error("Пользователь не найден");
    }

    // Проверяем, не подписан ли уже пользователь
    const subscriptionRef = collection(db, "subscribers");
    const q = query(
      subscriptionRef, 
      where("subscriberId", "==", userId),
      where("targetUserId", "==", targetUserId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error("Вы уже подписаны на этого пользователя");
    }

    // Создаем новую запись о подписке
    await addDoc(subscriptionRef, {
      subscriberId: userId,
      targetUserId: targetUserId,
      subscribedAt: new Date().toISOString()
    });

    // Увеличиваем счетчики подписчиков и подписок
    await updateDoc(doc(db, "users", targetUserId), {
      subscribersCount: increment(1)
    });

    await updateDoc(doc(db, "users", userId), {
      subscriptionsCount: increment(1)
    });

  } catch (error) {
    throw new Error("Не удалось подписаться на пользователя: " + (error.message || "Неизвестная ошибка"));
  }
};

// Отписаться от пользователя
export const unsubscribeFromUser = async (userId: string, targetUserId: string): Promise<void> => {
  try {
    // Проверяем, есть ли подписка
    const subscriptionRef = collection(db, "subscribers");
    const q = query(
      subscriptionRef, 
      where("subscriberId", "==", userId),
      where("targetUserId", "==", targetUserId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Вы не подписаны на этого пользователя");
    }

    // Удаляем запись о подписке
    const subscriptionDoc = snapshot.docs[0];
    await deleteDoc(doc(db, "subscribers", subscriptionDoc.id));

    // Уменьшаем счетчики подписчиков и подписок
    await updateDoc(doc(db, "users", targetUserId), {
      subscribersCount: increment(-1)
    });

    await updateDoc(doc(db, "users", userId), {
      subscriptionsCount: increment(-1)
    });

  } catch (error) {
    throw new Error("Не удалось отписаться от пользователя: " + (error.message || "Неизвестная ошибка"));
  }
};

// Проверить, подписан ли пользователь на другого пользователя
export const checkSubscription = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    const subscriptionRef = collection(db, "subscribers");
    const q = query(
      subscriptionRef, 
      where("subscriberId", "==", userId),
      where("targetUserId", "==", targetUserId)
    );
    const snapshot = await getDocs(q);

    return !snapshot.empty;
  } catch (error) {
    throw new Error("Не удалось проверить статус подписки: " + (error.message || "Неизвестная ошибка"));
  }
};

// Получить список подписчиков пользователя
export const getUserSubscribers = async (userId: string): Promise<UserData[]> => {
  try {
    const subscriptionRef = collection(db, "subscribers");
    const q = query(subscriptionRef, where("targetUserId", "==", userId));
    const snapshot = await getDocs(q);

    const subscribers: UserData[] = [];
    for (const docSnapshot of snapshot.docs) {
      const subscriberId = docSnapshot.data().subscriberId;
      const userDoc = await getDoc(doc(db, "users", subscriberId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        subscribers.push({
          uid: userDoc.id,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
          role: userData.role,
          isBanned: userData.isBanned || false
        });
      }
    }

    return subscribers;
  } catch (error) {
    throw new Error("Не удалось получить список подписчиков: " + (error.message || "Неизвестная ошибка"));
  }
};

// Получить список подписок пользователя
export const getUserSubscriptions = async (userId: string): Promise<UserData[]> => {
  try {
    const subscriptionRef = collection(db, "subscribers");
    const q = query(subscriptionRef, where("subscriberId", "==", userId));
    const snapshot = await getDocs(q);

    const subscriptions: UserData[] = [];
    for (const docSnapshot of snapshot.docs) {
      const targetUserId = docSnapshot.data().targetUserId;
      const userDoc = await getDoc(doc(db, "users", targetUserId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        subscriptions.push({
          uid: userDoc.id,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
          role: userData.role,
          isBanned: userData.isBanned || false
        });
      }
    }

    return subscriptions;
  } catch (error) {
    throw new Error("Не удалось получить список подписок: " + (error.message || "Неизвестная ошибка"));
  }
};

// Инициализировать счетчики подписчиков и подписок для пользователя
export const initializeSubscriberStats = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("Пользователь не найден");
    }

    const userData = userDoc.data();
    const updateData: Record<string, any> = {};

    if (!("subscribersCount" in userData)) {
      updateData.subscribersCount = 0;
    }

    if (!("subscriptionsCount" in userData)) {
      updateData.subscriptionsCount = 0;
    }

    if (Object.keys(updateData).length > 0) {
      await updateDoc(userRef, updateData);
    }
  } catch (error) {
    throw new Error("Не удалось инициализировать статистику подписчиков: " + (error.message || "Неизвестная ошибка"));
  }
};

// Обновить счетчики подписчиков и подписок на основе актуальных данных
export const updateSubscriptionCounters = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("Пользователь не найден");
    }

    // Получаем актуальное количество подписчиков
    const subscribersRef = collection(db, "subscribers");
    const subscribersQuery = query(subscribersRef, where("targetUserId", "==", userId));
    const subscribersSnapshot = await getDocs(subscribersQuery);
    const subscribersCount = subscribersSnapshot.size;

    // Получаем актуальное количество подписок
    const subscriptionsQuery = query(subscribersRef, where("subscriberId", "==", userId));
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    const subscriptionsCount = subscriptionsSnapshot.size;

    // Обновляем данные в Firestore
    await updateDoc(userRef, {
      subscribersCount,
      subscriptionsCount
    });

    logger.log(`Счетчики подписок обновлены для пользователя ${userId}: подписчики=${subscribersCount}, подписки=${subscriptionsCount}`);
    
    return;
  } catch (error) {
    logger.error("Ошибка при обновлении счетчиков подписок:", error);
    throw new Error("Не удалось обновить счетчики подписок: " + (error.message || "Неизвестная ошибка"));
  }
};
// Получить общее количество пользователей
export const getTotalUsersCount = async (): Promise<number> => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.size;
  } catch (error) {
    logger.error("Ошибка при получении количества пользователей:", error);
    throw new Error("Не удалось получить количество пользователей");
  }
};