import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Определение типов пропсов компонента
interface ReviewTextProps {
  value: string;                     // Текст рецензии
  onChange: (value: string) => void; // Функция обработки изменения текста
}

// Компонент для ввода текста рецензии
const ReviewText = ({ value, onChange }: ReviewTextProps) => {
  return (
    <div className="space-y-2">
      {/* Метка поля */}
      <Label htmlFor="reviewText">Текст рецензии</Label>
      {/* Поле для ввода текста */}
      <Textarea
        id="reviewText"
        placeholder="Напишите вашу рецензию здесь..."
        className="min-h-[200px] whitespace-pre-line"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default ReviewText;