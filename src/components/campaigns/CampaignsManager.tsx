import { useState } from "react";
import { Plus, Send, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns, Campaign } from "@/hooks/campaigns/useCampaigns";
import { useWhatsAppInstances } from "@/hooks/whatsapp/useWhatsAppInstances";
import { CampaignDialog } from "./CampaignDialog";
import { CampaignDetailsModal } from "./CampaignDetailsModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", icon: FileText, variant: "secondary" },
  scheduled: { label: "Agendada", icon: Clock, variant: "outline" },
  sending: { label: "Enviando", icon: Send, variant: "default" },
  completed: { label: "Concluída", icon: CheckCircle, variant: "default" },
  failed: { label: "Falhou", icon: XCircle, variant: "destructive" },
};

export const CampaignsManager = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  const { campaigns, isLoading } = useCampaigns();
  const { instances } = useWhatsAppInstances();

  const getInstanceName = (instanceId: string) => {
    return instances?.find(i => i.id === instanceId)?.name || "Instância";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campanhas</h2>
          <p className="text-muted-foreground">
            Gerencie campanhas de mensagens em massa
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {campaigns && campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma campanha criada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira campanha para enviar mensagens em massa
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns?.map((campaign) => {
            const status = statusConfig[campaign.status] || statusConfig.draft;
            const StatusIcon = status.icon;
            
            return (
              <Card 
                key={campaign.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription>
                        {getInstanceName(campaign.instance_id)}
                        {campaign.description && ` • ${campaign.description}`}
                      </CardDescription>
                    </div>
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">{campaign.total_recipients}</span> destinatários
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{campaign.sent_count}</span> enviados
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{campaign.delivered_count}</span> entregues
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{campaign.read_count}</span> lidos
                    </div>
                    {campaign.failed_count > 0 && (
                      <div className="text-destructive">
                        <span className="font-medium">{campaign.failed_count}</span> falhas
                      </div>
                    )}
                    <div className="ml-auto">
                      {campaign.scheduled_at ? (
                        <span>Agendada para {format(new Date(campaign.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      ) : (
                        <span>Criada em {format(new Date(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignDialog
        open={showCreateDialog || !!editingCampaign}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            // Opening via Dialog interactions (e.g., trigger) should open create mode.
            setShowCreateDialog(true);
            return;
          }
          // Closing
          setShowCreateDialog(false);
          setEditingCampaign(null);
        }}
        campaign={editingCampaign}
      />

      {!!selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onEdit={(campaign) => {
            setSelectedCampaign(null);
            setEditingCampaign(campaign);
          }}
        />
      )}
    </div>
  );
};
