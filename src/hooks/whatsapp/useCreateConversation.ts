import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Conversation = Tables<'whatsapp_conversations'>;
type Contact = Tables<'whatsapp_contacts'>;

interface CreateConversationParams {
  instanceId: string;
  phoneNumber: string;
  contactName: string;
  profilePictureUrl?: string;
}

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: CreateConversationParams) => {
      // 1. Upsert contact
      const { data: contact, error: contactError } = await supabase
        .from('whatsapp_contacts')
        .upsert({
          instance_id: params.instanceId,
          phone_number: params.phoneNumber,
          name: params.contactName,
          profile_picture_url: params.profilePictureUrl,
        }, {
          onConflict: 'instance_id,phone_number',
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // 2. Check if conversation already exists
      const { data: existingConv, error: checkError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('instance_id', params.instanceId)
        .eq('contact_id', contact.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingConv) {
        return { conversation: existingConv, contact };
      }

      // 3. Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          instance_id: params.instanceId,
          contact_id: contact.id,
          status: 'active',
          unread_count: 0,
        })
        .select()
        .single();

      if (convError) throw convError;

      return { conversation, contact };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    },
  });

  return mutation;
};
