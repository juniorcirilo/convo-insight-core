import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";

type Message = Tables<'whatsapp_messages'>;

interface ReplyPreviewProps {
  message: Message;
  onCancel: () => void;
}

export const ReplyPreview = ({ message, onCancel }: ReplyPreviewProps) => {
  const getSenderName = () => {
    return message.is_from_me ? 'Você' : 'Contato';
  };

  const getPreviewContent = () => {
    if (message.message_type === 'image') return '📷 Imagem';
    if (message.message_type === 'audio') return '🎤 Áudio';
    if (message.message_type === 'video') return '🎥 Vídeo';
    if (message.message_type === 'document') return '📄 Documento';
    if (message.message_type === 'sticker') return '🎨 Sticker';
    
    const content = message.content || '';
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  return (
    <div className="px-4 pt-3 pb-2 bg-muted/50 border-b border-border">
      <div className="flex items-start gap-3">
        <div className="h-full w-1 bg-primary rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground mb-0.5">
            {getSenderName()}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {getPreviewContent()}
          </p>
        </div>
        <Button
          onClick={onCancel}
          size="icon"
          variant="ghost"
          className="h-6 w-6 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
