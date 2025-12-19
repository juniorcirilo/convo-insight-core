import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SendReactionParams {
  messageId: string;
  conversationId: string;
  emoji: string;
  reactorJid: string;
  isFromMe: boolean;
}

export const useMessageReaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendReaction = useMutation({
    mutationFn: async ({ messageId, conversationId, emoji, reactorJid, isFromMe }: SendReactionParams) => {
      const { data, error } = await supabase
        .from('whatsapp_reactions')
        .upsert({
          message_id: messageId,
          conversation_id: conversationId,
          emoji,
          reactor_jid: reactorJid,
          is_from_me: isFromMe,
        }, {
          onConflict: 'message_id,reactor_jid',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp', 'reactions', variables.conversationId] 
      });
    },
    onError: (error) => {
      console.error('Error sending reaction:', error);
      toast({
        title: "Erro ao reagir",
        description: "Não foi possível enviar a reação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return { sendReaction };
};
