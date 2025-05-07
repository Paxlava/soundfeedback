import { EnumRoleType } from "@/enums/role";

export interface UserCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthState {
  user: null | { uid: string; email: string; username: string };
  loading: boolean;
  error: string | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: EnumRoleType;
  emailVerified: boolean;
  createdAt?: string;
}
