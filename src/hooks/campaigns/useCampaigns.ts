import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Campaign {
  id: string;
  instance_id: string;
  name: string;
  description: string | null;
  message_content: string;
  message_type: string;
  button_options: any[];
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  target_contacts: any[];
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  instance_id: string;
  name: string;
  description?: string;
  message_content: string;
  message_type?: string;
  button_options?: any[];
  target_contacts?: any[];
  scheduled_at?: string;
  media_url?: string | null;
  media_mimetype?: string | null;
}

export const useCampaigns = (instanceId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['campaigns', instanceId],
    queryFn: async () => {
      let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...input,
          created_by: user?.id,
          status: input.scheduled_at ? 'scheduled' : 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: "Campanha criada",
        description: "A campanha foi criada com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erro ao criar campanha",
        description: "Não foi possível criar a campanha.",
        variant: "destructive",
      });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: "Campanha atualizada",
        description: "A campanha foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error updating campaign:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a campanha.",
        variant: "destructive",
      });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: "Campanha excluída",
        description: "A campanha foi excluída com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a campanha.",
        variant: "destructive",
      });
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    createCampaign: createCampaign.mutate,
    updateCampaign: updateCampaign.mutate,
    deleteCampaign: deleteCampaign.mutate,
    isCreating: createCampaign.isPending,
    isUpdating: updateCampaign.isPending,
    isDeleting: deleteCampaign.isPending,
  };
};
