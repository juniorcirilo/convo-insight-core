import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Sector {
  id: string;
  instance_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SectorWithInstance extends Sector {
  instance_name?: string;
}

export const useSectors = (instanceId?: string) => {
  const queryClient = useQueryClient();

  const { data: sectors = [], isLoading } = useQuery({
    queryKey: ['sectors', instanceId],
    queryFn: async () => {
      let query = supabase
        .from('sectors')
        .select(`
          *,
          whatsapp_instances!inner(name)
        `)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((sector: any) => ({
        ...sector,
        instance_name: sector.whatsapp_instances?.name,
      })) as SectorWithInstance[];
    },
  });

  const createSector = useMutation({
    mutationFn: async (sector: Omit<Sector, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('sectors')
        .insert(sector)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Setor criado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar setor');
    },
  });

  const updateSector = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sector> & { id: string }) => {
      const { data, error } = await supabase
        .from('sectors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Setor atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar setor');
    },
  });

  const deleteSector = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sectors')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      toast.success('Setor excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir setor');
    },
  });

  return {
    sectors,
    isLoading,
    createSector,
    updateSector,
    deleteSector,
  };
};
