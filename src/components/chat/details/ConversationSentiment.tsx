import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Info, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWhatsAppSentiment } from '@/hooks/whatsapp';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface ConversationSentimentProps {
  conversationId: string | null;
}

export function ConversationSentiment({ conversationId }: ConversationSentimentProps) {
  const { sentiment, isLoading, refetch } = useWhatsAppSentiment(conversationId);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!conversationId) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'analyze-whatsapp-sentiment',
        { body: { conversationId } }
      );

      if (error) throw error;

      if (data.message) {
        toast.info(data.message);
        return;
      }

      toast.success('Sentimento analisado!');
      refetch();
    } catch (error) {
      console.error('Erro ao analisar sentimento:', error);
      toast.error('Erro ao analisar. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentConfig = (type: string) => {
    switch (type) {
      case 'positive':
        return {
          emoji: '😊',
          label: 'Positivo',
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
        };
      case 'negative':
        return {
          emoji: '😟',
          label: 'Negativo',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
        };
      default:
        return {
          emoji: '😐',
          label: 'Neutro',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Sentimento
        </h3>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!sentiment) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Sentimento
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-3 w-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[220px]">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Análise Automática</p>
                  <p>A análise de sentimento é disparada automaticamente a cada 5 mensagens recebidas do cliente.</p>
                  <p className="pt-1">Você também pode clicar em "Analisar" para executar manualmente.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Card className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            Aguardando análise...
          </p>
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            className="w-full"
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analisar Sentimento
              </>
            )}
          </Button>
        </Card>
      </div>
    );
  }

  const config = getSentimentConfig(sentiment.sentiment);
  const timeAgo = formatDistanceToNow(new Date(sentiment.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Sentimento
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Info className="h-3 w-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px]">
              <div className="space-y-1 text-xs">
                <p className="font-medium">Análise Automática</p>
                <p>Atualizada automaticamente a cada 5 mensagens do cliente.</p>
                <p className="pt-1 border-t border-border/50 mt-1.5">
                  Baseado em {sentiment.messages_analyzed} mensagens
                </p>
                <p>Última análise: {timeAgo}</p>
                <p>Confiança: {Math.round(sentiment.confidence_score * 100)}%</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card className={cn('p-4 space-y-3', config.bgColor)}>
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl">{config.emoji}</span>
          <Badge variant="secondary" className={config.color}>
            {config.label}
          </Badge>
        </div>

        {sentiment.summary && (
          <p className="text-sm text-center text-muted-foreground">
            {sentiment.summary}
          </p>
        )}

        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          variant="outline"
          className="w-full"
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-3 w-3" />
              Reanalisar
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}