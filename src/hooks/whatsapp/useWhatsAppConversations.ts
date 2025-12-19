import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Conversation = Tables<'whatsapp_conversations'>;
type Contact = Tables<'whatsapp_contacts'>;

interface ConversationWithContact extends Conversation {
  contact: Contact;
  isLastMessageFromMe?: boolean;
}

interface ConversationsFilters {
  instanceId?: string;
  search?: string;
  status?: string;
  assignedTo?: string;
  unassigned?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ConversationsResult {
  conversations: ConversationWithContact[];
  totalCount: number;
  totalPages: number;
  unreadCount: number;
  waitingCount: number;
}

export const useWhatsAppConversations = (filters?: ConversationsFilters) => {
  const queryClient = useQueryClient();
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, isLoading, error } = useQuery({
    queryKey: ['whatsapp', 'conversations', filters],
    queryFn: async () => {
      // Query 1: Get paginated conversations
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:whatsapp_contacts(*),
          assigned_profile:profiles(id, full_name, avatar_url)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(from, to);

      if (filters?.instanceId) {
        query = query.eq('instance_id', filters.instanceId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.unassigned) {
        query = query.is('assigned_to', null);
      }

      const { data: conversationsData, error } = await query;

      if (error) throw error;

      let result = conversationsData as unknown as ConversationWithContact[];

      // Query 2: Get total count (without pagination)
      let countQuery = supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true });

      if (filters?.instanceId) {
        countQuery = countQuery.eq('instance_id', filters.instanceId);
      }

      if (filters?.status) {
        countQuery = countQuery.eq('status', filters.status);
      }

      if (filters?.assignedTo) {
        countQuery = countQuery.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.unassigned) {
        countQuery = countQuery.is('assigned_to', null);
      }

      const { count: totalCount } = await countQuery;

      // Query 3: Get unread count (all conversations)
      let unreadQuery = supabase
        .from('whatsapp_conversations')
        .select('unread_count', { count: 'exact' })
        .gt('unread_count', 0);

      if (filters?.instanceId) {
        unreadQuery = unreadQuery.eq('instance_id', filters.instanceId);
      }

      if (filters?.status) {
        unreadQuery = unreadQuery.eq('status', filters.status);
      }

      if (filters?.assignedTo) {
        unreadQuery = unreadQuery.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.unassigned) {
        unreadQuery = unreadQuery.is('assigned_to', null);
      }

      const { count: unreadCount } = await unreadQuery;

      // Buscar is_from_me da última mensagem de cada conversa (só das paginadas)
      const conversationIds = result.map(c => c.id);
      
      // Também buscar todas as conversas para calcular waitingCount
      let allConversationsQuery = supabase
        .from('whatsapp_conversations')
        .select('id');

      if (filters?.instanceId) {
        allConversationsQuery = allConversationsQuery.eq('instance_id', filters.instanceId);
      }

      if (filters?.status) {
        allConversationsQuery = allConversationsQuery.eq('status', filters.status);
      }

      if (filters?.assignedTo) {
        allConversationsQuery = allConversationsQuery.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.unassigned) {
        allConversationsQuery = allConversationsQuery.is('assigned_to', null);
      }

      const { data: allConversations } = await allConversationsQuery;
      const allConversationIds = allConversations?.map(c => c.id) || [];

      if (allConversationIds.length > 0) {
        const { data: allLastMessages } = await supabase
          .from('whatsapp_messages')
          .select('conversation_id, is_from_me, timestamp')
          .in('conversation_id', allConversationIds)
          .order('timestamp', { ascending: false });

        if (allLastMessages) {
          // Agrupar por conversation_id e pegar a primeira (mais recente)
          const lastMessageMap = new Map<string, boolean>();
          allLastMessages.forEach(msg => {
            if (!lastMessageMap.has(msg.conversation_id)) {
              lastMessageMap.set(msg.conversation_id, msg.is_from_me || false);
            }
          });

          // Aplicar aos resultados paginados
          result = result.map(conv => ({
            ...conv,
            isLastMessageFromMe: lastMessageMap.get(conv.id),
          }));

          // Calcular waitingCount (mensagens do cliente sem resposta)
          const waitingCount = allConversationIds.filter(
            id => lastMessageMap.get(id) === false
          ).length;

          const totalPages = Math.ceil((totalCount || 0) / pageSize);

          return {
            conversations: result,
            totalCount: totalCount || 0,
            totalPages,
            unreadCount: unreadCount || 0,
            waitingCount,
          } as ConversationsResult;
        }
      }

      const totalPages = Math.ceil((totalCount || 0) / pageSize);

      return {
        conversations: result,
        totalCount: totalCount || 0,
        totalPages,
        unreadCount: unreadCount || 0,
        waitingCount: 0,
      } as ConversationsResult;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('conversations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_conversations'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    conversations: data?.conversations || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    unreadCount: data?.unreadCount || 0,
    waitingCount: data?.waitingCount || 0,
    isLoading,
    error,
  };
};
