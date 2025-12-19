import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AgentPerformanceData {
  agentId: string;
  agentName: string;
  totalConversations: number;
  closedConversations: number;
  avgResponseTimeMinutes: number;
}

interface AgentPerformanceChartProps {
  data: AgentPerformanceData[];
}

export function AgentPerformanceChart({ data }: AgentPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por Agente</CardTitle>
          <CardDescription>Conversas atendidas e tempo médio de resposta</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum dado disponível para o período selecionado
        </CardContent>
      </Card>
    );
  }

  // Sort by total conversations descending
  const sortedData = [...data].sort((a, b) => b.totalConversations - a.totalConversations);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Agente</CardTitle>
        <CardDescription>Conversas atendidas e tempo médio de resposta</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" className="text-xs" />
            <YAxis 
              dataKey="agentName" 
              type="category" 
              className="text-xs"
              width={100}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'avgResponseTimeMinutes') {
                  const hours = Math.floor(value / 60);
                  const minutes = Math.round(value % 60);
                  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
                }
                return value;
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              formatter={(value) => {
                if (value === 'totalConversations') return 'Total de Conversas';
                if (value === 'closedConversations') return 'Conversas Fechadas';
                if (value === 'avgResponseTimeMinutes') return 'TMR (minutos)';
                return value;
              }}
            />
            <Bar 
              dataKey="totalConversations" 
              fill="hsl(var(--primary))" 
              radius={[0, 4, 4, 0]}
            />
            <Bar 
              dataKey="closedConversations" 
              fill="hsl(var(--chart-2))" 
              radius={[0, 4, 4, 0]}
            />
            <Bar 
              dataKey="avgResponseTimeMinutes" 
              fill="hsl(var(--chart-3))" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
