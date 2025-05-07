import * as React from "react";
import { Book, BookOpen, Loader2, Users, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";

interface ProfileStatsProps {
  stats?: { writtenReviews: number; readReviews: number; subscribersCount: number; subscriptionsCount: number } | null;
  isLoadingStats?: boolean;
  writtenReviews?: number;
  readReviews?: number;
  className?: string;
  itemClassName?: string;
  userId?: string;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ stats, isLoadingStats = false, writtenReviews: propWrittenReviews, readReviews: propReadReviews, className = "", itemClassName = "", userId }) => {
  const isMobile = useIsMobile();
  // Используем данные либо из stats, либо из прямых пропсов
  const written = propWrittenReviews ?? stats?.writtenReviews ?? 0;
  const read = propReadReviews ?? stats?.readReviews ?? 0;
  const subscribers = stats?.subscribersCount ?? 0;
  const subscriptions = stats?.subscriptionsCount ?? 0;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <Card>
        <CardContent className={`pt-6 ${itemClassName}`}>
          <div className="flex items-center space-x-4">
            {!isMobile && <Book className="h-8 w-8 text-primary" />}
            <div className={isMobile ? "text-center w-full" : ""}>
              {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : <p className="text-2xl font-bold">{written}</p>}
              <p className="text-muted-foreground">Написано рецензий</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={`pt-6 ${itemClassName}`}>
          <div className="flex items-center space-x-4">
            {!isMobile && <BookOpen className="h-8 w-8 text-primary" />}
            <div className={isMobile ? "text-center w-full" : ""}>
              {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : <p className="text-2xl font-bold">{read}</p>}
              <p className="text-muted-foreground">Прочитано рецензий</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Link to={userId ? `/subscribers/${userId}` : "/subscribers"} className="block">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className={`pt-6 ${itemClassName}`}>
            <div className="flex items-center space-x-4">
              {!isMobile && <Users className="h-8 w-8 text-primary" />}
              <div className={isMobile ? "text-center w-full" : ""}>
                {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : <p className="text-2xl font-bold">{subscribers}</p>}
                <p className="text-muted-foreground">Подписчики</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Link to={userId ? `/subscriptions/${userId}` : "/subscriptions-list"} className="block">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className={`pt-6 ${itemClassName}`}>
            <div className="flex items-center space-x-4">
              {!isMobile && <UserPlus className="h-8 w-8 text-primary" />}
              <div className={isMobile ? "text-center w-full" : ""}>
                {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : <p className="text-2xl font-bold">{subscriptions}</p>}
                <p className="text-muted-foreground">Подписки</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};

export default ProfileStats;
