// @/components/profile/ProfileHeader.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, PenSquare, Star, Trash2, Ban, Skull } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { EnumRole, EnumRoleType } from "@/enums/role";
import { useAuth } from "@/hooks/useAuth";
import { AuthUser } from "@/types/authTypes";

interface ProfileHeaderProps {
  username?: string;
  avatarUrl?: string | null;
  role?: EnumRoleType;
  onAvatarChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarDelete?: () => void;
  loading?: boolean;
  isPublic?: boolean;
  avatarLoading?: boolean;
  className?: string;
  avatarClassName?: string;
  userInfoClassName?: string;
  user?: AuthUser;
  isBanned?: boolean;
}

const ProfileHeader = ({ 
  username, 
  role, 
  avatarUrl, 
  onAvatarChange, 
  onAvatarDelete, 
  loading = false,
  avatarLoading = false,
  isPublic = false,
  className = "",
  avatarClassName = "",
  userInfoClassName = "",
  user,
  isBanned = false
}: ProfileHeaderProps) => {
  // Используем данные пользователя либо из пропса, либо из полей
  const displayUser = user || {
    displayName: username || "",
    role: role || EnumRole.USER,
    avatarUrl: avatarUrl || null
  };

  return (
    <div className={`flex flex-col items-center mb-6 ${className}`}>
      <div className="relative group mb-4">
        {/* Аватар */}
        <Avatar className={`h-32 w-32 ${avatarClassName}`}>
          <AvatarImage src={displayUser.avatarUrl} />
          <AvatarFallback>
            <span className="text-muted-foreground text-3xl">{displayUser.displayName?.charAt(0).toUpperCase()}</span>
          </AvatarFallback>
        </Avatar>

        {/* Круговой индикатор загрузки */}
        {(loading || avatarLoading) && (
          <div className="bg-black/50 absolute inset-0 flex items-center justify-center h-full w-full rounded-full">
            <Loader2 className="animate-spin" />
          </div>
        )}

        {/* Лейбл для изменения аватара (только для личного профиля) */}
        {!isPublic && onAvatarChange && (
          <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
            {!(loading || avatarLoading) && <PenSquare />}
          </label>
        )}

        {/* Кнопка удаления аватара (только для личного профиля) */}
        {!isPublic && displayUser.avatarUrl && !(loading || avatarLoading) && onAvatarDelete && (
          <button onClick={onAvatarDelete} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" disabled={loading || avatarLoading}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        {/* Инпут для загрузки файла (только для личного профиля) */}
        {!isPublic && onAvatarChange && <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={loading || avatarLoading} />}
      </div>
      
      <div className={`flex flex-row gap-2 items-center mt-2 mb-4 ${userInfoClassName}`}>
        <h2 className="text-2xl font-bold">{displayUser.displayName || "Username"}</h2>
        
        {/* Иконка администратора */}
        {isPublic
          ? EnumRole[displayUser.role] === EnumRole.ADMIN && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="h-5 w-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center transition-transform transform hover:scale-110">
                    <Star className="h-4 w-4 fill-white/60 stroke-white/50" />
                  </div>
                </TooltipTrigger>
                <TooltipContent sideOffset={10} side="right" className="transition-opacity duration-300">
                  {EnumRole.ADMIN}
                </TooltipContent>
              </Tooltip>
            )
          : displayUser.role === EnumRole.ADMIN && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="h-5 w-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center transition-transform transform hover:scale-110">
                    <Star className="h-4 w-4 fill-white/60 stroke-white/50" />
                  </div>
                </TooltipTrigger>
                <TooltipContent sideOffset={10} side="right" className="transition-opacity duration-300">
                  {EnumRole.ADMIN}
                </TooltipContent>
              </Tooltip>
            )}
            
        {/* Иконка заблокированного пользователя */}
        {isBanned && (
          <Tooltip>
            <TooltipTrigger>
              <div className="h-5 w-5 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center transition-transform transform hover:scale-110">
                <Skull className="h-4 w-4 stroke-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent sideOffset={10} side="right" className="transition-opacity duration-300">
              Пользователь заблокирован
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
