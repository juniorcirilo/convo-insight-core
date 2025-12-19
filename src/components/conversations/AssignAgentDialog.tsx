import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgents } from '@/hooks/useAgents';
import { useConversationAssignment } from '@/hooks/whatsapp/useConversationAssignment';
import { MessageSquare, Circle } from 'lucide-react';

interface AssignAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentAssignee?: string;
  isTransfer?: boolean;
}

export function AssignAgentDialog({
  open,
  onOpenChange,
  conversationId,
  currentAssignee,
  isTransfer = false,
}: AssignAgentDialogProps) {
  const { agents, isLoading } = useAgents();
  const { assignConversation, transferConversation, isAssigning, isTransferring } = useConversationAssignment();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!selectedAgent) return;

    if (isTransfer) {
      transferConversation(
        { conversationId, newAssignee: selectedAgent, reason: reason || undefined },
        {
          onSuccess: () => {
            onOpenChange(false);
            setSelectedAgent(null);
            setReason('');
          },
        }
      );
    } else {
      assignConversation(
        { conversationId, assignedTo: selectedAgent, reason: reason || undefined },
        {
          onSuccess: () => {
            onOpenChange(false);
            setSelectedAgent(null);
            setReason('');
          },
        }
      );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'away':
        return 'text-yellow-500';
      case 'busy':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const availableAgents = agents.filter(agent => agent.id !== currentAssignee);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isTransfer ? 'Transferir Conversa' : 'Atribuir Conversa'}
          </DialogTitle>
          <DialogDescription>
            {isTransfer
              ? 'Selecione o atendente para transferir esta conversa'
              : 'Selecione um atendente para atribuir esta conversa'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Carregando atendentes...
              </div>
            ) : availableAgents.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum atendente disponível
              </div>
            ) : (
              availableAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`
                    w-full p-3 rounded-lg border transition-colors text-left
                    ${selectedAgent === agent.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(agent.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{agent.full_name}</span>
                        <Circle className={`h-2 w-2 fill-current ${getStatusColor(agent.status)}`} />
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {agent.role === 'admin' ? 'Admin' : agent.role === 'supervisor' ? 'Supervisor' : 'Agente'}
                        </Badge>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>{agent.activeConversations} ativa{agent.activeConversations !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {isTransfer && (
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da transferência (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Cliente solicitou transferência, especialização necessária..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedAgent || isAssigning || isTransferring}
          >
            {isAssigning || isTransferring ? 'Processando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
