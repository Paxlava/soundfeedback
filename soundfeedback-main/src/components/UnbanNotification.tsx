import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getUserData } from '@/services/userService';
import { logger } from '@/lib/utils';

const UNBAN_NOTIFICATION_KEY = 'sf_unban_notification_shown';
const WAS_BANNED_KEY = 'sf_user_was_banned';

const UnbanNotification = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unbanReason, setUnbanReason] = useState<string | null>(null);
  const [lastBanReason, setLastBanReason] = useState<string | null>(null);
  const [unbanDate, setUnbanDate] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем, есть ли пользователь и не заблокирован ли он сейчас
    if (!user || user.isBanned) {
      setIsOpen(false);
      return;
    }

    // Проверяем, был ли пользователь ранее заблокирован, используя localStorage
    const userId = user.uid;
    const wasBannedBefore = localStorage.getItem(`${WAS_BANNED_KEY}_${userId}`);
    
    // Если пользователь был заблокирован ранее, проверяем данные о разблокировке
    if (wasBannedBefore === 'true') {
      // Используем переменную для отслеживания, если компонент демонтирован
      let isMounted = true;
      
      // Загружаем данные пользователя, чтобы получить причину разблокировки и дату
      const fetchUserData = async () => {
        try {
          const userData = await getUserData(userId);
          
          // Проверяем, что компонент все еще смонтирован перед обновлением state
          if (!isMounted) return;
          
          let shouldShowNotification = false;
          
          if (userData) {
            // Получаем причины и дату разблокировки
            if (userData.unbanReason) {
              setUnbanReason(userData.unbanReason);
            }
            if (userData.lastBanReason) {
              setLastBanReason(userData.lastBanReason);
            }
            if (userData.unbanDate) {
              setUnbanDate(userData.unbanDate);
            }
            
            // Проверяем, было ли уже показано уведомление о разблокировке
            // и сравниваем дату последнего показа с датой разблокировки
            const lastShownData = localStorage.getItem(`${UNBAN_NOTIFICATION_KEY}_${userId}`);
            
            if (!lastShownData) {
              // Если уведомление еще не показывалось, показываем его
              shouldShowNotification = true;
            } else if (userData.unbanDate) {
              try {
                // Парсим данные из localStorage
                const lastShownInfo = JSON.parse(lastShownData);
                const lastShownDate = new Date(lastShownInfo.date);
                const currentUnbanDate = new Date(userData.unbanDate);
                
                // Если текущая разблокировка произошла позже последнего показа уведомления,
                // то показываем уведомление снова
                if (currentUnbanDate > lastShownDate) {
                  shouldShowNotification = true;
                }
              } catch (e) {
                // Если возникла ошибка при парсинге, показываем уведомление
                shouldShowNotification = true;
                logger.error('Ошибка при проверке даты разблокировки:', e);
              }
            }
          }
          
          if (shouldShowNotification && isMounted) {
            // Открываем уведомление только если компонент все еще смонтирован
            setIsOpen(true);
          }
          
        } catch (error) {
          // Логируем ошибку, только если компонент смонтирован
          if (isMounted) {
            logger.error('Ошибка при получении данных пользователя:', error);
          }
        }
      };

      fetchUserData();
      
      // Cleanup функция, вызываемая при демонтировании компонента
      return () => {
        isMounted = false;
      };
    }
  }, [user]);

  const handleClose = () => {
    if (user) {
      // Сохраняем информацию, что уведомление было показано для этого пользователя
      // вместе с текущей датой
      const notificationData = {
        shown: true,
        date: new Date().toISOString(),
        unbanDate: unbanDate
      };
      localStorage.setItem(`${UNBAN_NOTIFICATION_KEY}_${user.uid}`, JSON.stringify(notificationData));
      
      // Удаляем метку о том, что пользователь был заблокирован, 
      // так как уведомление было показано
      localStorage.removeItem(`${WAS_BANNED_KEY}_${user.uid}`);
    }
    setIsOpen(false);
  };

  if (!user || user.isBanned) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-4">
          <div className="mx-auto bg-green-100 p-3 rounded-full">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-green-600">
            Ваш аккаунт разблокирован
          </DialogTitle>
          <DialogDescription className="text-center">
            <p className="mb-2 text-base">
              Администрация сайта сняла блокировку с вашего аккаунта.
            </p>
            <p className="text-sm text-muted-foreground">
              Теперь вы снова можете создавать рецензии, комментировать и взаимодействовать с другими пользователями.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        {unbanReason && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-700 mb-1">Причина разблокировки:</h4>
                <p className="text-sm text-green-700">
                  {unbanReason}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {lastBanReason && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700 mb-1">Предыдущая причина блокировки:</h4>
                <p className="text-sm text-amber-700">
                  {lastBanReason}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-700 mb-1">Важная информация</h4>
              <p className="text-sm text-blue-700">
                Пожалуйста, ознакомьтесь с правилами сообщества, чтобы избежать повторной блокировки вашего аккаунта.
                <a href="/terms" className="underline ml-1">
                  Правила сообщества
                </a>
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="sm:w-auto w-full">
            Закрыть
          </Button>
          <Button 
            variant="default" 
            onClick={handleClose}
            className="sm:w-auto w-full gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Продолжить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnbanNotification; 