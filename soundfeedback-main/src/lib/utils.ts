import { EnumRating, EnumRatingType } from "@/enums/rating";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Определяем URL сервера с учетом возможных проблем с локальной сетью
const getServerUrl = () => {
  const envServerUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  
  // Получаем хост, на котором запущен сайт
  const currentHost = window.location.hostname;
  
  // Если мы на localhost или 127.0.0.1, используем envServerUrl как есть
  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    return envServerUrl;
  }
  
  // Если мы обращаемся с другого устройства или по IP, то используем тот же хост,
  // но с портом сервера (обычно 3000)
  // Это позволяет обращаться к серверу с того же устройства, где он запущен
  return `http://${currentHost}:3000`;
};

export const SERVER_URL = getServerUrl();

// Утилита для объединения классов Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Централизованная утилита для логирования в приложении
 * Отключает логи в продакшн-режиме, но сохраняет в разработке
 */
export const logger = {
  log: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Ошибки логируем всегда, но в продакшене можно было бы отправлять в сервис мониторинга
    console.error(...args);
  },
  warn: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.info(...args);
    }
  }
};

// Функция для получения цвета в зависимости от оценки
export function getRatingColor(rating: EnumRatingType, style: "text" | "bg" | "border" = "text") {
  // Если рейтинг не указан, возвращаем серый цвет
  if (rating === null) {
    if (style === "text") return "text-gray-500";
    if (style === "bg") return "bg-gray-200";
    return "border-gray-300";
  }

  // Определяем класс в зависимости от рейтинга и стиля
  switch (rating) {
    case "RECOMMEND":
      if (style === "text") return "text-rating-positive";
      if (style === "bg") return "bg-rating-positive";
      return "border-rating-positive";
    case "NEUTRAL":
      if (style === "text") return "text-rating-neutral";
      if (style === "bg") return "bg-rating-neutral";
      return "border-rating-neutral";
    case "NOT_RECOMMEND":
      if (style === "text") return "text-rating-negative";
      if (style === "bg") return "bg-rating-negative";
      return "border-rating-negative";
    default:
      if (style === "text") return "text-gray-500";
      if (style === "bg") return "bg-gray-200";
      return "border-gray-300";
  }
}

interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "ghost";
}

// Получение инициалов пользователя из имени
export function getAvatarByUsername(username: string): string {
  if (!username) return "?";
  
  // Разбиваем имя пользователя на части (по пробелам или другим разделителям)
  const parts = username.split(/[\s_\-\.]+/).filter(Boolean);
  
  if (parts.length === 0) return "?";
  
  if (parts.length === 1) {
    // Если имя состоит из одной части, возвращаем первую букву
    return parts[0].charAt(0).toUpperCase();
  } else {
    // Если имя состоит из нескольких частей, возвращаем первые буквы первых двух частей
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
}

/**
 * Функция цензуры заменена на прозрачную функцию, которая возвращает исходный текст
 * @param text Исходный текст
 * @param options Опции (не используются)
 * @returns Исходный текст без изменений
 */
export const censorText = (
  text: string, 
  options: { 
    albums?: string[]; 
    artists?: string[];
    disableCensorship?: boolean; 
  } = {}
): string => {
  return text; // Просто возвращаем исходный текст без цензуры
};

/**
 * Создает дебаунсированную функцию, которая откладывает вызов
 * переданной функции до истечения заданного таймаута.
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait = 300) {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
  
  debounced.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}
