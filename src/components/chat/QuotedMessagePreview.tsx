import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QuotedMessagePreviewProps {
  messageId: string;
}

export const QuotedMessagePreview = ({ messageId }: QuotedMessagePreviewProps) => {
  const { data: quotedMessage } = useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (!quotedMessage) return null;

  return (
    <div
      className={cn(
        'border-l-4 pl-2 py-1 mb-2 text-xs opacity-80',
        quotedMessage.is_from_me
          ? 'border-primary-foreground/50'
          : 'border-primary/50'
      )}
    >
      <p className="font-semibold">
        {quotedMessage.is_from_me ? 'Você' : 'Contato'}
      </p>
      <p className="line-clamp-2">{quotedMessage.content}</p>
    </div>
  );
};
