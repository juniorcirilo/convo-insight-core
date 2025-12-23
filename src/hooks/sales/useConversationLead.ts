import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export const useConversationLead = (conversationId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['conversation-lead', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!conversationId,
  });

  const createLead = useMutation({
    mutationFn: async ({ 
      conversationId, 
      contactId,
      name, 
      phone 
    }: { 
      conversationId: string; 
      contactId: string;
      name: string; 
      phone: string;
    }) => {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          conversation_id: conversationId,
          contact_id: contactId,
          name,
          phone,
          source: 'whatsapp',
          status: 'new',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-lead', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: "Lead criado",
        description: "O lead foi criado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error creating lead:', error);
      toast({
        title: "Erro ao criar lead",
        description: "Não foi possível criar o lead.",
        variant: "destructive",
      });
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      // Get current status for history
      const { data: currentLead } = await supabase
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .single();

      const { data: { user } } = await supabase.auth.getUser();

      // Update lead status
      const { data, error } = await supabase
        .from('leads')
        .update({ 
          status,
          closed_at: status === 'won' || status === 'lost' ? new Date().toISOString() : null
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;

      // Record history
      await supabase
        .from('lead_status_history')
        .insert({
          lead_id: leadId,
          old_status: currentLead?.status || null,
          new_status: status,
          changed_by: user?.id || null,
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-lead', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: "Status atualizado",
        description: "O status do lead foi atualizado.",
      });
    },
    onError: (error) => {
      console.error('Error updating lead status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const updateLeadValue = useMutation({
    mutationFn: async ({ leadId, value }: { leadId: string; value: number }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ value })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-lead', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: "Valor atualizado",
        description: "O valor da oportunidade foi atualizado.",
      });
    },
    onError: (error) => {
      console.error('Error updating lead value:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o valor.",
        variant: "destructive",
      });
    },
  });

  return {
    lead,
    isLoading,
    error,
    createLead: createLead.mutate,
    updateLeadStatus: updateLeadStatus.mutate,
    updateLeadValue: updateLeadValue.mutate,
    isCreating: createLead.isPending,
    isUpdating: updateLeadStatus.isPending,
    isUpdatingValue: updateLeadValue.isPending,
  };
};
