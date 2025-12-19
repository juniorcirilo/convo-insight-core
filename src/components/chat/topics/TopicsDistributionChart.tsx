import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CONVERSATION_TOPICS, TOPIC_CHART_COLORS } from '@/constants/conversationTopics';

interface TopicsDistributionChartProps {
  data: Array<{ topic: string; count: number }>;
}

const getTopicLabel = (topic: string): string => {
  return CONVERSATION_TOPICS[topic as keyof typeof CONVERSATION_TOPICS] 
    || topic.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getTopicColor = (topic: string): string => {
  return TOPIC_CHART_COLORS[topic] || 'hsl(var(--primary))';
};

export function TopicsDistributionChart({ data }: TopicsDistributionChartProps) {
  const chartData = data
    .map(item => ({
      ...item,
      name: getTopicLabel(item.topic)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 tópicos

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tópicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground">Nenhum tópico categorizado ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Tópicos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="count" name="Conversas">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getTopicColor(entry.topic)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
