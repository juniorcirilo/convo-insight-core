import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

interface ContactMetrics {
  totalConversations: number;
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  avgResponseTime: number;
  daysSinceFirstContact: number;
  satisfactionRate: number;
}

interface SentimentHistoryItem {
  id: string;
  created_at: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence_score: number | null;
  summary: string | null;
}

interface TopicDistribution {
  topic: string;
  count: number;
}

interface ConversationWithSentiment extends Tables<'whatsapp_conversations'> {
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface ContactDetails {
  contact: Tables<'whatsapp_contacts'>;
  conversations: ConversationWithSentiment[];
  metrics: ContactMetrics;
  sentimentHistory: SentimentHistoryItem[];
  topicsDistribution: TopicDistribution[];
  summaries: Tables<'whatsapp_conversation_summaries'>[];
}

export const useContactDetails = (contactId: string | null) => {
  return useQuery({
    queryKey: ['contact-details', contactId],
    queryFn: async (): Promise<ContactDetails | null> => {
      if (!contactId) return null;

      // Buscar dados do contato
      const { data: contact, error: contactError } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactError) throw contactError;

      // Buscar conversas
      const { data: conversations, error: conversationsError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      const conversationIds = conversations?.map(c => c.id) || [];

      // Buscar sentimento para cada conversa
      const conversationsWithSentiment: ConversationWithSentiment[] = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { data: sentiment } = await supabase
            .from('whatsapp_sentiment_analysis')
            .select('sentiment')
            .eq('conversation_id', conv.id)
            .maybeSingle();

          return {
            ...conv,
            sentiment: sentiment?.sentiment,
          };
        })
      );

      // Buscar mensagens
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .in('conversation_id', conversationIds);

      if (messagesError) throw messagesError;

      // Buscar análises ATUAIS de todas as conversas do contato
      const { data: currentAnalysis, error: currentError } = await supabase
        .from('whatsapp_sentiment_analysis')
        .select('id, created_at, sentiment, confidence_score, summary')
        .in('conversation_id', conversationIds);

      if (currentError) throw currentError;

      // Buscar HISTÓRICO de análises anteriores
      const { data: historyAnalysis, error: historyError } = await supabase
        .from('whatsapp_sentiment_history')
        .select('id, created_at, sentiment, confidence_score, summary')
        .eq('contact_id', contactId);

      if (historyError) throw historyError;

      // Combinar ambos e ordenar por data (histórico primeiro, atual depois para prevalecer)
      const sentimentHistory = [
        ...(historyAnalysis || []),
        ...(currentAnalysis || []),
      ].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Buscar resumos
      const { data: summaries, error: summariesError } = await supabase
        .from('whatsapp_conversation_summaries')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (summariesError) throw summariesError;

      // Calcular métricas
      const totalMessages = messages?.length || 0;
      const sentMessages = messages?.filter(m => m.is_from_me).length || 0;
      const receivedMessages = messages?.filter(m => !m.is_from_me).length || 0;

      // Calcular TMR (tempo médio de resposta)
      let totalResponseTime = 0;
      let responseCount = 0;

      for (const conversation of conversations || []) {
        const convMessages = messages?.filter(m => m.conversation_id === conversation.id)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (!convMessages) continue;

        for (let i = 0; i < convMessages.length - 1; i++) {
          const currentMsg = convMessages[i];
          const nextMsg = convMessages[i + 1];

          if (!currentMsg.is_from_me && nextMsg.is_from_me) {
            const responseTime = new Date(nextMsg.timestamp).getTime() - new Date(currentMsg.timestamp).getTime();
            const responseMinutes = responseTime / (1000 * 60);

            if (responseMinutes > 0.16 && responseMinutes < 1440) {
              totalResponseTime += responseMinutes;
              responseCount++;
            }
          }
        }
      }

      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

      // Dias desde primeiro contato
      const firstMessage = messages?.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )[0];
      const daysSinceFirstContact = firstMessage 
        ? Math.floor((Date.now() - new Date(firstMessage.timestamp).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Taxa de satisfação (baseada em sentimentos)
      const positiveSentiments = sentimentHistory?.filter(s => s.sentiment === 'positive').length || 0;
      const totalSentiments = sentimentHistory?.length || 0;
      const satisfactionRate = totalSentiments > 0 ? (positiveSentiments / totalSentiments) * 100 : 0;

      // Distribuição de tópicos
      const topicsMap = new Map<string, number>();
      for (const conversation of conversations || []) {
        // Safe JSON parsing for metadata
        let parsedMetadata: { topics?: string[] } | null = null;
        if (typeof conversation.metadata === 'string') {
          try {
            parsedMetadata = JSON.parse(conversation.metadata);
          } catch (e) {
            console.warn('Failed to parse metadata for conversation:', conversation.id);
          }
        } else {
          parsedMetadata = conversation.metadata as { topics?: string[] } | null;
        }
        const topics = parsedMetadata?.topics || [];
        
        for (const topic of topics) {
          topicsMap.set(topic, (topicsMap.get(topic) || 0) + 1);
        }
      }

      console.log('Contact details - sentimentHistory:', sentimentHistory);
      console.log('Contact details - conversations with metadata:', conversations?.map(c => ({ id: c.id, metadata: c.metadata })));

      const topicsDistribution = Array.from(topicsMap.entries())
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count);

      return {
        contact,
        conversations: conversationsWithSentiment,
        metrics: {
          totalConversations: conversations?.length || 0,
          totalMessages,
          sentMessages,
          receivedMessages,
          avgResponseTime,
          daysSinceFirstContact,
          satisfactionRate,
        },
        sentimentHistory: sentimentHistory || [],
        topicsDistribution,
        summaries: summaries || [],
      };
    },
    enabled: !!contactId,
    staleTime: 30000,
  });
};
