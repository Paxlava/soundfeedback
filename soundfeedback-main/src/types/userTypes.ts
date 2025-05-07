import { EnumRoleType } from "@/enums/role";

export interface UserData {
  uid: string;
  username: string;
  avatarUrl?: string;
  role: EnumRoleType;
  isBanned: boolean;
  emailVerified?: boolean;
  email?: string;
  subscribersCount?: number;
  subscriptionsCount?: number;
}

// Интерфейс для кэша авторов
export interface AuthorCacheData {
  [userId: string]: {
    data: UserData | null;
    timestamp: number;
    loading: boolean;
    error: string | null;
  };
}
