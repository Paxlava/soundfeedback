// ReviewsFilter.tsx
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnumRating, EnumRatingType } from "@/enums/rating";
import { getRatingColor } from "@/lib/utils";
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReviewsFilterProps {
  search: string;
  setSearch: (value: string) => void;
  releaseType: string;
  setReleaseType: (value: string) => void;
  rating: EnumRatingType | "all";
  setRating: (value: EnumRatingType | "all") => void;
  sortOrder: "newest" | "oldest";
  setSortOrder: (value: "newest" | "oldest") => void;
}

const ReviewsFilter = ({ search, setSearch, releaseType, setReleaseType, rating, setRating, sortOrder, setSortOrder }: ReviewsFilterProps) => {
  const [searchInput, setSearchInput] = React.useState(search);
  const isMobile = useIsMobile();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
    }
  };

  return (
    <div className={`space-y-4 ${isMobile ? "mb-4" : "mb-8"}`}>
      <Input 
        placeholder="Поиск по исполнителю или альбому... (нажмите Enter)" 
        value={searchInput} 
        onChange={handleSearchChange}
        onKeyDown={handleSearchKeyDown}
        className="max-w-full" 
      />

      <div className={`grid ${isMobile ? "grid-cols-1 gap-3" : "grid-cols-1 md:grid-cols-3 gap-6"}`}>
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? "text-sm" : ""}`}>Тип релиза</h4>
          <Select value={releaseType} onValueChange={setReleaseType}>
            <SelectTrigger className={isMobile ? "h-8 text-sm" : ""}>
              <SelectValue placeholder="Выберите тип релиза" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="album">Альбом</SelectItem>
              <SelectItem value="single">Сингл</SelectItem>
              <SelectItem value="ep">EP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? "text-sm" : ""}`}>Оценка</h4>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger className={isMobile ? "h-8 text-sm" : ""}>
              <SelectValue placeholder="Выберите оценку" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              {Object.keys(EnumRating).map((key) => (
                <SelectItem key={key} value={key as EnumRatingType} className={getRatingColor(key as EnumRatingType, "text")}>
                  {EnumRating[key as EnumRatingType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? "text-sm" : ""}`}>Сортировка</h4>
          <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
            <SelectTrigger className={isMobile ? "h-8 text-sm" : ""}>
              <SelectValue placeholder="Выберите порядок сортировки" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Сначала новые</SelectItem>
              <SelectItem value="oldest">Сначала старые</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ReviewsFilter);
