import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConversationLead } from '@/hooks/sales/useConversationLead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TrendingUp, Plus, Loader2, Check, X, Pencil } from 'lucide-react';

interface ConversationLeadStatusProps {
  conversationId: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo',
  contacted: 'Em contato',
  qualified: 'Qualificado',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  contacted: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  qualified: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  proposal: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  negotiation: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  won: 'bg-green-500/10 text-green-500 border-green-500/20',
  lost: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function ConversationLeadStatus({ conversationId }: ConversationLeadStatusProps) {
  const { 
    lead, 
    isLoading, 
    createLead, 
    updateLeadStatus, 
    updateLeadValue,
    isCreating, 
    isUpdating,
    isUpdatingValue 
  } = useConversationLead(conversationId);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState('');

  // Fetch conversation details to get contact info
  const { data: conversation } = useQuery({
    queryKey: ['conversation-details', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:whatsapp_contacts(id, name, phone_number)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const handleCreateLead = () => {
    if (!conversation?.contact) return;

    createLead({
      conversationId,
      contactId: conversation.contact.id,
      name: conversation.contact.name,
      phone: conversation.contact.phone_number,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    if (!lead) return;
    
    updateLeadStatus({
      leadId: lead.id,
      status: newStatus as any,
    });
    setIsEditingStatus(false);
  };

  const handleStartEditValue = () => {
    if (!lead) return;
    setValueInput(String(lead.value || 0));
    setIsEditingValue(true);
  };

  const handleSaveValue = () => {
    if (!lead) return;
    const numericValue = parseFloat(valueInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    updateLeadValue({
      leadId: lead.id,
      value: numericValue,
    });
    setIsEditingValue(false);
  };

  const handleCancelEditValue = () => {
    setIsEditingValue(false);
    setValueInput('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lead) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pipeline de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            Este contato ainda não foi adicionado ao pipeline.
          </p>
          <Button 
            size="sm" 
            onClick={handleCreateLead}
            disabled={isCreating || !conversation?.contact}
            className="w-full"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Criar Lead
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Pipeline de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          {isEditingStatus ? (
            <Select 
              value={lead.status} 
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge 
              variant="outline" 
              className={`cursor-pointer ${STATUS_COLORS[lead.status]}`}
              onClick={() => setIsEditingStatus(true)}
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              {STATUS_LABELS[lead.status]}
            </Badge>
          )}
        </div>

        {/* Valor - sempre exibido */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Valor:</span>
          {isEditingValue ? (
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                className="w-24 h-8 text-sm"
                placeholder="0,00"
                autoFocus
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8"
                onClick={handleSaveValue}
                disabled={isUpdatingValue}
              >
                {isUpdatingValue ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 text-green-500" />
                )}
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8"
                onClick={handleCancelEditValue}
              >
                <X className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          ) : (
            <div 
              className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mr-2"
              onClick={handleStartEditValue}
            >
              <span className="text-sm font-medium">
                {formatCurrency(Number(lead.value) || 0)}
              </span>
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Clique no status ou valor para alterar
        </p>
      </CardContent>
    </Card>
  );
}