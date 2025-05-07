import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthorCacheData, UserData } from '@/types/userTypes';
import { getUserData } from '@/services/userService';

// Время жизни кеша в миллисекундах (30 минут по умолчанию)
const CACHE_TTL = 30 * 60 * 1000;

// Интерфейс контекста
interface AuthorContextType {
  // Получение данных автора с учетом кеша
  getAuthor: (userId: string) => {
    author: UserData | null;
    loading: boolean;
    error: string | null;
  };
  // Очистка кеша для конкретного автора
  clearAuthorCache: (userId: string) => void;
  // Полная очистка кеша
  clearAllCache: () => void;
}

// Создание контекста
const AuthorContext = createContext<AuthorContextType | undefined>(undefined);

// Провайдер контекста
export const AuthorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Состояние кеша авторов
  const [authorCache, setAuthorCache] = useState<AuthorCacheData>({});

  // Получение данных автора с учетом кеша
  const getAuthor = useCallback((userId: string) => {
    const now = Date.now();
    const cachedData = authorCache[userId];

    // Если в кеше есть данные и они не устарели
    if (
      cachedData && 
      !cachedData.loading && 
      (now - cachedData.timestamp < CACHE_TTL)
    ) {
      return {
        author: cachedData.data,
        loading: false,
        error: cachedData.error
      };
    }

    // Установка состояния загрузки, если данных нет или они устарели
    if (!cachedData || (now - cachedData.timestamp >= CACHE_TTL)) {
      // Обновление кеша, установка состояния загрузки
      setAuthorCache(prev => ({
        ...prev,
        [userId]: {
          data: prev[userId]?.data || null,
          timestamp: prev[userId]?.timestamp || 0,
          loading: true,
          error: null
        }
      }));

      // Запуск асинхронного получения данных
      (async () => {
        try {
          const userData = await getUserData(userId);
          
          // Преобразуем данные из Firebase в объект UserData
          const authorData: UserData | null = userData ? {
            uid: userId,
            username: userData.username || 'Неизвестный пользователь',
            avatarUrl: userData.avatarUrl,
            role: userData.role,
            isBanned: userData.isBanned || false,
            emailVerified: userData.emailVerified,
            email: userData.email
          } : null;
          
          setAuthorCache(prev => ({
            ...prev,
            [userId]: {
              data: authorData,
              timestamp: Date.now(),
              loading: false,
              error: null
            }
          }));
        } catch (error) {
          setAuthorCache(prev => ({
            ...prev,
            [userId]: {
              data: null,
              timestamp: Date.now(),
              loading: false,
              error: error instanceof Error ? error.message : 'Ошибка при загрузке данных автора'
            }
          }));
        }
      })();
    }

    // Возвращаем текущие данные из кеша (могут быть в состоянии загрузки)
    return {
      author: authorCache[userId]?.data || null,
      loading: authorCache[userId]?.loading || true,
      error: authorCache[userId]?.error || null
    };
  }, [authorCache]);

  // Очистка кеша для конкретного автора
  const clearAuthorCache = useCallback((userId: string) => {
    setAuthorCache(prev => {
      const newCache = { ...prev };
      delete newCache[userId];
      return newCache;
    });
  }, []);

  // Полная очистка кеша
  const clearAllCache = useCallback(() => {
    setAuthorCache({});
  }, []);

  // Экспортируемые значения контекста
  const value = {
    getAuthor,
    clearAuthorCache,
    clearAllCache
  };

  return (
    <AuthorContext.Provider value={value}>
      {children}
    </AuthorContext.Provider>
  );
};

// Хук для использования контекста
export const useAuthor = () => {
  const context = useContext(AuthorContext);
  if (context === undefined) {
    throw new Error('useAuthor must be used within an AuthorProvider');
  }
  return context;
}; 