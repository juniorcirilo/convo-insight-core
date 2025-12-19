import { useState, useMemo } from 'react';
import { MessageSquare, Clock, CheckCircle2, Archive, Timer, ArrowLeft, Zap, TrendingUp, Send, MessageCircle, Users, MessagesSquare, Inbox, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstanceStatusMonitor } from '@/hooks/useInstanceStatusMonitor';
import { DisconnectedInstancesBanner } from '@/components/notifications/DisconnectedInstancesBanner';
import { 
  MetricCard, 
  DateRangeFilter, 
  StatusDistributionChart, 
  SentimentDistributionChart,
  LongestConversationsTable, 
  ReportToolbar,
  MetricsGridSkeleton,
  ChartsGridSkeleton,
  AgentFilter,
  AgentPerformanceChart,
  MessageTypeChart,
  HourlyActivityChart,
  WeekdayActivityChart,
  TopContactsChart,
  InstanceComparisonChart,
  MessageFlowChart
} from '@/components/reports';
import { TopicsDistributionChart } from '@/components/chat/topics/TopicsDistributionChart';
import { InstanceFilter } from '@/components/conversations/InstanceFilter';
import { useWhatsAppMetrics } from '@/hooks/whatsapp/useWhatsAppMetrics';
import { formatDuration } from '@/utils/timeFormatters';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

type FilterPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';

export default function WhatsAppRelatorio() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('last30days');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const { disconnectedInstances } = useInstanceStatusMonitor();

  const dateRange = useMemo(() => {
    const now = new Date();

    switch (selectedPeriod) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case 'last7days':
        return { from: subDays(now, 7), to: now };
      case 'last30days':
        return { from: subDays(now, 30), to: now };
      case 'custom':
        return customRange || { from: subDays(now, 30), to: now };
      default:
        return { from: subDays(now, 30), to: now };
    }
  }, [selectedPeriod, customRange]);

  const periodLabel = useMemo(() => {
    switch (selectedPeriod) {
      case 'today': return 'Hoje';
      case 'yesterday': return 'Ontem';
      case 'last7days': return 'Últimos 7 dias';
      case 'last30days': return 'Últimos 30 dias';
      case 'custom':
        if (customRange) {
          return `${format(customRange.from, 'dd/MM')} - ${format(customRange.to, 'dd/MM')}`;
        }
        return 'Período personalizado';
      default:
        return 'Últimos 30 dias';
    }
  }, [selectedPeriod, customRange]);

  const { data: metrics, isLoading } = useWhatsAppMetrics({ 
    dateRange,
    instanceId: selectedInstance,
    agentId: selectedAgent
  });

  // Prepare data for export
  const exportRows = useMemo(() => {
    if (!metrics) return [];
    return [
      { metrica: 'Total de Conversas', valor: metrics.total },
      { metrica: 'Conversas Abertas', valor: metrics.active },
      { metrica: 'Conversas Fechadas', valor: metrics.closed },
      { metrica: 'Conversas Arquivadas', valor: metrics.archived },
      { metrica: 'Tempo Médio de Resposta (min)', valor: metrics.avgResponseTimeMinutes.toFixed(2) },
      ...metrics.dailyTrend.map(d => ({ metrica: `Volume ${d.date}`, valor: d.count })),
    ];
  }, [metrics]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Disconnected Instances Banner */}
      <DisconnectedInstancesBanner instances={disconnectedInstances} />
      
      <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/whatsapp')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Relatório WhatsApp</h1>
      </div>

      {/* Filters Bar */}
      <ReportToolbar
        filename={`relatorio-whatsapp-${periodLabel.replace(/\s+/g, '-')}`}
        rowsForExport={exportRows}
        extra={
          <div className="flex gap-4 flex-wrap">
            <DateRangeFilter
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              periodLabel={periodLabel}
              customRange={customRange}
              setCustomRange={setCustomRange}
            />
            <InstanceFilter
              selectedInstance={selectedInstance}
              onInstanceChange={setSelectedInstance}
            />
            <AgentFilter
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
            />
          </div>
        }
      />

      {/* Content */}
      <div className="space-y-6">
        {isLoading ? (
          <>
            <MetricsGridSkeleton />
            <ChartsGridSkeleton />
          </>
        ) : (
          <>
            {/* Métricas Principais - Conversas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                title="Total de Conversas"
                value={metrics?.total || 0}
                icon={MessageSquare}
                info="Número total de conversas no período selecionado"
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.total - metrics.previousPeriod.total) / (metrics.previousPeriod.total || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Conversas Abertas"
                value={metrics?.active || 0}
                icon={Clock}
                info="Conversas com status 'open' que ainda estão em atendimento"
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.active - metrics.previousPeriod.active) / (metrics.previousPeriod.active || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Conversas Fechadas"
                value={metrics?.closed || 0}
                icon={CheckCircle2}
                info="Conversas com status 'closed' que foram finalizadas"
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.closed - metrics.previousPeriod.closed) / (metrics.previousPeriod.closed || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Conversas Arquivadas"
                value={metrics?.archived || 0}
                icon={Archive}
                info="Conversas com status 'archived'"
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.archived - metrics.previousPeriod.archived) / (metrics.previousPeriod.archived || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Tempo Médio de Resposta"
                value={formatDuration(metrics?.avgResponseTimeMinutes || 0)}
                icon={Timer}
                info="Tempo médio entre mensagem do cliente e resposta do agente"
                trend={{
                  value: metrics?.previousPeriod 
                    ? ((metrics.avgResponseTimeMinutes - metrics.previousPeriod.avgResponseTimeMinutes) / (metrics.previousPeriod.avgResponseTimeMinutes || 1)) * 100
                    : 0,
                  isPercentage: true
                }}
              />
            </div>

            {/* Métricas de Mensagens */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total de Mensagens"
                value={metrics?.totalMessages || 0}
                icon={MessagesSquare}
                info="Soma de todas as mensagens enviadas e recebidas no período"
              />
              <MetricCard
                title="Mensagens Enviadas"
                value={metrics?.sentMessages || 0}
                icon={Send}
                info="Mensagens enviadas pelos agentes (is_from_me = true)"
              />
              <MetricCard
                title="Mensagens Recebidas"
                value={metrics?.receivedMessages || 0}
                icon={MessageCircle}
                info="Mensagens recebidas dos clientes (is_from_me = false)"
              />
              <MetricCard
                title="Média Msgs/Conversa"
                value={(metrics?.avgMessagesPerConversation || 0).toFixed(1)}
                icon={TrendingUp}
                info="Total de mensagens dividido pelo número de conversas"
              />
            </div>

            {/* Métricas Operacionais */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Taxa de Resolução"
                value={`${(metrics?.resolutionRate || 0).toFixed(1)}%`}
                icon={CheckCircle2}
                info="Percentual de conversas fechadas em relação ao total de conversas"
                trend={{
                  value: metrics?.previousPeriod 
                    ? (metrics.resolutionRate - metrics.previousPeriod.resolutionRate)
                    : 0,
                  isPercentage: false
                }}
              />
              <MetricCard
                title="Tempo de 1ª Resposta"
                value={formatDuration(metrics?.avgFirstResponseTimeMinutes || 0)}
                icon={Zap}
                info="Tempo médio entre primeira mensagem do cliente e primeira resposta do agente"
                trend={{
                  value: metrics?.previousPeriod && metrics.previousPeriod.avgFirstResponseTimeMinutes > 0
                    ? ((metrics.avgFirstResponseTimeMinutes - metrics.previousPeriod.avgFirstResponseTimeMinutes) / metrics.previousPeriod.avgFirstResponseTimeMinutes) * 100
                    : 0,
                  isPercentage: true
                }}
              />
              <MetricCard
                title="Conversas na Fila"
                value={metrics?.queuedConversations || 0}
                icon={Inbox}
                info="Conversas sem agente atribuído aguardando atendimento"
              />
              <MetricCard
                title="Tempo Médio Atendimento"
                value={formatDuration(metrics?.avgResolutionTimeMinutes || 0)}
                icon={Hourglass}
                info="Duração média das conversas desde abertura até fechamento"
              />
            </div>

            {/* Contatos e Engajamento */}
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                title="Contatos Únicos"
                value={metrics?.uniqueContacts || 0}
                icon={Users}
                info="Número de contatos distintos que interagiram no período"
              />
              <MetricCard
                title="Taxa de Engajamento"
                value={`${(metrics?.engagementRate || 0).toFixed(1)}%`}
                icon={TrendingUp}
                info="Proporção entre mensagens recebidas e enviadas (recebidas ÷ enviadas × 100)"
              />
            </div>

            {/* Charts Grid - 2 colunas */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Evolution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolução no Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics?.dailyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Conversas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Message Flow Chart */}
              <MessageFlowChart data={metrics?.dailyMessageTrend || []} />

              {/* Status Distribution Chart */}
              <StatusDistributionChart data={metrics?.statusDistribution || []} />

              {/* Sentiment Distribution Chart */}
              <SentimentDistributionChart data={metrics?.sentimentDistribution || []} />

              {/* Topics Distribution Chart */}
              <TopicsDistributionChart data={metrics?.topicsDistribution || []} />

              {/* Message Type Chart */}
              <MessageTypeChart data={metrics?.messageTypeDistribution || []} />

              {/* Hourly Activity Chart */}
              <HourlyActivityChart data={metrics?.hourlyActivity || []} />

              {/* Weekday Activity Chart */}
              <WeekdayActivityChart data={metrics?.weekdayActivity || []} />
            </div>

            {/* Instance Comparison Chart - Full Width */}
            {!selectedInstance && (
              <InstanceComparisonChart data={metrics?.instanceComparison || []} />
            )}

            {/* Agent Performance Chart */}
            <AgentPerformanceChart data={metrics?.agentPerformance || []} />

            {/* Top Contacts Chart */}
            <TopContactsChart data={metrics?.topContacts || []} />

            {/* Longest Conversations Table */}
            <LongestConversationsTable conversations={metrics?.longestConversations || []} />
          </>
        )}
      </div>
      </div>
    </div>
  );
}
