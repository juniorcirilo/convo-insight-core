import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserSector {
  id: string;
  user_id: string;
  sector_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface UserSectorWithDetails extends UserSector {
  user_name?: string;
  user_email?: string;
  sector_name?: string;
}

export const useUserSectors = (sectorId?: string, userId?: string) => {
  const queryClient = useQueryClient();

  const { data: userSectors = [], isLoading } = useQuery({
    queryKey: ['user-sectors', sectorId, userId],
    queryFn: async () => {
      let query = supabase
        .from('user_sectors')
        .select(`
          *,
          profiles!inner(full_name, email),
          sectors!inner(name)
        `);

      if (sectorId) {
        query = query.eq('sector_id', sectorId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((us: any) => ({
        ...us,
        user_name: us.profiles?.full_name,
        user_email: us.profiles?.email,
        sector_name: us.sectors?.name,
      })) as UserSectorWithDetails[];
    },
  });

  const addUserToSector = useMutation({
    mutationFn: async ({ userId, sectorId, isPrimary = false }: { userId: string; sectorId: string; isPrimary?: boolean }) => {
      const { data, error } = await supabase
        .from('user_sectors')
        .insert({
          user_id: userId,
          sector_id: sectorId,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sectors'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Usuário adicionado ao setor');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Usuário já está neste setor');
      } else {
        toast.error(error.message || 'Erro ao adicionar usuário ao setor');
      }
    },
  });

  const removeUserFromSector = useMutation({
    mutationFn: async ({ userId, sectorId }: { userId: string; sectorId: string }) => {
      const { error } = await supabase
        .from('user_sectors')
        .delete()
        .eq('user_id', userId)
        .eq('sector_id', sectorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sectors'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Usuário removido do setor');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover usuário do setor');
    },
  });

  const setPrimarySector = useMutation({
    mutationFn: async ({ userId, sectorId }: { userId: string; sectorId: string }) => {
      // First, set all user's sectors to non-primary
      await supabase
        .from('user_sectors')
        .update({ is_primary: false })
        .eq('user_id', userId);

      // Then set the selected one as primary
      const { data, error } = await supabase
        .from('user_sectors')
        .update({ is_primary: true })
        .eq('user_id', userId)
        .eq('sector_id', sectorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sectors'] });
      toast.success('Setor primário definido');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao definir setor primário');
    },
  });

  return {
    userSectors,
    isLoading,
    addUserToSector,
    removeUserFromSector,
    setPrimarySector,
  };
};
