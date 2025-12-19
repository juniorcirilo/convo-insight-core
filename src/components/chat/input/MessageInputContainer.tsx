import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mic } from "lucide-react";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { MediaUploadButton } from "./MediaUploadButton";
import { AIComposerButton } from "./AIComposerButton";
import { AudioRecorder } from "./AudioRecorder";
import { MacroSuggestions } from "./MacroSuggestions";
import { SmartReplySuggestions } from "./SmartReplySuggestions";
import { ReplyPreview } from "./ReplyPreview";
import { useWhatsAppMacros } from "@/hooks/whatsapp/useWhatsAppMacros";
import { useSmartReply } from "@/hooks/whatsapp/useSmartReply";
import { Tables } from "@/integrations/supabase/types";

type Message = Tables<'whatsapp_messages'>;

export interface MediaSendParams {
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
  content?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  mediaMimetype?: string;
  fileName?: string;
}

interface MessageInputContainerProps {
  conversationId: string;
  disabled?: boolean;
  replyingTo?: Message | null;
  onSendText: (content: string, quotedMessageId?: string) => void;
  onSendMedia: (params: MediaSendParams) => void;
  onCancelReply?: () => void;
}

export const MessageInputContainer = ({ 
  conversationId, 
  disabled,
  replyingTo,
  onSendText, 
  onSendMedia,
  onCancelReply
}: MessageInputContainerProps) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showMacroSuggestions, setShowMacroSuggestions] = useState(false);
  const [filteredMacros, setFilteredMacros] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { macros, incrementUsage } = useWhatsAppMacros();
  const { suggestions, isLoading: isLoadingSmartReplies, isRefreshing, refresh } = useSmartReply(conversationId);

  // Detect /macro: command and filter macros
  useEffect(() => {
    const match = message.match(/\/macro:\s*(\S*)$/i);
    if (match) {
      const searchTerm = match[1].toLowerCase();
      const filtered = macros.filter(m => 
        m.shortcut.toLowerCase().includes(searchTerm) ||
        m.name.toLowerCase().includes(searchTerm)
      );
      setFilteredMacros(filtered);
      setShowMacroSuggestions(filtered.length > 0);
    } else {
      setShowMacroSuggestions(false);
      setFilteredMacros([]);
    }
  }, [message, macros]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendText(message.trim(), replyingTo?.message_id);
      setMessage("");
      onCancelReply?.();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = message;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    setMessage(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + emoji.length;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleMacroSelect = (macro: any) => {
    setMessage(macro.content);
    incrementUsage(macro.id);
    setShowMacroSuggestions(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSmartReplySelect = (text: string) => {
    setMessage(text);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  if (isRecording) {
    return (
      <div className="p-4 border-t border-border bg-card">
        <AudioRecorder
          onSend={(params) => {
            onSendMedia(params);
            setIsRecording(false);
          }}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card">
      {replyingTo && onCancelReply && (
        <ReplyPreview message={replyingTo} onCancel={onCancelReply} />
      )}
      
      <SmartReplySuggestions
        suggestions={suggestions}
        isLoading={isLoadingSmartReplies}
        isRefreshing={isRefreshing}
        onSelectSuggestion={handleSmartReplySelect}
        onRefresh={refresh}
      />
      
      <div className="p-4">
        <div className="relative flex gap-2 items-end">
          {showMacroSuggestions && (
            <MacroSuggestions
              macros={filteredMacros}
              onSelect={handleMacroSelect}
            />
          )}
        
        <EmojiPickerButton onEmojiSelect={handleEmojiSelect} disabled={disabled} />
        
        <MediaUploadButton 
          conversationId={conversationId}
          onSendMedia={onSendMedia}
          disabled={disabled}
        />
        
        <AIComposerButton
          message={message}
          onComposed={(newMessage) => setMessage(newMessage)}
          disabled={disabled}
        />
        
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          className="min-h-[44px] max-h-32 resize-none"
          disabled={disabled}
        />
        
        {message.trim() ? (
          <Button
            onClick={handleSend}
            size="icon"
            disabled={disabled}
          >
            <Send className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setIsRecording(true)}
            size="icon"
            variant="outline"
            disabled={disabled}
          >
            <Mic className="w-4 h-4" />
          </Button>
        )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};
