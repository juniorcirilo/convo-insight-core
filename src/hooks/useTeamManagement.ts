import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppRole = 'admin' | 'supervisor' | 'agent';

export interface TeamMember {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  role: AppRole;
  is_active: boolean;
  is_approved: boolean;
  activeConversations: number;
  created_at: string;
}

export const useTeamManagement = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, status, is_active, is_approved, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for each profile
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get active conversations count for each user
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('whatsapp_conversations')
        .select('assigned_to')
        .eq('status', 'active')
        .not('assigned_to', 'is', null);

      if (conversationsError) throw conversationsError;

      // Count conversations per user
      const conversationCounts = conversationsData.reduce((acc, conv) => {
        const userId = conv.assigned_to;
        if (userId) {
          acc[userId] = (acc[userId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Merge data
      const members: TeamMember[] = profilesData.map(profile => {
        const roleData = rolesData.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          status: profile.status as 'online' | 'offline' | 'away' | 'busy',
          role: (roleData?.role || 'agent') as AppRole,
          is_active: profile.is_active,
          is_approved: profile.is_approved ?? true,
          activeConversations: conversationCounts[profile.id] || 0,
          created_at: profile.created_at || new Date().toISOString(),
        };
      });

      return members;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Role atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar role: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(variables.isActive ? 'Membro ativado' : 'Membro desativado');
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: AppRole }) => {
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: { email, fullName, role }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Convite enviado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar convite: ' + error.message);
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Usuário aprovado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao aprovar usuário: ' + error.message);
    },
  });

  return {
    members: data || [],
    isLoading,
    updateRole: updateRoleMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    inviteMember: inviteMemberMutation.mutateAsync,
    approveUser: approveUserMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    isTogglingActive: toggleActiveMutation.isPending,
    isInviting: inviteMemberMutation.isPending,
    isApprovingUser: approveUserMutation.isPending,
  };
};
