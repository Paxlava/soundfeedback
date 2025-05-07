import * as React from "react";
import { EnumRatingType } from "@/enums/rating";
import ReviewsFilter from "@/components/ReviewsFilter";
import SubscriptionReviewsList from "@/components/SubscriptionReviewsList";

const SubscriptionsReviews = () => {
  const [search, setSearch] = React.useState("");
  const [releaseType, setReleaseType] = React.useState("all");
  const [rating, setRating] = React.useState<EnumRatingType | "all">("all");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");

  return (
    <div className="container mx-auto py-4 px-4">
      <h1 className="text-2xl font-bold mb-4">Подписки</h1>
      
      <ReviewsFilter 
        search={search}
        setSearch={setSearch}
        releaseType={releaseType}
        setReleaseType={setReleaseType}
        rating={rating}
        setRating={setRating}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />

      <SubscriptionReviewsList
        search={search}
        releaseType={releaseType}
        rating={rating}
        sortOrder={sortOrder}
      />
    </div>
  );
};

export default SubscriptionsReviews; 