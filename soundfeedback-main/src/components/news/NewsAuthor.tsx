import { memo, useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useAuthor } from "@/contexts/AuthorContext";

interface NewsAuthorProps {
  userId: string;
  date: string;
}

const NewsAuthor = memo(({ userId, date }: NewsAuthorProps) => {
  const { getAuthor } = useAuthor();
  const { author, loading } = getAuthor(userId);

  const authorName = author?.username || "Администратор";
  const authorUsername = author?.username || null;

  const formattedDate = useMemo(() => 
    format(new Date(date), "d MMMM yyyy", { locale: ru }), 
    [date]
  );

  return (
    <p className="text-sm text-muted-foreground">
      {formattedDate} • 
      {authorUsername ? (
        <Link 
          to={`/profile/${authorUsername}`} 
          className="ml-1 text-primary hover:underline"
        >
          {authorName}
        </Link>
      ) : (
        <span className="ml-1">{authorName}</span>
      )}
    </p>
  );
});

NewsAuthor.displayName = "NewsAuthor";

export default NewsAuthor; 