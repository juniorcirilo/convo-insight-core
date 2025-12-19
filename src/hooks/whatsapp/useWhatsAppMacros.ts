import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Macro = Tables<'whatsapp_macros'>;
type MacroInsert = Omit<Macro, 'id' | 'created_at' | 'updated_at' | 'usage_count'>;
type MacroUpdate = Partial<MacroInsert>;

export const useWhatsAppMacros = (instanceId?: string) => {
  const queryClient = useQueryClient();

  // Fetch active macros
  const { data: macros = [], isLoading } = useQuery({
    queryKey: ['whatsapp-macros', instanceId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_macros')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (instanceId) {
        query = query.or(`instance_id.is.null,instance_id.eq.${instanceId}`);
      } else {
        query = query.is('instance_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Macro[];
    },
  });

  // Create macro
  const createMacro = useMutation({
    mutationFn: async (macro: MacroInsert) => {
      const { data, error } = await supabase
        .from('whatsapp_macros')
        .insert(macro)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-macros'] });
      toast.success('Macro criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating macro:', error);
      toast.error('Erro ao criar macro: ' + error.message);
    },
  });

  // Update macro
  const updateMacro = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: MacroUpdate }) => {
      const { data, error } = await supabase
        .from('whatsapp_macros')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-macros'] });
      toast.success('Macro atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error updating macro:', error);
      toast.error('Erro ao atualizar macro: ' + error.message);
    },
  });

  // Soft delete macro
  const deleteMacro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_macros')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-macros'] });
      toast.success('Macro excluída com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error deleting macro:', error);
      toast.error('Erro ao excluir macro: ' + error.message);
    },
  });

  // Increment usage count
  const incrementUsage = useMutation({
    mutationFn: async (id: string) => {
      const { data: macro } = await supabase
        .from('whatsapp_macros')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (macro) {
        const { error } = await supabase
          .from('whatsapp_macros')
          .update({ usage_count: (macro.usage_count || 0) + 1 })
          .eq('id', id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-macros'] });
    },
  });

  return {
    macros,
    isLoading,
    createMacro: createMacro.mutate,
    updateMacro: updateMacro.mutate,
    deleteMacro: deleteMacro.mutate,
    incrementUsage: incrementUsage.mutate,
    isCreating: createMacro.isPending,
    isUpdating: updateMacro.isPending,
    isDeleting: deleteMacro.isPending,
  };
};
