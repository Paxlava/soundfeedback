import { EnumRole, getRoleKey } from "@/enums/role";
import { auth, db } from "@/lib/firebaseConfig";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification as _sendEmailVerification, User, reauthenticateWithCredential, EmailAuthProvider, updatePassword, updateProfile } from "firebase/auth";
import { collection, setDoc, query, where, doc, getDocs, updateDoc } from "firebase/firestore";
import { logger } from "@/lib/utils";

export const registerUser = async (data: { username: string; email: string; password: string }) => {
  const { username, email, password } = data;

  try {
    // Проверяем, существует ли уже пользователь с таким никнеймом
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error("Никнейм уже занят. Пожалуйста, выберите другой.");
    }

    // Проверяем, существует ли пользователь с такой почтой в нашей базе
    const emailQuery = query(usersRef, where("email", "==", email));
    const emailQuerySnapshot = await getDocs(emailQuery);

    if (!emailQuerySnapshot.empty) {
      throw new Error("Пользователь с таким email уже зарегистрирован.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: username });

    const roleKey = getRoleKey(EnumRole.USER);

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: username,
      role: roleKey,
      avatarUrl: null,
      emailVerified: false,
      isBanned: false,
      createdAt: new Date().toISOString(),
      subscribersCount: 0,
      subscriptionsCount: 0
    });

    return user;
  } catch (error: any) {
    logger.error("Ошибка при регистрации:", error);
    
    // Обработка ошибок Firebase
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error("Пользователь с таким email уже зарегистрирован.");
        case 'auth/invalid-email':
          throw new Error("Некорректный email-адрес.");
        case 'auth/weak-password':
          throw new Error("Слишком простой пароль. Используйте не менее 6 символов.");
        case 'auth/operation-not-allowed':
          throw new Error("Операция регистрации по email и паролю не разрешена.");
        default:
          throw new Error(`Ошибка при регистрации: ${error.message}`);
      }
    }
    
    // Если это не FirebaseError, просто пробрасываем ошибку дальше
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const sendEmailVerification = async () => {
  if (auth.currentUser) {
    await _sendEmailVerification(auth.currentUser);
  }
};

// Реаутентификация пользователя
export const reauthenticateUser = async (user: User, password: string) => {
  try {
    const credential = EmailAuthProvider.credential(user.email!, password);
    await reauthenticateWithCredential(user, credential);
  } catch (error: any) {
    throw new FirebaseError(error.code, error.message);
  }
};

// Обновление имени пользователя
export const updateUsername = async (user: User, newUsername: string) => {
  try {
    // Проверяем, существует ли уже пользователь с таким никнеймом
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", newUsername));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error("Никнейм уже занят. Пожалуйста, выберите другой.");
    }

    // Обновление имени в Firebase Authentication
    await updateProfile(user, { displayName: newUsername });

    // Обновление имени в Firestore
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      username: newUsername,
    });

    // Обновление имени в Firebase Authentication
    await updateProfile(auth.currentUser!, { displayName: newUsername });
  } catch (error) {
    throw new Error("Не удалось обновить имя пользователя: " + (error.message || "Неизвестная ошибка"));
  }
};

// Обновление пароля
export const updateUserPassword = async (user: User, newPassword: string) => {
  try {
    await updatePassword(user, newPassword);
  } catch (error) {
    throw new Error("Не удалось обновить пароль: " + (error.message || "Неизвестная ошибка"));
  }
};

// Удаление аккаунта пользователя и всех его данных
export const deleteUserAccount = async (user: User, password: string) => {
  try {
    // Сначала проверяем пароль через реаутентификацию
    await reauthenticateUser(user, password);
    
    // Удаляем все рецензии пользователя
    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("userId", "==", user.uid));
    const reviewsSnapshot = await getDocs(q);
    
    const reviewDeletions = reviewsSnapshot.docs.map(docSnapshot => {
      return setDoc(doc(db, "reviews", docSnapshot.id), { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
    });
    
    await Promise.all(reviewDeletions);
    
    // Удаляем статистику пользователя
    const statsRef = doc(db, "userStats", user.uid);
    await setDoc(statsRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
    
    // Удаляем документ пользователя
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
    
    // Удаляем аккаунт из Firebase Authentication
    await user.delete();
    
  } catch (error: any) {
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/requires-recent-login') {
        throw new Error("Требуется повторная авторизация. Пожалуйста, выйдите и войдите снова.");
      }
    }
    throw new Error("Не удалось удалить аккаунт: " + (error.message || "Неизвестная ошибка"));
  }
};
