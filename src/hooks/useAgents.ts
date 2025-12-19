import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Agent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  role: 'admin' | 'supervisor' | 'agent';
  activeConversations: number;
}

export const useAgents = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      // Get all profiles with roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          status
        `);

      if (profilesError) throw profilesError;

      // Get roles for each profile
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get active conversations count for each agent
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('whatsapp_conversations')
        .select('assigned_to')
        .eq('status', 'active')
        .not('assigned_to', 'is', null);

      if (conversationsError) throw conversationsError;

      // Count conversations per agent
      const conversationCounts = conversationsData.reduce((acc, conv) => {
        const agentId = conv.assigned_to;
        if (agentId) {
          acc[agentId] = (acc[agentId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Merge data
      const agents: Agent[] = profilesData
        .map(profile => {
          const roleData = rolesData.find(r => r.user_id === profile.id);
          return {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            status: profile.status as 'online' | 'offline' | 'away' | 'busy',
            role: (roleData?.role || 'agent') as 'admin' | 'supervisor' | 'agent',
            activeConversations: conversationCounts[profile.id] || 0,
          };
        })
        .filter(agent => ['admin', 'supervisor', 'agent'].includes(agent.role));

      return agents;
    },
  });

  const onlineAgents = data?.filter(agent => agent.status === 'online') || [];

  return {
    agents: data || [],
    onlineAgents,
    isLoading,
    error,
  };
};
