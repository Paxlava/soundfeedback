import { messages } from "@/lib/translations";

export const EnumType = {
  ALBUM: messages.review.releaseType.album,
  SINGLE: messages.review.releaseType.single,
  EP: messages.review.releaseType.ep,
} as const;

export type EnumTypeType = keyof typeof EnumType;
