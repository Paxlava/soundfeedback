import { EnumRatingType } from "@/enums/rating";
import { EnumRoleKey, EnumRoleType } from "@/enums/role";
import { EnumStatusType } from "@/enums/status";

export interface Review {
  id: string;
  artist: string;
  album: string;
  type: string;
  rating: EnumRatingType;
  yandexMusicId: string;
  likes: number;
  dislikes: number;
  views: number;
  content: string;
  date: string;
  coverUrl: string;
  customCoverUrl?: string;
  authorId: string;
  author: string;
  likedBy: string[];
  dislikedBy: string[];
  status: EnumStatusType;
  rejectReason?: string;
  moderationComment?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  user: string;
  role: EnumRoleType;
  avatarUrl?: string;
  content: string;
  likes: number;
  dislikes: number;
  likedBy: string[]; // Добавляем для лайков
  dislikedBy: string[]; // Добавляем для дизлайков
  isBanned?: boolean; // Добавляем статус блокировки
  replies: {
    id: string;
    userId: string;
    user: string;
    role: EnumRoleType;
    avatarUrl?: string;
    content: string;
    likes: number;
    dislikes: number;
    likedBy: string[];
    dislikedBy: string[];
    createdAt: string;
    updatedAt?: string; // Добавляем поле для отслеживания времени редактирования ответа
    isBanned?: boolean; // Добавляем статус блокировки
  }[];
  date: string;
  createdAt: string; // Добавляем поле для хранения даты создания в ISO формате
  updatedAt?: string; // Добавляем поле для отслеживания времени редактирования комментария
}

export interface AlbumData {
  albumId: string;
  artist: string;
  title: string;
  type: string;
  coverUrl: string;
  createdAt: string;
}

export interface ReviewData {
  albumId: string;
  userId: string;
  rating: EnumRatingType;
  reviewText: string;
  status: EnumStatusType;
  createdAt: string;
  rejectReason?: string;
  moderationComment?: string;
  likes?: number;
  dislikes?: number;
  likedBy?: string[];
  dislikedBy?: string[];
  customCoverUrl?: string;
  uniqueViews?: number;
}

export interface CommentData {
  id: string;
  reviewId: string;
  userId: string;
  username: string;
  role: EnumRoleType;
  content: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  isBanned?: boolean; // Добавляем статус блокировки
  replies: CommentData[];
}
