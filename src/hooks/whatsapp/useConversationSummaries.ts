import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

export interface ConversationSummary {
  id: string;
  conversation_id: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  sentiment_at_time: 'positive' | 'neutral' | 'negative' | null;
  messages_count: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export const useConversationSummaries = (conversationId: string | null) => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: summaries, isLoading } = useQuery({
    queryKey: ['conversation-summaries', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_conversation_summaries')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ConversationSummary[];
    },
    enabled: !!conversationId
  });

  const generateSummary = async () => {
    if (!conversationId) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-conversation-summary',
        { body: { conversationId } }
      );

      if (error) throw error;

      if (data.message) {
        toast.info(data.message);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Resumo gerado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['conversation-summaries', conversationId] });
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      toast.error('Erro ao gerar resumo. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteSummary = useMutation({
    mutationFn: async (summaryId: string) => {
      const { error } = await supabase
        .from('whatsapp_conversation_summaries')
        .delete()
        .eq('id', summaryId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Resumo excluído');
      queryClient.invalidateQueries({ queryKey: ['conversation-summaries', conversationId] });
    },
    onError: () => {
      toast.error('Erro ao excluir resumo');
    }
  });

  return {
    summaries: summaries || [],
    isLoading,
    isGenerating,
    generateSummary,
    deleteSummary: deleteSummary.mutate
  };
};