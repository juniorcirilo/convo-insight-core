import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { ConversationSentiment } from './ConversationSentiment';
import { ConversationSummaries } from './ConversationSummaries';
import { ConversationNotes } from './ConversationNotes';
import { ConversationTopics } from '../topics/ConversationTopics';

interface ConversationDetailsSidebarProps {
  conversationId: string | null;
  contactName?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ConversationDetailsSidebar({
  conversationId,
  contactName,
  isCollapsed,
  onToggleCollapse
}: ConversationDetailsSidebarProps) {

  if (isCollapsed) {
    return (
      <div className="w-14 border-l bg-background flex flex-col items-center p-2 gap-2">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <MessageSquare className="h-5 w-5 text-muted-foreground mt-2" />
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="w-[350px] border-l bg-background flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Detalhes da Conversa</h3>
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Selecione uma conversa para ver os detalhes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[350px] border-l bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Detalhes da Conversa</h3>
          {contactName && (
            <p className="text-xs text-muted-foreground">{contactName}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Conteúdo */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Sentimento */}
          <ConversationSentiment conversationId={conversationId} />

          <Separator />

          {/* Tópicos */}
          <ConversationTopics conversationId={conversationId} />

          <Separator />

          {/* Resumos AI */}
          <ConversationSummaries conversationId={conversationId} />

          <Separator />

          {/* Observações */}
          <ConversationNotes conversationId={conversationId} />
        </div>
      </ScrollArea>
    </div>
  );
}