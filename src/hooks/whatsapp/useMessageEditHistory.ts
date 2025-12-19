import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EditHistoryEntry {
  id: string;
  previous_content: string;
  edited_at: string;
  created_at: string;
}

export const useMessageEditHistory = (messageId: string | null) => {
  return useQuery({
    queryKey: ['message-edit-history', messageId],
    queryFn: async (): Promise<EditHistoryEntry[]> => {
      if (!messageId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_message_edit_history')
        .select('*')
        .eq('message_id', messageId)
        .order('edited_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!messageId,
  });
};
