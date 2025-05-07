export const EnumRole = {
  USER: "Пользователь",
  ADMIN: "Администратор",
} as const;

// Тип для значений EnumRole
export type EnumRoleType = (typeof EnumRole)[keyof typeof EnumRole];

// Тип для ключей EnumRole
export type EnumRoleKey = keyof typeof EnumRole;

// Функция для получения ключа по значению
export const getRoleKey = (roleValue: EnumRoleType): EnumRoleKey => {
  return (Object.keys(EnumRole) as EnumRoleKey[]).find((key) => EnumRole[key] === roleValue) || "USER"; // Значение по умолчанию
};

// Функция для получения значения по ключу
export const getRoleValue = (roleKey: string): EnumRoleType => {
  return EnumRole[roleKey as EnumRoleKey] || EnumRole.USER; // Значение по умолчанию
};
