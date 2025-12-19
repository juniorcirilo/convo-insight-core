import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface ConversationNote {
  id: string;
  conversation_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const useConversationNotes = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const { data: notes, isLoading, refetch } = useQuery({
    queryKey: ['conversation-notes', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_conversation_notes')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ConversationNote[];
    },
    enabled: !!conversationId
  });

  // Realtime
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`notes-realtime-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversation_notes',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch]);

  const createNote = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('whatsapp_conversation_notes')
        .insert({
          conversation_id: conversationId,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Observação adicionada');
      queryClient.invalidateQueries({ queryKey: ['conversation-notes', conversationId] });
    },
    onError: () => {
      toast.error('Erro ao adicionar observação');
    }
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, content, is_pinned }: { noteId: string; content?: string; is_pinned?: boolean }) => {
      const updates: Partial<Pick<ConversationNote, 'content' | 'is_pinned'>> = {};
      if (content !== undefined) updates.content = content;
      if (is_pinned !== undefined) updates.is_pinned = is_pinned;

      const { error } = await supabase
        .from('whatsapp_conversation_notes')
        .update(updates)
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Observação atualizada');
      queryClient.invalidateQueries({ queryKey: ['conversation-notes', conversationId] });
    },
    onError: () => {
      toast.error('Erro ao atualizar observação');
    }
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('whatsapp_conversation_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Observação excluída');
      queryClient.invalidateQueries({ queryKey: ['conversation-notes', conversationId] });
    },
    onError: () => {
      toast.error('Erro ao excluir observação');
    }
  });

  const togglePin = (noteId: string, currentPinned: boolean) => {
    updateNote.mutate({ noteId, is_pinned: !currentPinned });
  };

  return {
    notes: notes || [],
    isLoading,
    createNote: createNote.mutate,
    updateNote: updateNote.mutate,
    deleteNote: deleteNote.mutate,
    togglePin,
    isCreating: createNote.isPending
  };
};