import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SentimentDistributionChartProps {
  data: Array<{ sentiment: string; count: number; percentage: number }>;
}

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo'
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'hsl(var(--success))',
  neutral: 'hsl(var(--muted-foreground))',
  negative: 'hsl(var(--destructive))',
};

const SENTIMENT_EMOJIS: Record<string, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😔'
};

export function SentimentDistributionChart({ data }: SentimentDistributionChartProps) {
  const chartData = data.map(item => ({
    ...item,
    name: `${SENTIMENT_EMOJIS[item.sentiment]} ${SENTIMENT_LABELS[item.sentiment] || item.sentiment}`
  }));

  const totalAnalyzed = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Sentimentos</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalAnalyzed} conversas analisadas
        </p>
      </CardHeader>
      <CardContent>
        {totalAnalyzed === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma análise de sentimento disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.percentage.toFixed(1)}%`}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.sentiment]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
