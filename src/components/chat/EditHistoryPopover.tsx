import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMessageEditHistory } from "@/hooks/whatsapp/useMessageEditHistory";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface EditHistoryPopoverProps {
  messageId: string;
  currentContent: string;
  originalContent?: string | null;
}

export const EditHistoryPopover = ({ 
  messageId, 
  currentContent,
  originalContent 
}: EditHistoryPopoverProps) => {
  const { data: history = [], isLoading } = useMessageEditHistory(messageId);

  if (isLoading) {
    return (
      <div className="w-80 p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const allVersions = [
    ...(originalContent && originalContent !== currentContent 
      ? [{ content: originalContent, timestamp: history[0]?.edited_at, isOriginal: true }]
      : []
    ),
    ...history.map(h => ({ 
      content: h.previous_content, 
      timestamp: h.edited_at,
      isOriginal: false 
    })),
    { content: currentContent, timestamp: new Date().toISOString(), isCurrent: true }
  ];

  return (
    <div className="w-80">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Histórico de Edições</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {history.length + 1} {history.length === 0 ? 'versão' : 'versões'}
        </p>
      </div>
      
      <ScrollArea className="max-h-80">
        <div className="p-4 space-y-3">
          {allVersions.map((version, index) => (
            <div 
              key={index}
              className="space-y-1 pb-3 border-b border-border last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {version.timestamp 
                    ? format(new Date(version.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : 'Agora'
                  }
                </span>
                {version.isOriginal && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    Original
                  </span>
                )}
                {version.isCurrent && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Atual
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap break-words bg-muted/30 p-2 rounded">
                {version.content}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
