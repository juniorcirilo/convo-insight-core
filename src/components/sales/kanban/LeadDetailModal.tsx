import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead, LeadStatus, useLeads } from '@/hooks/sales/useLeads';
import { useLeadStatusHistory } from '@/hooks/sales/useLeadStatusHistory';
import { EditLeadModal } from './EditLeadModal';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Phone, 
  Mail, 
  DollarSign, 
  Calendar,
  Clock,
  User,
  MessageSquare,
  History,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

const statusLabels: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'bg-blue-500/20 text-blue-400' },
  contacted: { label: 'Em Contato', color: 'bg-sky-500/20 text-sky-400' },
  qualified: { label: 'Qualificado', color: 'bg-yellow-500/20 text-yellow-400' },
  proposal: { label: 'Proposta', color: 'bg-orange-500/20 text-orange-400' },
  negotiation: { label: 'Negociação', color: 'bg-purple-500/20 text-purple-400' },
  won: { label: 'Ganho', color: 'bg-green-500/20 text-green-400' },
  lost: { label: 'Perdido', color: 'bg-red-500/20 text-red-400' },
};

export const LeadDetailModal = ({ lead, open, onClose }: LeadDetailModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { history, isLoading: historyLoading } = useLeadStatusHistory(lead?.id);
  const { deleteLead } = useLeads();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!lead || !open) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      await deleteLead.mutateAsync(lead.id);
      onClose();
    }
  };

  const handleNavigateToConversation = () => {
    if (lead.conversation_id) {
      onClose();
      navigate(`/whatsapp?conversation=${lead.conversation_id}`);
    } else {
      toast({
        title: "Sem conversa vinculada",
        description: "Este lead não possui uma conversa do WhatsApp vinculada.",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = () => {
    setIsEditModalOpen(true);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div 
        className="relative bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{lead.name}</h2>
              {lead.company && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {lead.company}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusLabels[lead.status].color}>
              {statusLabels[lead.status].label}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue="details" className="p-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{lead.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Criado {formatDistanceToNow(new Date(lead.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{formatCurrency(lead.value || 0)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Probabilidade: {lead.probability || 0}%</span>
                </div>
                {lead.expected_close_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Previsão: {format(new Date(lead.expected_close_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Agent */}
            {lead.assigned_agent && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={lead.assigned_agent.avatar_url} />
                  <AvatarFallback>
                    {lead.assigned_agent.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{lead.assigned_agent.full_name}</p>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={handleNavigateToConversation}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversa
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="ml-auto"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <div className="min-h-[200px] p-4 bg-muted/30 rounded-lg">
              {lead.notes ? (
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Nenhuma nota adicionada
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[300px]">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum histórico de movimentação
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="w-px h-full bg-border" />
                      </div>
                      <div className="pb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <History className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {item.old_status ? (
                              <>
                                <Badge variant="outline" className="mr-1">
                                  {statusLabels[item.old_status as LeadStatus]?.label || item.old_status}
                                </Badge>
                                →
                                <Badge variant="outline" className="ml-1">
                                  {statusLabels[item.new_status as LeadStatus]?.label || item.new_status}
                                </Badge>
                              </>
                            ) : (
                              <span>
                                Lead criado como{' '}
                                <Badge variant="outline">
                                  {statusLabels[item.new_status as LeadStatus]?.label || item.new_status}
                                </Badge>
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {item.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Edit Modal */}
      <EditLeadModal
        lead={lead}
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};