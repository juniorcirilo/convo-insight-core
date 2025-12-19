import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { Tables } from "@/integrations/supabase/types";
import { format, isToday, isYesterday, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useMessageReactions } from "@/hooks/whatsapp";

type Message = Tables<'whatsapp_messages'>;

interface MessagesContainerProps {
  messages: Message[];
  isLoading: boolean;
  conversationId: string | null;
  onReplyMessage?: (message: Message) => void;
}

export const MessagesContainer = ({ messages, isLoading, conversationId, onReplyMessage }: MessagesContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const prevMessagesLengthRef = useRef(messages.length);
  const { reactionsByMessage } = useMessageReactions(conversationId);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const threshold = 100;
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setIsAtBottom(atBottom);
    
    if (atBottom) setNewMessagesCount(0);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setNewMessagesCount(0);
    }
  };

  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else if (messages.length > prevMessagesLengthRef.current) {
      setNewMessagesCount(prev => prev + (messages.length - prevMessagesLengthRef.current));
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isAtBottom]);

  const getDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    if (isSameWeek(date, new Date())) {
      return format(date, 'EEEE', { locale: ptBR });
    }
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return Object.entries(groups).map(([dateKey, msgs]) => ({
      date: new Date(dateKey),
      messages: msgs,
    }));
  };

  const messageGroups = groupMessagesByDate();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0">
      <ScrollArea className="h-full p-4" viewportRef={scrollRef} onScroll={handleScroll}>
        <div className="space-y-4">
          {messageGroups.map((group, idx) => (
            <div key={idx}>
              <div className="flex justify-center my-4">
                <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                  {getDateSeparator(group.date)}
                </span>
              </div>
              
              <div className="space-y-2">
                {group.messages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message}
                    reactions={reactionsByMessage[message.message_id]}
                    onReply={onReplyMessage}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="absolute bottom-6 right-6 rounded-full shadow-lg bg-background hover:bg-accent border border-border z-10"
        >
          <ChevronDown className="h-5 w-5 text-foreground" />
          {newMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 font-semibold">
              {newMessagesCount > 99 ? '99+' : newMessagesCount}
            </span>
          )}
        </Button>
      )}
    </div>
  );
};
