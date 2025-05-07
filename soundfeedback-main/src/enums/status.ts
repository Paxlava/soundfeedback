export const EnumStatus = {
  PENDING: "В ожидании",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
} as const;

export type EnumStatusType = (typeof EnumStatus)[keyof typeof EnumStatus];
