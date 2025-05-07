import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { updateAvatar, deleteAvatar } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

interface ProfileState {
  loading: boolean;
  error: string | null;
  updateAvatar: (file: File) => Promise<string>;
  deleteAvatar: () => Promise<void>;
}

export const useProfile = (): ProfileState => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const updateAvatarHandler = useCallback(
    async (file: File) => {
      if (!user) throw new Error("User not authenticated");
      try {
        setLoading(true);
        setError(null);
        const avatarUrl = await updateAvatar(user, file);
        toast({
          title: "Успех",
          description: "Аватарка обновлена",
        });
        return avatarUrl;
      } catch (err: any) {
        setError(err.message || "Ошибка обновления аватарки");
        toast({
          title: "Ошибка",
          description: err.message || "Не удалось обновить аватарку",
          variant: "destructive",
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  const deleteAvatarHandler = useCallback(async () => {
    if (!user) throw new Error("User not authenticated");
    try {
      setLoading(true);
      setError(null);
      await deleteAvatar(user);
      toast({
        title: "Успех",
        description: "Аватарка удалена",
      });
    } catch (err: any) {
      setError(err.message || "Ошибка удаления аватарки");
      toast({
        title: "Ошибка",
        description: err.message || "Не удалось удалить аватарку",
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  return {
    loading,
    error,
    updateAvatar: updateAvatarHandler,
    deleteAvatar: deleteAvatarHandler,
  };
};
