import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MessageTypeChartProps {
  data: Array<{ type: string; count: number; percentage: number }>;
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  audio: 'Áudio',
  image: 'Imagem',
  video: 'Vídeo',
  document: 'Documento',
  sticker: 'Sticker',
  contact: 'Contato'
};

const TYPE_COLORS: Record<string, string> = {
  text: 'hsl(var(--primary))',
  audio: 'hsl(var(--chart-2))',
  image: 'hsl(var(--chart-3))',
  video: 'hsl(var(--chart-4))',
  document: 'hsl(var(--chart-5))',
  sticker: 'hsl(var(--accent))',
  contact: 'hsl(var(--muted-foreground))'
};

export function MessageTypeChart({ data }: MessageTypeChartProps) {
  const chartData = data.map(item => ({
    ...item,
    name: TYPE_LABELS[item.type] || item.type,
    fill: TYPE_COLORS[item.type] || 'hsl(var(--muted))'
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo de Mídia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground">Sem dados para exibir</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Tipo de Mídia</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
              outerRadius={80}
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} mensagens`, 'Total']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
