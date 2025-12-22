import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Agent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  role: 'admin' | 'supervisor' | 'agent';
  activeConversations: number;
  sectors: string[]; // Array of sector IDs the agent belongs to
}

interface UseAgentsOptions {
  sectorId?: string;
  instanceId?: string;
}

export const useAgents = (options?: UseAgentsOptions) => {
  const { sectorId, instanceId } = options || {};

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents', sectorId, instanceId],
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

      // Get user sectors with sector details
      const { data: userSectorsData, error: userSectorsError } = await supabase
        .from('user_sectors')
        .select(`
          user_id,
          sector_id,
          sectors!inner(instance_id)
        `);

      if (userSectorsError) throw userSectorsError;

      // Count conversations per agent
      const conversationCounts = conversationsData.reduce((acc, conv) => {
        const agentId = conv.assigned_to;
        if (agentId) {
          acc[agentId] = (acc[agentId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Map sectors per user
      const userSectorsMap = userSectorsData.reduce((acc, us: any) => {
        if (!acc[us.user_id]) {
          acc[us.user_id] = { sectorIds: [], instanceIds: [] };
        }
        acc[us.user_id].sectorIds.push(us.sector_id);
        if (us.sectors?.instance_id) {
          acc[us.user_id].instanceIds.push(us.sectors.instance_id);
        }
        return acc;
      }, {} as Record<string, { sectorIds: string[]; instanceIds: string[] }>);

      // Merge data
      let agents: Agent[] = profilesData
        .map(profile => {
          const roleData = rolesData.find(r => r.user_id === profile.id);
          const userSectorData = userSectorsMap[profile.id] || { sectorIds: [], instanceIds: [] };
          
          return {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            status: profile.status as 'online' | 'offline' | 'away' | 'busy',
            role: (roleData?.role || 'agent') as 'admin' | 'supervisor' | 'agent',
            activeConversations: conversationCounts[profile.id] || 0,
            sectors: userSectorData.sectorIds,
            _instanceIds: userSectorData.instanceIds,
          };
        })
        .filter(agent => ['admin', 'supervisor', 'agent'].includes(agent.role));

      // Filter by sector if provided
      if (sectorId) {
        agents = agents.filter(agent => 
          agent.sectors.includes(sectorId) || agent.role === 'admin'
        );
      }

      // Filter by instance if provided
      if (instanceId) {
        agents = agents.filter(agent => 
          (agent as any)._instanceIds?.includes(instanceId) || agent.role === 'admin'
        );
      }

      // Remove internal _instanceIds before returning
      return agents.map(({ ...agent }) => {
        delete (agent as any)._instanceIds;
        return agent;
      });
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
