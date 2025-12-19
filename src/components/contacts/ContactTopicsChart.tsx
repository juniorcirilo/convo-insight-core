import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CONVERSATION_TOPICS, TOPIC_CHART_COLORS } from '@/constants/conversationTopics';
import { Tag } from 'lucide-react';

interface TopicDistribution {
  topic: string;
  count: number;
}

interface ContactTopicsChartProps {
  topicsDistribution: TopicDistribution[];
}

const getTopicLabel = (topic: string): string => {
  return CONVERSATION_TOPICS[topic as keyof typeof CONVERSATION_TOPICS] 
    || topic.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getTopicColor = (topic: string): string => {
  return TOPIC_CHART_COLORS[topic] || 'hsl(var(--primary))';
};

export function ContactTopicsChart({ topicsDistribution }: ContactTopicsChartProps) {
  const chartData = topicsDistribution
    .map(item => ({
      ...item,
      name: getTopicLabel(item.topic)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tópicos Frequentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum tópico categorizado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tópicos Frequentes</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={120} 
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
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
