import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

interface SentimentHistoryItem {
  id: string;
  created_at: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence_score: number | null;
  summary: string | null;
}

interface ContactSentimentEvolutionProps {
  sentimentHistory: SentimentHistoryItem[];
}

const sentimentToNumber = {
  positive: 1,
  neutral: 0,
  negative: -1,
};

const sentimentColors = {
  positive: 'hsl(142, 76%, 36%)',
  neutral: 'hsl(215, 20%, 65%)',
  negative: 'hsl(0, 84%, 60%)',
};

export function ContactSentimentEvolution({ sentimentHistory }: ContactSentimentEvolutionProps) {
  // Group by unique date to avoid overlapping points
  const uniqueDatesMap = new Map<string, SentimentHistoryItem>();
  sentimentHistory.forEach(item => {
    const dateKey = format(new Date(item.created_at), 'yyyy-MM-dd');
    // Keep last sentiment of the day
    uniqueDatesMap.set(dateKey, item);
  });

  const chartData = Array.from(uniqueDatesMap.values()).map((item) => ({
    date: format(new Date(item.created_at), 'dd/MM', { locale: ptBR }),
    fullDate: format(new Date(item.created_at), "dd 'de' MMM", { locale: ptBR }),
    sentiment: sentimentToNumber[item.sentiment],
    sentimentLabel: item.sentiment === 'positive' ? '😊 Positivo' : item.sentiment === 'neutral' ? '😐 Neutro' : '😟 Negativo',
    confidence: item.confidence_score ? Math.round(item.confidence_score * 100) : 0,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Sentimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma análise de sentimento registrada</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStrokeColor = () => {
    const lastSentiment = sentimentHistory[sentimentHistory.length - 1]?.sentiment;
    return sentimentColors[lastSentiment] || 'hsl(var(--primary))';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de Sentimento</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              domain={[-1, 1]}
              ticks={[-1, 0, 1]}
              tickFormatter={(value) => {
                if (value === 1) return '😊';
                if (value === 0) return '😐';
                if (value === -1) return '😟';
                return '';
              }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">{data.fullDate}</p>
                      <p className="text-sm text-muted-foreground">{data.sentimentLabel}</p>
                      <p className="text-xs text-muted-foreground">Confiança: {data.confidence}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="sentiment" 
              stroke={getStrokeColor()}
              strokeWidth={3}
              dot={{ fill: getStrokeColor(), r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
