import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCategorizeConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.functions.invoke(
        'categorize-whatsapp-conversation',
        { body: { conversationId } }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data, conversationId) => {
      toast.success('Conversa categorizada com sucesso');
      // Invalidar cache dos tópicos
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-topics', conversationId] 
      });
      // Invalidar lista de conversas (para atualizar badges)
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp', 'conversations'] 
      });
    },
    onError: (error: any) => {
      console.error('Erro ao categorizar:', error);
      if (error.message?.includes('429')) {
        toast.error('Rate limit excedido. Tente novamente em alguns minutos.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos de IA esgotados.');
      } else {
        toast.error('Erro ao categorizar conversa');
      }
    },
  });
};
