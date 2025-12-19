import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContactSummariesProps {
  summaries: Tables<'whatsapp_conversation_summaries'>[];
}

export function ContactSummaries({ summaries }: ContactSummariesProps) {
  if (summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumos de IA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum resumo gerado ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumos de IA ({summaries.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {summaries.map((summary) => {
              const keyPoints = summary.key_points as string[] | null;
              const actionItems = summary.action_items as string[] | null;

              return (
                <div
                  key={summary.id}
                  className="p-4 border rounded-lg space-y-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(summary.created_at || ''), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </div>
                    <Badge variant="secondary">
                      {summary.messages_count || 0} mensagens
                    </Badge>
                  </div>

                  <p className="text-sm leading-relaxed">{summary.summary}</p>

                  {keyPoints && keyPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Pontos-chave:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {keyPoints.map((point, index) => (
                          <li key={index} className="text-xs text-muted-foreground">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {actionItems && actionItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Ações:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {actionItems.map((action, index) => (
                          <li key={index} className="text-xs text-muted-foreground">
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.sentiment_at_time && (
                    <Badge variant="outline" className="text-xs">
                      Sentimento: {summary.sentiment_at_time}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
