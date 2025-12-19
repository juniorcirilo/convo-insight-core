import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface LongestConversationsTableProps {
  conversations: Array<{
    id: string;
    contactName: string;
    status: string;
    durationHours: number;
    createdAt: string;
  }>;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: 'default',
  closed: 'secondary',
  archived: 'outline'
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aberto',
  closed: 'Concluído',
  archived: 'Arquivado'
};

export function LongestConversationsTable({ conversations }: LongestConversationsTableProps) {
  if (conversations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Conversas Mais Longas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada no período selecionado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Conversas Mais Longas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Iniciada em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell className="font-medium">{conv.contactName}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[conv.status] || 'default'}>
                    {STATUS_LABELS[conv.status] || conv.status}
                  </Badge>
                </TableCell>
                <TableCell>{conv.durationHours.toFixed(1)}h</TableCell>
                <TableCell>{format(new Date(conv.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
