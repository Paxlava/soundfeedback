import { messages } from "@/lib/translations";

export const EnumRating = {
  RECOMMEND: messages.review.ratingType.recommend,
  NEUTRAL: messages.review.ratingType.neutral,
  NOT_RECOMMEND: messages.review.ratingType.notRecommend,
} as const;

export type EnumRatingType = keyof typeof EnumRating | null;
