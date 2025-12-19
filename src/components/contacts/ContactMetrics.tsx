import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Send, Inbox, Clock, Calendar, ThumbsUp } from 'lucide-react';

interface ContactMetricsProps {
  metrics: {
    totalConversations: number;
    totalMessages: number;
    sentMessages: number;
    receivedMessages: number;
    avgResponseTime: number;
    daysSinceFirstContact: number;
    satisfactionRate: number;
  };
}

export function ContactMetrics({ metrics }: ContactMetricsProps) {
  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const metricCards = [
    {
      label: 'Conversas',
      value: metrics.totalConversations,
      icon: MessageSquare,
      color: 'text-blue-500',
    },
    {
      label: 'Mensagens',
      value: metrics.totalMessages,
      icon: MessageSquare,
      color: 'text-purple-500',
    },
    {
      label: 'Enviadas',
      value: metrics.sentMessages,
      icon: Send,
      color: 'text-green-500',
    },
    {
      label: 'Recebidas',
      value: metrics.receivedMessages,
      icon: Inbox,
      color: 'text-orange-500',
    },
    {
      label: 'TMR',
      value: formatResponseTime(metrics.avgResponseTime),
      icon: Clock,
      color: 'text-cyan-500',
    },
    {
      label: 'Relacionamento',
      value: `${metrics.daysSinceFirstContact} dias`,
      icon: Calendar,
      color: 'text-indigo-500',
    },
    {
      label: 'Satisfação',
      value: `${Math.round(metrics.satisfactionRate)}%`,
      icon: ThumbsUp,
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${metric.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold truncate">{metric.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
