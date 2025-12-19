import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopicBadges } from '@/components/chat/topics/TopicBadges';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationWithSentiment extends Tables<'whatsapp_conversations'> {
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface ContactConversationHistoryProps {
  conversations: ConversationWithSentiment[];
}

const sentimentColors = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const sentimentLabels = {
  positive: '😊 Positivo',
  neutral: '😐 Neutro',
  negative: '😟 Negativo',
};

export function ContactConversationHistory({ conversations }: ContactConversationHistoryProps) {
  const navigate = useNavigate();

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/whatsapp?conversation=${conversationId}`);
  };

  if (conversations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conversa registrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Atendimentos</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const metadata = conversation.metadata as { topics?: string[]; primary_topic?: string } | null;
              const topics = metadata?.topics || [];
              const sentiment = conversation.sentiment;

              return (
                <div
                  key={conversation.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">
                          {format(new Date(conversation.created_at), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                        {sentiment && (
                          <Badge variant="secondary" className={sentimentColors[sentiment]}>
                            {sentimentLabels[sentiment]}
                          </Badge>
                        )}
                      </div>
                      <TopicBadges topics={topics} size="sm" maxTopics={2} />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenConversation(conversation.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  {conversation.last_message_preview && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {conversation.last_message_preview}
                    </p>
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
