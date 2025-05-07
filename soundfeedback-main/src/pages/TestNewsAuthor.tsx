import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NewsAuthor from "@/components/news/NewsAuthor";
import { useAuthor } from "@/contexts/AuthorContext";

const AUTHORS_IDS = [
  "9R5RVJRYPzYeRqFMVVK0jNPPmyF3", // Пример ID автора 1
  "TqYqmDEJbXRT6rTZVobcw9VZRFO2", // Пример ID автора 2
  "YP5QTwc1T6NJ09bkK0R0aqM1VEH3", // Пример ID автора 3
];

/**
 * Тестовая страница для демонстрации работы кэширования данных авторов
 * Показывает, как один и тот же автор не запрашивается повторно из базы данных
 */
const TestNewsAuthor = () => {
  const [currentDate] = useState(new Date().toISOString());
  const { clearAllCache, clearAuthorCache } = useAuthor();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Тест кеширования данных авторов</h1>
      
      <div className="flex space-x-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => clearAllCache()}
        >
          Очистить весь кеш
        </Button>
        
        {AUTHORS_IDS.map((authorId) => (
          <Button 
            key={authorId}
            variant="outline" 
            onClick={() => clearAuthorCache(authorId)}
          >
            Очистить кеш автора {authorId.substring(0, 5)}
          </Button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Первая новость - автор 1 */}
        <Card>
          <CardHeader>
            <CardTitle>Новость 1</CardTitle>
            <NewsAuthor userId={AUTHORS_IDS[0]} date={currentDate} />
          </CardHeader>
          <CardContent>
            <p>Эта новость написана автором 1. Данные автора будут загружены из базы данных.</p>
          </CardContent>
        </Card>
        
        {/* Вторая новость - автор 2 */}
        <Card>
          <CardHeader>
            <CardTitle>Новость 2</CardTitle>
            <NewsAuthor userId={AUTHORS_IDS[1]} date={currentDate} />
          </CardHeader>
          <CardContent>
            <p>Эта новость написана автором 2. Данные автора будут загружены из базы данных.</p>
          </CardContent>
        </Card>
        
        {/* Третья новость - автор 1 (повторно) */}
        <Card>
          <CardHeader>
            <CardTitle>Новость 3</CardTitle>
            <NewsAuthor userId={AUTHORS_IDS[0]} date={currentDate} />
          </CardHeader>
          <CardContent>
            <p>Эта новость тоже написана автором 1. Данные автора будут загружены из кеша, а не из базы данных.</p>
          </CardContent>
        </Card>
        
        {/* Четвертая новость - автор 3 */}
        <Card>
          <CardHeader>
            <CardTitle>Новость 4</CardTitle>
            <NewsAuthor userId={AUTHORS_IDS[2]} date={currentDate} />
          </CardHeader>
          <CardContent>
            <p>Эта новость написана автором 3. Данные автора будут загружены из базы данных.</p>
          </CardContent>
        </Card>
        
        {/* Пятая новость - автор 2 (повторно) */}
        <Card>
          <CardHeader>
            <CardTitle>Новость 5</CardTitle>
            <NewsAuthor userId={AUTHORS_IDS[1]} date={currentDate} />
          </CardHeader>
          <CardContent>
            <p>Эта новость тоже написана автором 2. Данные автора будут загружены из кеша, а не из базы данных.</p>
          </CardContent>
        </Card>
        
        {/* Шестая новость - автор 3 (повторно) */}
        <Card>
          <CardHeader>
            <CardTitle>Новость 6</CardTitle>
            <NewsAuthor userId={AUTHORS_IDS[2]} date={currentDate} />
          </CardHeader>
          <CardContent>
            <p>Эта новость тоже написана автором 3. Данные автора будут загружены из кеша, а не из базы данных.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestNewsAuthor; 