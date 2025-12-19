import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InstanceComparisonChartProps {
  data: Array<{ 
    instanceId: string; 
    instanceName: string; 
    conversations: number; 
    messages: number; 
    contacts: number;
  }>;
}

export function InstanceComparisonChart({ data }: InstanceComparisonChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Instâncias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground">Filtre por todas as instâncias para ver comparativo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo de Instâncias</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="instanceName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="conversations" fill="hsl(var(--primary))" name="Conversas" />
            <Bar dataKey="messages" fill="hsl(var(--chart-2))" name="Mensagens" />
            <Bar dataKey="contacts" fill="hsl(var(--chart-3))" name="Contatos" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
