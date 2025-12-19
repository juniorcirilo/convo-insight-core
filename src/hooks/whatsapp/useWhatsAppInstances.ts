import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Instance = Tables<'whatsapp_instances'> & { provider_type?: string };
type InstanceInsert = TablesInsert<'whatsapp_instances'>;
type InstanceUpdate = TablesUpdate<'whatsapp_instances'>;

// Extended types that include secrets and provider_type
type InstanceInsertWithSecrets = InstanceInsert & {
  api_url: string;
  api_key: string;
  provider_type?: string;
  instance_id_external?: string;
};

type InstanceUpdateWithSecrets = InstanceUpdate & {
  api_url?: string;
  api_key?: string;
  provider_type?: string;
  instance_id_external?: string;
};

export const useWhatsAppInstances = () => {
  const queryClient = useQueryClient();

  const { data: instances = [], isLoading, error } = useQuery({
    queryKey: ['whatsapp', 'instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Instance[];
    },
  });

  const createInstance = useMutation({
    mutationFn: async (instance: InstanceInsertWithSecrets) => {
      const { api_url, api_key, provider_type, instance_id_external, ...instanceData } = instance;

      // 1. Create instance in main table with provider_type and instance_id_external
      const { data: instanceResult, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .insert({
          ...instanceData,
          provider_type: provider_type || 'self_hosted',
          instance_id_external: instance_id_external || null,
        } as any)
        .select()
        .single();

      if (instanceError) throw instanceError;

      // 2. Create secrets in separate table
      const { error: secretsError } = await supabase
        .from('whatsapp_instance_secrets')
        .insert({
          instance_id: instanceResult.id,
          api_url,
          api_key,
        });

      if (secretsError) {
        // Rollback: delete instance if secrets insertion fails
        await supabase
          .from('whatsapp_instances')
          .delete()
          .eq('id', instanceResult.id);
        throw secretsError;
      }

      return instanceResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
    },
  });

  const updateInstance = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InstanceUpdateWithSecrets }) => {
      const { api_url, api_key, provider_type, instance_id_external, ...instanceUpdates } = updates;

      // Build instance updates including provider_type and instance_id_external if provided
      const finalInstanceUpdates = {
        ...instanceUpdates,
        ...(provider_type && { provider_type }),
        ...(instance_id_external !== undefined && { instance_id_external }),
      };

      // 1. Update instance in main table
      const { data, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .update(finalInstanceUpdates as any)
        .eq('id', id)
        .select()
        .single();

      if (instanceError) throw instanceError;

      // 2. Update secrets if provided (upsert)
      if (api_url || api_key) {
        const { error: secretsError } = await supabase
          .from('whatsapp_instance_secrets')
          .upsert(
            {
              instance_id: id,
              ...(api_url && { api_url }),
              ...(api_key && { api_key }),
            },
            { onConflict: 'instance_id' }
          );

        if (secretsError) throw secretsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
    },
  });

  const deleteInstance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
    },
  });

  const testConnection = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(
        'test-instance-connection',
        { body: { instanceId: id } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate to fetch updated status
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
    },
  });

  return {
    instances,
    isLoading,
    error,
    createInstance,
    updateInstance,
    deleteInstance,
    testConnection,
  };
};