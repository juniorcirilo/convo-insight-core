import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Sentiment = Tables<'whatsapp_sentiment_analysis'>;

interface SentimentCardProps {
  sentiment?: Sentiment | null;
}

export const SentimentCard = ({ sentiment }: SentimentCardProps) => {
  if (!sentiment) {
    return (
      <Badge variant="outline" className="text-xs">
        Sem análise
      </Badge>
    );
  }

  const getEmoji = () => {
    switch (sentiment.sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      default:
        return '😐';
    }
  };

  const getLabel = () => {
    switch (sentiment.sentiment) {
      case 'positive':
        return 'Positivo';
      case 'negative':
        return 'Negativo';
      default:
        return 'Neutro';
    }
  };

  const getColorClasses = () => {
    switch (sentiment.sentiment) {
      case 'positive':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'negative':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    }
  };

  const lastAnalysis = formatDistanceToNow(new Date(sentiment.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-medium',
              getColorClasses()
            )}
          >
            <span className="text-base">{getEmoji()}</span>
            <span>{getLabel()}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p>
              <strong>Confiança:</strong>{' '}
              {sentiment.confidence_score
                ? `${Math.round(sentiment.confidence_score * 100)}%`
                : 'N/A'}
            </p>
            <p>
              <strong>Mensagens analisadas:</strong>{' '}
              {sentiment.messages_analyzed || 0}
            </p>
            <p>
              <strong>Última análise:</strong> {lastAnalysis}
            </p>
            {sentiment.summary && (
              <p className="max-w-xs pt-1 border-t">
                {sentiment.summary}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
