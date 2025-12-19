import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Check, CheckCheck, Clock, Reply, Pencil, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuotedMessagePreview } from "./QuotedMessagePreview";
import { ImageViewerModal } from "./ImageViewerModal";
import { MessageReactionButton } from "./MessageReactionButton";
import { useMessageReaction } from "@/hooks/whatsapp/useMessageReaction";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EditHistoryPopover } from "./EditHistoryPopover";
import { EditMessageModal } from "./EditMessageModal";
import { useEditMessage } from "@/hooks/whatsapp/useEditMessage";

type Message = Tables<'whatsapp_messages'>;
type Reaction = Tables<'whatsapp_reactions'>;

interface MessageBubbleProps {
  message: Message;
  reactions?: Reaction[];
  onReply?: (message: Message) => void;
}

export const MessageBubble = ({ message, reactions = [], onReply }: MessageBubbleProps) => {
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isFromMe = message.is_from_me;
  const time = format(new Date(message.timestamp), 'HH:mm');
  const { sendReaction } = useMessageReaction();
  const editMessage = useEditMessage();

  // Check if message can be edited (within 15 minutes and text only)
  const canEdit = isFromMe && 
    message.message_type === 'text' && 
    (Date.now() - new Date(message.timestamp).getTime()) < 15 * 60 * 1000;

  const handleReact = (emoji: string) => {
    sendReaction.mutate({
      messageId: message.message_id,
      conversationId: message.conversation_id,
      emoji,
      reactorJid: message.remote_jid,
      isFromMe: true,
    });
  };

  const handleEditSave = (newContent: string) => {
    editMessage.mutate({
      messageId: message.message_id,
      conversationId: message.conversation_id,
      newContent,
    }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
      },
    });
  };

  const getStatusIcon = () => {
    if (!isFromMe) return null;
    
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3" />;
      case 'sent':
        return <Check className="w-3 h-3" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return <Check className="w-3 h-3" />;
    }
  };

  const renderReactions = () => {
    if (!reactions || reactions.length === 0) return null;
    
    // Group reactions by emoji and count
    const grouped = reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return (
      <div className="flex gap-1 flex-wrap mt-1">
        {Object.entries(grouped).map(([emoji, count]) => (
          <span 
            key={emoji}
            className="px-1.5 py-0.5 bg-muted rounded-full text-xs flex items-center gap-1 border border-border"
          >
            <span className="text-sm">{emoji}</span>
            {count > 1 && <span className="text-muted-foreground font-medium">{count}</span>}
          </span>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <img
                src={message.media_url}
                alt="Imagem"
                className="max-w-xs rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setViewerImage(message.media_url)}
              />
            )}
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );
      
      case 'sticker':
        return (
          <div>
            {message.media_url && (
              <img
                src={message.media_url}
                alt="Sticker"
                className="max-w-[150px] cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setViewerImage(message.media_url)}
              />
            )}
          </div>
        );
      
      case 'audio':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <audio controls className="max-w-xs">
                <source src={message.media_url} type={message.media_mimetype || 'audio/ogg'} />
              </audio>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <video controls className="max-w-xs rounded-md">
                <source src={message.media_url} type={message.media_mimetype || 'video/mp4'} />
              </video>
            )}
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );
      
      case 'document':
        return (
          <div className="space-y-2">
            {message.media_url && (
              <a
                href={message.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm underline"
              >
                📄 {message.content || 'Documento'}
              </a>
            )}
          </div>
        );
      
      case 'contact':
      case 'contacts':
        return (
          <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-md min-w-[200px]">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{message.content}</p>
              <p className="text-xs text-muted-foreground">Contato compartilhado</p>
            </div>
          </div>
        );
      
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );
    }
  };

  return (
    <div
      className={cn(
        'flex group relative',
        isFromMe ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-[70%] relative">
        {isHovered && (
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-10",
            isFromMe ? "left-0 -translate-x-full -ml-1" : "right-0 translate-x-full ml-1"
          )}>
            <MessageReactionButton
              messageId={message.message_id}
              conversationId={message.conversation_id}
              onReact={handleReact}
              isFromMe={isFromMe}
            />
            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditModalOpen(true)}
                className="h-8 w-8 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-sm hover:bg-accent"
                title="Editar mensagem"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onReply && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onReply(message)}
                className="h-8 w-8 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-sm hover:bg-accent"
              >
                <Reply className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <Card
          className={cn(
            'p-3 space-y-1',
            message.message_type === 'sticker' && 'bg-transparent border-none shadow-none p-0',
            isFromMe
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground'
          )}
        >
          {message.quoted_message_id && (
            <QuotedMessagePreview messageId={message.quoted_message_id} />
          )}
          
          {renderContent()}
          
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <span
              className={cn(
                'text-xs',
                isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {time}
            </span>
            {message.edited_at && (
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    className={cn(
                      "text-xs italic hover:underline cursor-pointer",
                      isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    Editado
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="p-0 w-auto">
                  <EditHistoryPopover 
                    messageId={message.message_id}
                    currentContent={message.content}
                    originalContent={message.original_content}
                  />
                </PopoverContent>
              </Popover>
            )}
            {getStatusIcon()}
          </div>
        </Card>
        
        {renderReactions()}
      </div>

      <ImageViewerModal
        imageUrl={viewerImage}
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
      />

      <EditMessageModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentContent={message.content}
        onSave={handleEditSave}
        isLoading={editMessage.isPending}
      />
    </div>
  );
};
