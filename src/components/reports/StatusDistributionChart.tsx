import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatusDistributionChartProps {
  data: Array<{ status: string; count: number; percentage: number }>;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Abertos',
  closed: 'Concluídos',
  archived: 'Arquivados'
};

const COLORS: Record<string, string> = {
  active: 'hsl(var(--chart-1))',
  closed: 'hsl(var(--chart-2))',
  archived: 'hsl(var(--chart-3))',
};

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const chartData = data.map(item => ({
    ...item,
    name: STATUS_LABELS[item.status] || item.status
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.percentage.toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
