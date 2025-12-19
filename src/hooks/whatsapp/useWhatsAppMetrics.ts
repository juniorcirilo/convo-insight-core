import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export interface WhatsAppMetricsFilters {
  dateRange: { from: Date; to: Date };
  instanceId?: string | null;
  agentId?: string | null;
}

export interface WhatsAppMetrics {
  total: number;
  active: number;
  closed: number;
  archived: number;
  avgResponseTimeMinutes: number;
  resolutionRate: number;
  avgFirstResponseTimeMinutes: number;
  dailyTrend: { date: string; count: number }[];
  statusDistribution: { status: string; count: number; percentage: number }[];
  topicsDistribution: { topic: string; count: number }[];
  sentimentDistribution: { sentiment: string; count: number; percentage: number }[];
  longestConversations: Array<{
    id: string;
    contactName: string;
    status: string;
    durationHours: number;
    createdAt: string;
  }>;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    totalConversations: number;
    closedConversations: number;
    avgResponseTimeMinutes: number;
  }>;
  // New metrics
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  uniqueContacts: number;
  avgMessagesPerConversation: number;
  queuedConversations: number;
  avgResolutionTimeMinutes: number;
  engagementRate: number;
  messageTypeDistribution: { type: string; count: number; percentage: number }[];
  hourlyActivity: { hour: number; count: number }[];
  weekdayActivity: { weekday: string; count: number }[];
  topContacts: { contactId: string; contactName: string; messageCount: number }[];
  instanceComparison: { instanceId: string; instanceName: string; conversations: number; messages: number; contacts: number }[];
  dailyMessageTrend: { date: string; sent: number; received: number }[];
  // Previous period comparison
  previousPeriod: {
    total: number;
    active: number;
    closed: number;
    archived: number;
    avgResponseTimeMinutes: number;
    resolutionRate: number;
    avgFirstResponseTimeMinutes: number;
  };
}

export const useWhatsAppMetrics = (filters: WhatsAppMetricsFilters) => {
  return useQuery({
    queryKey: ['whatsapp-metrics', filters.dateRange.from.toISOString(), filters.dateRange.to.toISOString(), filters.instanceId, filters.agentId],
    queryFn: async () => {
      const { from, to } = filters.dateRange;

      // Build base query for conversations
      let conversationsQuery = supabase
        .from('whatsapp_conversations')
        .select('id, status, last_message_at, created_at, contact_id, metadata, instance_id, assigned_to')
        .gte('last_message_at', from.toISOString())
        .lte('last_message_at', to.toISOString());

      // Apply instance filter if provided
      if (filters.instanceId) {
        conversationsQuery = conversationsQuery.eq('instance_id', filters.instanceId);
      }

      // Apply agent filter if provided
      if (filters.agentId) {
        conversationsQuery = conversationsQuery.eq('assigned_to', filters.agentId);
      }

      const { data: conversations, error: convError } = await conversationsQuery;

      if (convError) throw convError;

      const total = conversations?.length || 0;
      const active = conversations?.filter((c: any) => c.status === 'active').length || 0;
      const closed = conversations?.filter((c: any) => c.status === 'closed').length || 0;
      const archived = conversations?.filter((c: any) => c.status === 'archived').length || 0;

      // Calculate average response time
      const conversationIds = conversations?.map((c: any) => c.id) || [];
      let avgResponseTimeMinutes = 0;
      let avgFirstResponseTimeMinutes = 0;
      let messagesByConv: Record<string, any[]> = {};

      if (conversationIds.length > 0) {
        const { data: messages, error: msgError } = await supabase
          .from('whatsapp_messages')
          .select('conversation_id, is_from_me, timestamp')
          .in('conversation_id', conversationIds)
          .order('timestamp', { ascending: true });

        if (msgError) throw msgError;

        // Calculate TMR: for each client message, find the next CSM message
        const responseTimes: number[] = [];
        messagesByConv = messages?.reduce((acc: any, msg: any) => {
          if (!acc[msg.conversation_id]) acc[msg.conversation_id] = [];
          acc[msg.conversation_id].push(msg);
          return acc;
        }, {} as Record<string, any[]>) || {};

        Object.values(messagesByConv).forEach((convMessages: any[]) => {
          for (let i = 0; i < convMessages.length; i++) {
            const msg = convMessages[i];

            // If it's a client message, find next CSM message
            if (!msg.is_from_me) {
              const nextCsmMsg = convMessages.slice(i + 1).find(m => m.is_from_me);
              if (nextCsmMsg) {
                const clientTime = new Date(msg.timestamp).getTime();
                const csmTime = new Date(nextCsmMsg.timestamp).getTime();
                const diffMinutes = (csmTime - clientTime) / (1000 * 60);

                // Ignore very fast responses (< 10s, probably automatic)
                // and very slow (> 24h, probably abandoned conversation)
                if (diffMinutes > 0.16 && diffMinutes < 1440) {
                  responseTimes.push(diffMinutes);
                }
              }
            }
          }
        });

        if (responseTimes.length > 0) {
          avgResponseTimeMinutes = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
        }

        // Calculate average first response time
        const firstResponseTimes: number[] = [];

        Object.values(messagesByConv).forEach((convMessages: any[]) => {
          // Find first client message
          const firstClientMsg = convMessages.find(m => !m.is_from_me);
          if (!firstClientMsg) return;

          // Find first agent response AFTER client message
          const firstAgentResponse = convMessages.find(
            m => m.is_from_me && new Date(m.timestamp) > new Date(firstClientMsg.timestamp)
          );

          if (firstAgentResponse) {
            const diffMinutes = (new Date(firstAgentResponse.timestamp).getTime() - new Date(firstClientMsg.timestamp).getTime()) / (1000 * 60);
            
            // Filter extreme values (> 0 and < 24h)
            if (diffMinutes > 0 && diffMinutes < 1440) {
              firstResponseTimes.push(diffMinutes);
            }
          }
        });

        if (firstResponseTimes.length > 0) {
          avgFirstResponseTimeMinutes = firstResponseTimes.reduce((sum, t) => sum + t, 0) / firstResponseTimes.length;
        }
      }

      // Calculate resolution rate
      const resolutionRate = total > 0 ? (closed / total) * 100 : 0;

      // Calculate daily trend with all days in range
      const days = eachDayOfInterval({ start: from, end: to });
      const conversationsByDate = conversations?.reduce((acc: Record<string, number>, conv: any) => {
        const date = format(new Date(conv.last_message_at), 'dd/MM');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};

      const dailyTrend = days.map(day => {
        const dateKey = format(day, 'dd/MM');
        return {
          date: dateKey,
          count: conversationsByDate[dateKey] || 0
        };
      });

      // Calculate status distribution
      const statusDistribution = [
        { status: 'active', count: active, percentage: total > 0 ? (active / total) * 100 : 0 },
        { status: 'closed', count: closed, percentage: total > 0 ? (closed / total) * 100 : 0 },
        { status: 'archived', count: archived, percentage: total > 0 ? (archived / total) * 100 : 0 },
      ];

      // Calculate topics distribution
      const topicCounts: Record<string, number> = {};
      conversations?.forEach((conv: any) => {
        const metadata = conv.metadata as any;
        if (metadata?.topics && Array.isArray(metadata.topics)) {
          metadata.topics.forEach((topic: string) => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          });
        }
      });

      const topicsDistribution = Object.entries(topicCounts).map(([topic, count]) => ({
        topic,
        count
      }));

      // Calculate sentiment distribution
      const { data: sentimentData, error: sentimentError } = await supabase
        .from('whatsapp_sentiment_analysis')
        .select('sentiment, conversation_id')
        .in('conversation_id', conversationIds);

      const sentimentCounts = sentimentData?.reduce((acc: Record<string, number>, item: any) => {
        acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalWithSentiment = Object.values(sentimentCounts).reduce((sum, count) => sum + count, 0);
      const sentimentDistribution = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
        sentiment,
        count,
        percentage: totalWithSentiment > 0 ? (count / totalWithSentiment) * 100 : 0
      }));

      // Fetch longest conversations
      const { data: longestConvs, error: longestError } = await supabase
        .from('whatsapp_conversations')
        .select('id, created_at, last_message_at, status, contact_id')
        .gte('last_message_at', from.toISOString())
        .lte('last_message_at', to.toISOString())
        .order('created_at', { ascending: true })
        .limit(10);

      if (longestError) throw longestError;

      // Fetch contact details
      const contactIds = (longestConvs as any[])?.map(c => c.contact_id).filter(Boolean) || [];

      const { data: contactsData } = contactIds.length > 0
        ? await supabase
            .from('whatsapp_contacts')
            .select('id, name, phone_number')
            .in('id', contactIds)
        : { data: [] };

      const contactsMap = new Map((contactsData || []).map((c: any) => [c.id, c]));

      const longestConversations = longestConvs?.map((conv: any) => {
        const contact = contactsMap.get(conv.contact_id);
        const durationMs = new Date(conv.last_message_at).getTime() - new Date(conv.created_at).getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        return {
          id: conv.id,
          contactName: contact?.name || contact?.phone_number || 'Desconhecido',
          status: conv.status,
          durationHours,
          createdAt: conv.created_at
        };
      }).sort((a: any, b: any) => b.durationHours - a.durationHours) || [];

      // Calculate agent performance
      const agentPerformance: Array<{
        agentId: string;
        agentName: string;
        totalConversations: number;
        closedConversations: number;
        avgResponseTimeMinutes: number;
      }> = [];

      // Group conversations by agent
      const conversationsByAgent = conversations?.reduce((acc: Record<string, any[]>, conv: any) => {
        const agentId = conv.assigned_to;
        if (agentId) {
          if (!acc[agentId]) acc[agentId] = [];
          acc[agentId].push(conv);
        }
        return acc;
      }, {} as Record<string, any[]>) || {};

      const agentIds = Object.keys(conversationsByAgent);
      
      if (agentIds.length > 0) {
        // Fetch agent details
        const { data: agentsData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', agentIds);

        for (const agent of agentsData || []) {
          const agentConvs = conversationsByAgent[agent.id] || [];
          const agentConvIds = agentConvs.map(c => c.id);
          
          // Calculate agent response time
          let agentAvgResponseTime = 0;
          if (agentConvIds.length > 0) {
            const agentResponseTimes: number[] = [];
            
            agentConvIds.forEach((convId: string) => {
              const convMessages = messagesByConv[convId] || [];
              for (let i = 0; i < convMessages.length; i++) {
                const msg = convMessages[i];
                if (!msg.is_from_me) {
                  const nextCsmMsg = convMessages.slice(i + 1).find(m => m.is_from_me);
                  if (nextCsmMsg) {
                    const clientTime = new Date(msg.timestamp).getTime();
                    const csmTime = new Date(nextCsmMsg.timestamp).getTime();
                    const diffMinutes = (csmTime - clientTime) / (1000 * 60);
                    if (diffMinutes > 0.16 && diffMinutes < 1440) {
                      agentResponseTimes.push(diffMinutes);
                    }
                  }
                }
              }
            });

            if (agentResponseTimes.length > 0) {
              agentAvgResponseTime = agentResponseTimes.reduce((sum, t) => sum + t, 0) / agentResponseTimes.length;
            }
          }

          agentPerformance.push({
            agentId: agent.id,
            agentName: agent.full_name,
            totalConversations: agentConvs.length,
            closedConversations: agentConvs.filter(c => c.status === 'closed').length,
            avgResponseTimeMinutes: agentAvgResponseTime
          });
        }
      }

      // Calculate previous period metrics for comparison
      const periodDuration = to.getTime() - from.getTime();
      const previousFrom = new Date(from.getTime() - periodDuration);
      const previousTo = new Date(from.getTime());

      let previousQuery = supabase
        .from('whatsapp_conversations')
        .select('id, status, last_message_at')
        .gte('last_message_at', previousFrom.toISOString())
        .lt('last_message_at', previousTo.toISOString());

      if (filters.instanceId) {
        previousQuery = previousQuery.eq('instance_id', filters.instanceId);
      }

      if (filters.agentId) {
        previousQuery = previousQuery.eq('assigned_to', filters.agentId);
      }

      const { data: previousConversations } = await previousQuery;

      const previousTotal = previousConversations?.length || 0;
      const previousActive = previousConversations?.filter((c: any) => c.status === 'active').length || 0;
      const previousClosed = previousConversations?.filter((c: any) => c.status === 'closed').length || 0;
      const previousArchived = previousConversations?.filter((c: any) => c.status === 'archived').length || 0;

      // Calculate previous period response time
      const previousConversationIds = previousConversations?.map((c: any) => c.id) || [];
      let previousAvgResponseTimeMinutes = 0;
      let previousAvgFirstResponseTimeMinutes = 0;

      if (previousConversationIds.length > 0) {
        const { data: previousMessages } = await supabase
          .from('whatsapp_messages')
          .select('conversation_id, is_from_me, timestamp')
          .in('conversation_id', previousConversationIds)
          .order('timestamp', { ascending: true });

        const previousResponseTimes: number[] = [];
        const previousMessagesByConv = previousMessages?.reduce((acc: any, msg: any) => {
          if (!acc[msg.conversation_id]) acc[msg.conversation_id] = [];
          acc[msg.conversation_id].push(msg);
          return acc;
        }, {} as Record<string, any[]>) || {};

        Object.values(previousMessagesByConv).forEach((convMessages: any[]) => {
          for (let i = 0; i < convMessages.length; i++) {
            const msg = convMessages[i];
            if (!msg.is_from_me) {
              const nextCsmMsg = convMessages.slice(i + 1).find(m => m.is_from_me);
              if (nextCsmMsg) {
                const clientTime = new Date(msg.timestamp).getTime();
                const csmTime = new Date(nextCsmMsg.timestamp).getTime();
                const diffMinutes = (csmTime - clientTime) / (1000 * 60);
                if (diffMinutes > 0.16 && diffMinutes < 1440) {
                  previousResponseTimes.push(diffMinutes);
                }
              }
            }
          }
        });

        if (previousResponseTimes.length > 0) {
          previousAvgResponseTimeMinutes = previousResponseTimes.reduce((sum, t) => sum + t, 0) / previousResponseTimes.length;
        }

        // Calculate previous period first response time
        const previousFirstResponseTimes: number[] = [];

        Object.values(previousMessagesByConv).forEach((convMessages: any[]) => {
          const firstClientMsg = convMessages.find(m => !m.is_from_me);
          if (!firstClientMsg) return;

          const firstAgentResponse = convMessages.find(
            m => m.is_from_me && new Date(m.timestamp) > new Date(firstClientMsg.timestamp)
          );

          if (firstAgentResponse) {
            const diffMinutes = (new Date(firstAgentResponse.timestamp).getTime() - new Date(firstClientMsg.timestamp).getTime()) / (1000 * 60);
            if (diffMinutes > 0 && diffMinutes < 1440) {
              previousFirstResponseTimes.push(diffMinutes);
            }
          }
        });

        if (previousFirstResponseTimes.length > 0) {
          previousAvgFirstResponseTimeMinutes = previousFirstResponseTimes.reduce((sum, t) => sum + t, 0) / previousFirstResponseTimes.length;
        }
      }

      // Calculate previous period resolution rate
      const previousResolutionRate = previousTotal > 0 ? (previousClosed / previousTotal) * 100 : 0;

      // Calculate new metrics
      const { data: allMessages } = await supabase
        .from('whatsapp_messages')
        .select('id, conversation_id, is_from_me, message_type, timestamp, contact:whatsapp_conversations!inner(contact_id, instance_id, whatsapp_contacts!inner(id, name, phone_number), whatsapp_instances!inner(id, name))')
        .in('conversation_id', conversationIds);

      const totalMessages = allMessages?.length || 0;
      const sentMessages = allMessages?.filter(m => m.is_from_me).length || 0;
      const receivedMessages = allMessages?.filter(m => !m.is_from_me).length || 0;
      
      // Calculate unique contacts
      const uniqueContactIds = new Set(conversations?.map(c => c.contact_id));
      const uniqueContacts = uniqueContactIds.size;

      // Calculate average messages per conversation
      const avgMessagesPerConversation = conversationIds.length > 0 ? totalMessages / conversationIds.length : 0;

      // Calculate queued conversations (no assigned agent)
      const { data: queuedConvs } = await supabase
        .from('whatsapp_conversations')
        .select('id', { count: 'exact', head: true })
        .is('assigned_to', null)
        .eq('status', 'active');
      const queuedConversations = queuedConvs || 0;

      // Calculate average resolution time (for closed conversations)
      const closedConvs = conversations?.filter(c => c.status === 'closed') || [];
      const resolutionTimes = closedConvs.map(conv => {
        const durationMs = new Date(conv.last_message_at || conv.created_at).getTime() - new Date(conv.created_at).getTime();
        return durationMs / (1000 * 60); // minutes
      });
      const avgResolutionTimeMinutes = resolutionTimes.length > 0 
        ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length 
        : 0;

      // Calculate engagement rate
      const engagementRate = sentMessages > 0 ? (receivedMessages / sentMessages) * 100 : 0;

      // Calculate message type distribution
      const messageTypeCounts: Record<string, number> = {};
      allMessages?.forEach(msg => {
        const type = msg.message_type || 'text';
        messageTypeCounts[type] = (messageTypeCounts[type] || 0) + 1;
      });
      const messageTypeDistribution = Object.entries(messageTypeCounts).map(([type, count]) => ({
        type,
        count,
        percentage: totalMessages > 0 ? (count / totalMessages) * 100 : 0
      }));

      // Calculate hourly activity (0-23h)
      const hourlyCounts = new Array(24).fill(0);
      allMessages?.forEach(msg => {
        const hour = new Date(msg.timestamp).getHours();
        hourlyCounts[hour]++;
      });
      const hourlyActivity = hourlyCounts.map((count, hour) => ({ hour, count }));

      // Calculate weekday activity
      const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weekdayCounts = new Array(7).fill(0);
      allMessages?.forEach(msg => {
        const day = new Date(msg.timestamp).getDay();
        weekdayCounts[day]++;
      });
      const weekdayActivity = weekdayCounts.map((count, idx) => ({ 
        weekday: weekdayNames[idx], 
        count 
      }));

      // Calculate top 10 contacts by message count
      const contactMessageCounts: Record<string, { name: string; count: number }> = {};
      allMessages?.forEach(msg => {
        const contact = (msg as any).contact;
        if (contact && contact.whatsapp_contacts) {
          const contactData = contact.whatsapp_contacts;
          const contactId = contactData.id;
          if (!contactMessageCounts[contactId]) {
            contactMessageCounts[contactId] = {
              name: contactData.name || contactData.phone_number,
              count: 0
            };
          }
          contactMessageCounts[contactId].count++;
        }
      });
      const topContacts = Object.entries(contactMessageCounts)
        .map(([contactId, data]) => ({
          contactId,
          contactName: data.name,
          messageCount: data.count
        }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10);

      // Calculate instance comparison (if no instance filter applied)
      let instanceComparison: Array<{ instanceId: string; instanceName: string; conversations: number; messages: number; contacts: number }> = [];
      if (!filters.instanceId) {
        const instanceStats: Record<string, { name: string; conversations: Set<string>; messages: number; contacts: Set<string> }> = {};
        
        conversations?.forEach(conv => {
          if (!instanceStats[conv.instance_id]) {
            instanceStats[conv.instance_id] = {
              name: '',
              conversations: new Set(),
              messages: 0,
              contacts: new Set()
            };
          }
          instanceStats[conv.instance_id].conversations.add(conv.id);
          instanceStats[conv.instance_id].contacts.add(conv.contact_id);
        });

        allMessages?.forEach(msg => {
          const contact = (msg as any).contact;
          if (contact && contact.whatsapp_instances) {
            const instanceId = contact.instance_id;
            const instanceName = contact.whatsapp_instances.name;
            if (instanceStats[instanceId]) {
              instanceStats[instanceId].name = instanceName;
              instanceStats[instanceId].messages++;
            }
          }
        });

        instanceComparison = Object.entries(instanceStats).map(([instanceId, data]) => ({
          instanceId,
          instanceName: data.name || 'Instância',
          conversations: data.conversations.size,
          messages: data.messages,
          contacts: data.contacts.size
        }));
      }

      // Calculate daily message trend (sent vs received)
      const messageDays = eachDayOfInterval({ start: from, end: to });
      const dailyMessagesByDate = allMessages?.reduce((acc: Record<string, { sent: number; received: number }>, msg: any) => {
        const date = format(new Date(msg.timestamp), 'dd/MM');
        if (!acc[date]) acc[date] = { sent: 0, received: 0 };
        if (msg.is_from_me) {
          acc[date].sent++;
        } else {
          acc[date].received++;
        }
        return acc;
      }, {}) || {};

      const dailyMessageTrend = messageDays.map(day => {
        const dateKey = format(day, 'dd/MM');
        return {
          date: dateKey,
          sent: dailyMessagesByDate[dateKey]?.sent || 0,
          received: dailyMessagesByDate[dateKey]?.received || 0
        };
      });

      return {
        total,
        active,
        closed,
        archived,
        avgResponseTimeMinutes,
        resolutionRate,
        avgFirstResponseTimeMinutes,
        dailyTrend,
        statusDistribution,
        topicsDistribution,
        sentimentDistribution,
        longestConversations,
        agentPerformance,
        totalMessages,
        sentMessages,
        receivedMessages,
        uniqueContacts,
        avgMessagesPerConversation,
        queuedConversations,
        avgResolutionTimeMinutes,
        engagementRate,
        messageTypeDistribution,
        hourlyActivity,
        weekdayActivity,
        topContacts,
        instanceComparison,
        dailyMessageTrend,
        previousPeriod: {
          total: previousTotal,
          active: previousActive,
          closed: previousClosed,
          archived: previousArchived,
          avgResponseTimeMinutes: previousAvgResponseTimeMinutes,
          resolutionRate: previousResolutionRate,
          avgFirstResponseTimeMinutes: previousAvgFirstResponseTimeMinutes
        }
      } as WhatsAppMetrics;
    },
    refetchInterval: 60000, // Refetch every 1 minute
  });
};
