import { getUserReviews } from '@/services/reviewService';
import { Review } from '@/types/reviewTypes';
import { EnumStatus } from '@/enums/status';

/**
 * Получение рецензий пользователя, которые были одобрены или отклонены
 * @param userId ID пользователя
 * @returns Массив рецензий с измененным статусом
 */
export const getUserReviewsWithStatusChanges = async (userId: string): Promise<Review[]> => {
  try {
    // Получаем все рецензии пользователя
    const allReviews = await getUserReviews(userId);
    
    // Фильтруем только те, у которых статус APPROVED или REJECTED
    const statusChangedReviews = allReviews.filter(
      review => review.status === EnumStatus.APPROVED || review.status === EnumStatus.REJECTED
    );
    
    return statusChangedReviews;
  } catch (error) {
    console.error('Ошибка при получении рецензий со статусом:', error);
    return [];
  }
};

/**
 * Отметка рецензии как просмотренной
 * @param reviewId ID рецензии
 */
export const markReviewAsRead = (reviewId: string): void => {
  const key = `sf_review_notification_${reviewId}`;
  localStorage.setItem(key, 'true');
};

/**
 * Проверка, была ли рецензия просмотрена
 * @param reviewId ID рецензии
 * @returns true, если рецензия была просмотрена
 */
export const isReviewRead = (reviewId: string): boolean => {
  const key = `sf_review_notification_${reviewId}`;
  return localStorage.getItem(key) === 'true';
}; 