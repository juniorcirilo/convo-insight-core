import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopContactsChartProps {
  data: Array<{ contactId: string; contactName: string; messageCount: number }>;
}

export function TopContactsChart({ data }: TopContactsChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Contatos Mais Ativos</CardTitle>
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
        <CardTitle>Top 10 Contatos Mais Ativos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="contactName" type="category" width={120} />
            <Tooltip 
              formatter={(value: number) => [`${value} mensagens`, 'Total']}
            />
            <Bar dataKey="messageCount" fill="hsl(var(--chart-4))" name="Mensagens" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
