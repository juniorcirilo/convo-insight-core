import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateProfileData {
  full_name?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  avatar_url?: string;
}

export const useUpdateProfile = (userId: string) => {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      // Sanitize filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error: Error) => {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload da foto');
    },
  });

  return {
    updateProfile,
    uploadAvatar,
  };
};
