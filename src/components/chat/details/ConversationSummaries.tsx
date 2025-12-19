import { useState } from 'react';
import { useConversationSummaries } from '@/hooks/whatsapp/useConversationSummaries';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, ChevronDown, ChevronUp, Sparkles, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConversationSummariesProps {
  conversationId: string | null;
}

export function ConversationSummaries({ conversationId }: ConversationSummariesProps) {
  const { summaries, isLoading, isGenerating, generateSummary, deleteSummary } = useConversationSummaries(conversationId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getSentimentBadge = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return { emoji: '😊', text: 'Positivo', className: 'bg-green-100 text-green-700' };
      case 'negative':
        return { emoji: '😟', text: 'Negativo', className: 'bg-red-100 text-red-700' };
      default:
        return { emoji: '😐', text: 'Neutro', className: 'bg-blue-100 text-blue-700' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Resumos AI
          </h3>
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Resumos AI ({summaries.length})
        </h3>
        <Button 
          onClick={generateSummary} 
          disabled={isGenerating}
          size="sm"
          variant="outline"
          className="h-7 text-xs"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="mr-1 h-3 w-3" />
              Gerar Resumo
            </>
          )}
        </Button>
      </div>

      {summaries.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum resumo gerado ainda
          </p>
        </Card>
      ) : (
        <ScrollArea className="max-h-[400px] pr-2">
          <div className="space-y-2">
            {summaries.map((summary) => {
              const isExpanded = expandedId === summary.id;
              const sentimentBadge = getSentimentBadge(summary.sentiment_at_time);

              return (
                <Card key={summary.id} className="p-3 space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {format(new Date(summary.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={cn('text-xs px-2 py-0', sentimentBadge.className)}>
                        {sentimentBadge.emoji} {sentimentBadge.text}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir resumo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSummary(summary.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  {isExpanded ? (
                    <div className="space-y-3">
                      <p className="text-sm">{summary.summary}</p>

                      {summary.key_points.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Pontos-chave:</p>
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {summary.key_points.map((point, i) => (
                              <li key={i} className="flex gap-2">
                                <span>•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {summary.action_items.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Próximos passos:</p>
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {summary.action_items.map((item, i) => (
                              <li key={i} className="flex gap-2">
                                <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm line-clamp-2">{summary.summary}</p>
                  )}

                  {/* Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => setExpandedId(isExpanded ? null : summary.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="mr-1 h-3 w-3" />
                        Recolher
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-3 w-3" />
                        Ver completo
                      </>
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}