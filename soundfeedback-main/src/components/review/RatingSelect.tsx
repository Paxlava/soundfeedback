import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnumRating, EnumRatingType } from "@/enums/rating";
import { Label } from "@/components/ui/label";
import { getRatingColor } from "@/lib/utils";

interface RatingSelectProps {
  value: EnumRatingType;
  onChange: (value: EnumRatingType) => void;
}

const RatingSelect: React.FC<RatingSelectProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label>Оценка</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Выберите оценку" />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(EnumRating).map((key) => (
            <SelectItem key={key} value={key as keyof typeof EnumRating} className={key ? getRatingColor(key as keyof typeof EnumRating) : ""}>
              {EnumRating[key as keyof typeof EnumRating]} {/* Локализованное значение */}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RatingSelect;
