import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import { cn } from "@/lib/utils";

interface MessageReactionButtonProps {
  messageId: string;
  conversationId: string;
  onReact: (emoji: string) => void;
  isFromMe: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageReactionButton = ({ 
  messageId, 
  conversationId, 
  onReact,
  isFromMe 
}: MessageReactionButtonProps) => {
  const [open, setOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);

  const handleQuickReaction = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
    setShowFullPicker(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onReact(emojiData.emoji);
    setOpen(false);
    setShowFullPicker(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          size="icon" 
          variant="ghost"
          className="h-8 w-8 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-sm hover:bg-accent"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="center">
        {!showFullPicker ? (
          <div className="flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-xl hover:bg-accent"
                onClick={() => handleQuickReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-lg hover:bg-accent"
              onClick={() => setShowFullPicker(true)}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme={Theme.AUTO}
            searchPlaceHolder="Buscar emoji..."
            previewConfig={{ showPreview: false }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};
