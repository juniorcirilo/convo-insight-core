import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HourlyActivityChartProps {
  data: Array<{ hour: number; count: number }>;
}

export function HourlyActivityChart({ data }: HourlyActivityChartProps) {
  const chartData = data.map(item => ({
    ...item,
    hourLabel: `${item.hour}h`
  }));

  if (data.every(d => d.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade por Hora do Dia</CardTitle>
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
        <CardTitle>Atividade por Hora do Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hourLabel" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [`${value} mensagens`, 'Total']}
              labelFormatter={(label) => `Hora: ${label}`}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" name="Mensagens" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
