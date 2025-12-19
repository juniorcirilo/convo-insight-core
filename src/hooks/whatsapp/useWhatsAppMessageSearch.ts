import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useWhatsAppMessageSearch = (searchQuery: string) => {
  return useQuery({
    queryKey: ['whatsapp-message-search', searchQuery],
    queryFn: async () => {
      // Só busca se tiver 3+ caracteres
      if (!searchQuery || searchQuery.trim().length < 3) {
        return [];
      }

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('conversation_id, content, timestamp')
        .ilike('content', `%${searchQuery.trim()}%`)
        .order('timestamp', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        throw error;
      }

      // Retornar IDs únicos de conversas
      const uniqueConversationIds = [...new Set(data.map(msg => msg.conversation_id))];
      return uniqueConversationIds;
    },
    enabled: searchQuery.trim().length >= 3,
    staleTime: 30000, // Cache por 30 segundos
  });
};
