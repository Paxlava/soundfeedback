import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import "../styles/home.css";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

const Home = () => {
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isAdmin = true; // В реальном приложении это будет определяться через авторизацию

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // В реальном приложении здесь будет отправка на бэкенд
    console.log("Feedback submitted:", { email, feedback });
    toast({
      title: "Успех",
      description: "Ваш отзыв успешно отправлен. Спасибо за обратную связь!",
    });
    setFeedback("");
    setEmail("");
  };

  return (
    <div className="home-container">
      {/* Фотография во всю ширину */}
      <section className="image-section">
        <img src="/public/1.jpg" alt="Музыкальная атмосфера" className="full-width-image" />
      </section>

      {/* Текстовая секция */}
      <section className="hero-section">
        <h1 className="hero-title">Приветствуем вас на входе в подвал</h1>
        <p className="hero-description">Делитесь своими мыслями о любимых релизах и открывайте новые жемчужины через рецензии нашего сообщества.</p>
        <div className="button-group">
          <Button asChild>
            <Link to="/reviews">Смотреть рецензии пользователей</Link>
          </Button>
          {/* при нажатии переходт на рецензии пользователей, а надо бы на админов*/}
          <Button asChild>
            <Link to="/admin-reviews">Смотреть рецензии редакции</Link>
          </Button>
        </div>
      </section>

      {/* Фотография во всю ширину */}
      <section className="image-section">
        <img src="/public/2.jpg" alt="Музыкальная атмосфера" className="full-width-image" />
      </section>

      {/* Дополнительная информация */}
      <div className="features-grid">
        <article className="feature-card">
          <h2 className="feature-title">Для любителей музыки</h2>
          <ul className="feature-list">
            <li className="feature-item">
              <span className="feature-check">✓</span>
              Делитесь подробными рецензиями на альбомы и синглы
            </li>
            <li className="feature-item">
              <span className="feature-check">✓</span>
              Оценивайте релизы и помогайте другим находить отличную музыку
            </li>
            <li className="feature-item">
              <span className="feature-check">✓</span>
              Общайтесь с другими ценителями музыки
            </li>
          </ul>
        </article>

        <article className="feature-card">
          <h2 className="feature-title">Для критиков</h2>
          <ul className="feature-list">
            <li className="feature-item">
              <span className="feature-check">✓</span>
              Пишите глубокий анализ релизов
            </li>
            <li className="feature-item">
              <span className="feature-check">✓</span>
              Создавайте свою репутацию в сообществе
            </li>
            <li className="feature-item">
              <span className="feature-check">✓</span>
              Делитесь своим опытом с другими
            </li>
          </ul>
        </article>
      </div>

      {/* Фотография во всю ширину */}
      <section className="image-section">
        <img src="/public/3.jpg" alt="Музыкальная атмосфера" className="full-width-image" />
      </section>

      {/* Призыв к действию */}
      <section className="hero-section">
        <h1 className="hero-title">Присоединяйтесь к нашему сообществу</h1>
        <p className="hero-description">Начните делиться своим мнением о музыке уже сегодня и станьте частью нашего растущего сообщества меломанов.</p>
        <div className="button-group">
          <Button asChild>
            {user ? (
              <Link to="/profile">Войти в профиль</Link>
            ) : (
              <Link to="/register">Создать аккаунт</Link>
            )}
          </Button>
        </div>
      </section>
      <section className="feedback-section">
        <h2 className="section-title">Обратная связь</h2>
        <p className="section-description">Помогите нам стать лучше! Оставьте свой отзыв или предложение.</p>
        <form onSubmit={handleFeedbackSubmit} className="feedback-form">
          <div className="form-group">
            <Input type="email" placeholder="Ваш email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mb-4" />
            <Textarea placeholder="Ваш отзыв или предложение..." value={feedback} onChange={(e) => setFeedback(e.target.value)} required className="min-h-[120px] mb-4" />
            <Button type="submit">Отправить</Button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Home;
