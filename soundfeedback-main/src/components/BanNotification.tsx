import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skull, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getUserData } from '@/services/userService';
import { logger } from '@/lib/utils';

const BAN_NOTIFICATION_KEY = 'sf_ban_notification_shown';
const WAS_BANNED_KEY = 'sf_user_was_banned';

const BanNotification = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [banDate, setBanDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.isBanned) {
      setIsOpen(false);
      return;
    }

    // Используем переменную для отслеживания, если компонент демонтирован
    let isMounted = true;

    // Загружаем данные пользователя, чтобы получить причину и дату бана
    const fetchUserData = async () => {
      try {
        const userData = await getUserData(user.uid);
        
        // Проверяем, что компонент все еще смонтирован
        if (!isMounted) return;
        
        if (userData) {
          if (userData.banReason) {
            setBanReason(userData.banReason);
          }
          if (userData.banDate) {
            setBanDate(userData.banDate);
          }
        }

        // Сохраняем информацию, что пользователь был заблокирован
        // Это нужно для отображения уведомления о разблокировке позже
        localStorage.setItem(`${WAS_BANNED_KEY}_${user.uid}`, 'true');

        // Проверяем, было ли уже показано уведомление для этого пользователя
        // и сравниваем дату последнего показа с датой блокировки
        const lastShownData = localStorage.getItem(`${BAN_NOTIFICATION_KEY}_${user.uid}`);
        let shouldShow = !lastShownData;

        if (!shouldShow && userData.banDate && lastShownData) {
          try {
            // Парсим данные из localStorage
            const lastShownInfo = JSON.parse(lastShownData);
            const lastShownDate = new Date(lastShownInfo.date);
            const currentBanDate = new Date(userData.banDate);
            
            // Если текущая блокировка произошла позже последнего показа уведомления,
            // то показываем уведомление снова
            if (currentBanDate > lastShownDate) {
              shouldShow = true;
            }
          } catch (e) {
            // Если возникла ошибка при парсинге, показываем уведомление
            shouldShow = true;
            logger.error('Ошибка при проверке даты бана:', e);
          }
        }

        if (shouldShow && isMounted) {
          setIsOpen(true);
        }
      } catch (error) {
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
  }, [user]);

  const handleClose = () => {
    if (user) {
      // Сохраняем информацию, что уведомление было показано для этого пользователя
      // вместе с текущей датой
      const notificationData = {
        shown: true,
        date: new Date().toISOString(),
        banDate: banDate
      };
      localStorage.setItem(`${BAN_NOTIFICATION_KEY}_${user.uid}`, JSON.stringify(notificationData));
    }
    setIsOpen(false);
  };

  if (!user || !user.isBanned) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-4">
          <div className="mx-auto bg-red-100 p-3 rounded-full">
            <Skull className="h-12 w-12 text-red-600" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-red-600">
            Ваш аккаунт заблокирован
          </DialogTitle>
          <DialogDescription className="text-center">
            <p className="mb-2 text-base">
              Администрация сайта заблокировала ваш аккаунт за нарушение правил сообщества.
            </p>
            <p className="text-sm text-muted-foreground">
              Во время блокировки вы можете просматривать публичный контент, но не можете создавать новые рецензии,
              комментировать или взаимодействовать с другими пользователями.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        {banReason && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-700 mb-1">Причина блокировки:</h4>
                <p className="text-sm text-red-700">
                  {banReason}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-700 mb-1">Что я могу сделать?</h4>
              <p className="text-sm text-amber-700">
                Если вы считаете, что произошла ошибка, вы можете связаться с нами по электронной почте 
                <a href="mailto:support@soundfeedback.com" className="underline ml-1">
                  support@soundfeedback.com
                </a>
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="sm:w-auto w-full">
            Понятно
          </Button>
          
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-700 text-xs sm:text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 flex-shrink-0" />
            <span>Выход из аккаунта невозможен</span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BanNotification; 