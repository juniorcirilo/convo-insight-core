import { supabase } from '@/integrations/supabase/client';

export async function exportConversation(conversationId: string) {
  // Fetch all messages
  const { data: messages, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Erro ao buscar mensagens:', error);
    throw error;
  }

  // Fetch conversation details
  const { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('*, contact:whatsapp_contacts(*)')
    .eq('id', conversationId)
    .single();

  // Format export data
  const exportData = {
    conversation: {
      id: conversationId,
      contact: conversation?.contact || null,
      status: conversation?.status || 'unknown',
      created_at: conversation?.created_at || new Date().toISOString(),
    },
    messages: messages || [],
    exported_at: new Date().toISOString(),
    total_messages: messages?.length || 0,
  };

  // Create and download JSON file
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `conversa-${conversation?.contact?.name || conversationId}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
