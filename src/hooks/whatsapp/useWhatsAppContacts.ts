import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ContactSortOption = 'last_interaction' | 'name_asc' | 'name_desc' | 'conversations';

export interface ContactWithMetrics {
  id: string;
  name: string;
  phone_number: string;
  profile_picture_url: string | null;
  notes: string | null;
  instance_id: string;
  total_conversations: number;
  total_messages: number;
  last_interaction: string | null;
}

export interface ContactsResult {
  contacts: ContactWithMetrics[];
  totalCount: number;
  totalPages: number;
}

export const useWhatsAppContacts = (
  instanceId?: string, 
  searchTerm?: string,
  sortBy: ContactSortOption = 'last_interaction',
  page: number = 1,
  pageSize: number = 20
) => {
  return useQuery({
    queryKey: ['whatsapp-contacts', instanceId, searchTerm, sortBy, page, pageSize],
    queryFn: async (): Promise<ContactsResult> => {
      let query = supabase
        .from('whatsapp_contacts')
        .select(`
          id,
          name,
          phone_number,
          profile_picture_url,
          notes,
          instance_id
        `);

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      if (searchTerm && searchTerm.length > 0) {
        query = query.or(`name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`);
      }

      // Get total count first
      let countQuery = supabase
        .from('whatsapp_contacts')
        .select('*', { count: 'exact', head: true });

      if (instanceId) {
        countQuery = countQuery.eq('instance_id', instanceId);
      }

      if (searchTerm && searchTerm.length > 0) {
        countQuery = countQuery.or(`name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`);
      }

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) throw countError;

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: contacts, error } = await query;

      if (error) throw error;

      // Para cada contato, buscar métricas
      const contactsWithMetrics = await Promise.all(
        (contacts || []).map(async (contact) => {
          // Total de conversas
          const { count: totalConversations } = await supabase
            .from('whatsapp_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('contact_id', contact.id);

          // Buscar conversas do contato primeiro
          const { data: contactConversations } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .eq('contact_id', contact.id);

          const conversationIds = contactConversations?.map(c => c.id) || [];

          if (conversationIds.length === 0) {
            return {
              ...contact,
              total_conversations: 0,
              total_messages: 0,
              last_interaction: null,
            };
          }

          // Total de mensagens e última interação
          const { data: messages } = await supabase
            .from('whatsapp_messages')
            .select('id, timestamp')
            .in('conversation_id', conversationIds)
            .order('timestamp', { ascending: false })
            .limit(1);

          // Contar mensagens
          const { count: totalMessages } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', conversationIds);

          return {
            ...contact,
            total_conversations: totalConversations || 0,
            total_messages: totalMessages || 0,
            last_interaction: messages?.[0]?.timestamp || null,
          };
        })
      );

      // Ordenar baseado no parâmetro sortBy
      const sortedContacts = contactsWithMetrics.sort((a, b) => {
        switch (sortBy) {
          case 'name_asc':
            return a.name.localeCompare(b.name, 'pt-BR');
          case 'name_desc':
            return b.name.localeCompare(a.name, 'pt-BR');
          case 'conversations':
            return b.total_conversations - a.total_conversations;
          case 'last_interaction':
          default:
            if (!a.last_interaction) return 1;
            if (!b.last_interaction) return -1;
            return new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime();
        }
      });

      return {
        contacts: sortedContacts,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize),
      };
    },
    staleTime: 30000,
  });
};
