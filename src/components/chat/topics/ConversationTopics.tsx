import { Button } from '@/components/ui/button';
import { RefreshCw, Tag, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConversationTopics } from '@/hooks/whatsapp/useConversationTopics';
import { useCategorizeConversation } from '@/hooks/whatsapp/useCategorizeConversation';
import { TopicBadges } from './TopicBadges';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationTopicsProps {
  conversationId: string;
}

export function ConversationTopics({ conversationId }: ConversationTopicsProps) {
  const { data: topicsData, isLoading } = useConversationTopics(conversationId);
  const { mutate: categorize, isPending } = useCategorizeConversation();

  const handleRecategorize = () => {
    categorize(conversationId);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm">Tópicos</h4>
        </div>
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const hasTopic = topicsData?.topics && topicsData.topics.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm">Tópicos</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[220px]">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Categorização Automática</p>
                  <p>Os tópicos são atualizados automaticamente a cada 5 mensagens recebidas do cliente.</p>
                  {topicsData?.categorized_at && (
                    <p className="pt-1 border-t border-border/50 mt-1.5">
                      Última atualização:{' '}
                      {format(new Date(topicsData.categorized_at), "dd/MM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRecategorize}
          disabled={isPending}
        >
          <RefreshCw className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
          <span className="ml-1.5 text-xs">
            {hasTopic ? 'Recategorizar' : 'Categorizar'}
          </span>
        </Button>
      </div>

      {hasTopic ? (
        <div className="space-y-3">
          <TopicBadges topics={topicsData.topics} showIcon={false} maxTopics={10} />
          
          {topicsData.ai_confidence !== undefined && (
            <div className="text-xs text-muted-foreground">
              Confiança: {(topicsData.ai_confidence * 100).toFixed(0)}%
            </div>
          )}
          
          {topicsData.categorized_at && (
            <div className="text-xs text-muted-foreground">
              Categorizado em{' '}
              {format(new Date(topicsData.categorized_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </div>
          )}

          {topicsData.ai_reasoning && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <span className="font-medium">Análise:</span> {topicsData.ai_reasoning}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum tópico identificado. Clique em "Categorizar" para analisar a conversa.
        </p>
      )}
    </div>
  );
}
