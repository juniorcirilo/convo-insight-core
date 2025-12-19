import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeekdayActivityChartProps {
  data: Array<{ weekday: string; count: number }>;
}

export function WeekdayActivityChart({ data }: WeekdayActivityChartProps) {
  if (data.every(d => d.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volume por Dia da Semana</CardTitle>
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
        <CardTitle>Volume por Dia da Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekday" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [`${value} mensagens`, 'Total']}
            />
            <Bar dataKey="count" fill="hsl(var(--chart-3))" name="Mensagens" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
