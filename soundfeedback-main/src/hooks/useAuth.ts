import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { registerUser, loginUser, logoutUser, sendEmailVerification, deleteUserAccount } from "@/services/authService";
import { getUserData } from "@/services/userService";
import { EnumRole, EnumRoleType, getRoleValue } from "@/enums/role";

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  role: EnumRoleType;
  avatarUrl: string | null;
  isBanned: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          const userData = await getUserData(firebaseUser.uid);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName,
            role: getRoleValue(userData?.role) || EnumRole.USER,
            avatarUrl: userData?.avatarUrl || null,
            isBanned: userData?.isBanned || false,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await loginUser(email, password);
    } catch (err: any) {
      setError(err.message || "Ошибка входа");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: { username: string; email: string; password: string }) => {
    try {
      setLoading(true);
      setError(null);
      await registerUser(data);
      await sendEmailVerification();
      if (auth.currentUser) {
        const userData = await getUserData(auth.currentUser.uid);
        setUser({
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          emailVerified: auth.currentUser.emailVerified,
          displayName: auth.currentUser.displayName,
          role: userData?.role || EnumRole.USER,
          avatarUrl: userData?.avatarUrl || null,
          isBanned: userData?.isBanned || false,
        });
      }
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Проверяем, заблокирован ли пользователь
      if (user?.isBanned) {
        throw new Error("Выход из системы невозможен, так как ваш аккаунт заблокирован");
      }
      
      await logoutUser();
      setUser(null);
    } catch (err: any) {
      setError(err.message || "Ошибка выхода");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteAccount = useCallback(async (password: string) => {
    try {
      setLoading(true);
      setError(null);
      if (!auth.currentUser) {
        throw new Error("Пользователь не авторизован");
      }
      await deleteUserAccount(auth.currentUser, password);
      setUser(null);
    } catch (err: any) {
      setError(err.message || "Ошибка удаления аккаунта");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await sendEmailVerification();
    } catch (err: any) {
      setError(err.message || "Ошибка отправки письма");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) {
      const userData = await getUserData(auth.currentUser.uid);
      setUser({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified,
        displayName: auth.currentUser.displayName,
        role: userData?.role || EnumRole.USER,
        avatarUrl: userData?.avatarUrl || null,
        isBanned: userData?.isBanned || false,
      });
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    deleteAccount,
    resendVerificationEmail,
    refreshUserData,
  };
};
