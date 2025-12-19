import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConversationMetadata {
  topics?: string[];
  primary_topic?: string;
  ai_confidence?: number;
  categorized_at?: string;
  ai_reasoning?: string;
  custom_topics?: string[];
  categorization_model?: string;
}

export const useConversationTopics = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const queryResult = useQuery({
    queryKey: ['conversation-topics', conversationId],
    queryFn: async (): Promise<ConversationMetadata | null> => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      const metadata = data?.metadata as ConversationMetadata;
      return metadata || null;
    },
    enabled: !!conversationId,
    staleTime: 30000,
  });

  // Realtime subscription for topics updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`topics-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_conversations',
      }, (payload) => {
        if (payload.new?.id === conversationId) {
          const newMetadata = payload.new?.metadata as any;
          const oldMetadata = payload.old?.metadata as any;
          
          if (JSON.stringify(newMetadata?.topics) !== JSON.stringify(oldMetadata?.topics)) {
            console.log('[topics-realtime] Topics updated, invalidating query');
            queryClient.invalidateQueries({ 
              queryKey: ['conversation-topics', conversationId] 
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return queryResult;
};
