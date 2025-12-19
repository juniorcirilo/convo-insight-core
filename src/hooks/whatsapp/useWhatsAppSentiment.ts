import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type SentimentAnalysis = Tables<'whatsapp_sentiment_analysis'>;

export const useWhatsAppSentiment = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const { data: sentiment, isLoading, error, refetch } = useQuery({
    queryKey: ['whatsapp', 'sentiment', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('whatsapp_sentiment_analysis')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error) throw error;
      return data as SentimentAnalysis | null;
    },
    enabled: !!conversationId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (params: { conversationId: string }) => {
      const { data, error } = await supabase.functions.invoke('analyze-whatsapp-sentiment', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'sentiment', conversationId] });
      }
    },
  });

  // Realtime subscription for sentiment updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`sentiment-updates-${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_sentiment_analysis',
      }, (payload) => {
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;
        
        if (newRecord?.conversation_id === conversationId || 
            oldRecord?.conversation_id === conversationId) {
          console.log('[sentiment-realtime] Update detected, invalidating query');
          queryClient.invalidateQueries({ 
            queryKey: ['whatsapp', 'sentiment', conversationId] 
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return {
    sentiment,
    isLoading,
    error,
    isAnalyzing: analyzeMutation.isPending,
    analyze: () => analyzeMutation.mutate({ conversationId: conversationId! }),
    refetch,
  };
};
