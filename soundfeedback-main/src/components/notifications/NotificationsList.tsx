
interface NotificationsListProps {
  onNotificationClick: (reviewId: number) => void;
}

const NotificationsList = ({ onNotificationClick }: NotificationsListProps) => {
  // Тестовые уведомления
  const notifications = [
    {
      id: 1,
      type: "review_approved",
      reviewId: 1,
      message: "Ваша рецензия на альбом Кровосток - Наука была опубликована",
      date: "2024-03-15"
    },
    {
      id: 2,
      type: "review_rejected",
      reviewId: 2,
      message: "Ваша рецензия на альбом 25/17 - Только для своих была отклонена. Причина: Недостаточно аргументированная оценка",
      date: "2024-03-14"
    },
    {
      id: 3,
      type: "review_like",
      reviewId: 3,
      message: "Пользователь оценил вашу рецензию на альбом Oxxxymiron - Красота и Уродство",
      date: "2024-03-13"
    },
    {
      id: 4,
      type: "review_comment",
      reviewId: 4,
      message: "Новый комментарий к вашей рецензии на альбом GONE.Fludd - DIGITAL FANTAZY",
      date: "2024-03-12"
    }
  ];

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 border rounded-lg cursor-pointer hover:bg-accent ${
            notification.type === 'review_approved' ? 'border-l-4 border-l-green-500' :
            notification.type === 'review_rejected' ? 'border-l-4 border-l-red-500' :
            ''
          }`}
          onClick={() => onNotificationClick(notification.reviewId)}
        >
          <p className="text-sm">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-1">{notification.date}</p>
        </div>
      ))}
    </div>
  );
};

export default NotificationsList;
