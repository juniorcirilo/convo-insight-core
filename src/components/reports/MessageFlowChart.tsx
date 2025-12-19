import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MessageFlowChartProps {
  data: Array<{ date: string; sent: number; received: number }>;
}

export function MessageFlowChart({ data }: MessageFlowChartProps) {
  if (data.every(d => d.sent === 0 && d.received === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Mensagens Enviadas vs Recebidas</CardTitle>
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
        <CardTitle>Evolução de Mensagens Enviadas vs Recebidas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="sent" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Enviadas"
            />
            <Line 
              type="monotone" 
              dataKey="received" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              name="Recebidas"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
