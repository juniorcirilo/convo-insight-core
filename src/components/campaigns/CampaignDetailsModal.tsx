import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  CheckCircle, 
  Eye, 
  XCircle, 
  Clock, 
  Edit, 
  Play,
  Loader2,
  FileText
} from "lucide-react";
import { Campaign, useCampaigns } from "@/hooks/campaigns/useCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface CampaignDetailsModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onEdit: (campaign: Campaign) => void;
}

interface CampaignLog {
  id: string;
  contact_id: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  contact?: {
    name: string;
    phone_number: string;
  };
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", icon: FileText, variant: "secondary" },
  scheduled: { label: "Agendada", icon: Clock, variant: "outline" },
  sending: { label: "Enviando", icon: Send, variant: "default" },
  completed: { label: "Concluída", icon: CheckCircle, variant: "default" },
  failed: { label: "Falhou", icon: XCircle, variant: "destructive" },
};

const logStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "text-muted-foreground" },
  sent: { label: "Enviado", color: "text-blue-500" },
  delivered: { label: "Entregue", color: "text-green-500" },
  read: { label: "Lido", color: "text-primary" },
  failed: { label: "Falhou", color: "text-destructive" },
};

export const CampaignDetailsModal = ({ campaign, onClose, onEdit }: CampaignDetailsModalProps) => {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  // eslint-disable-next-line no-console
  console.debug("[CampaignDetailsModal] render", { count: renderCountRef.current, open: !!campaign, id: campaign?.id });

  const [isStarting, setIsStarting] = useState(false);
  const { updateCampaign } = useCampaigns();
  const { toast } = useToast();

  // Fetch campaign logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["campaign-logs", campaign?.id],
    queryFn: async () => {
      if (!campaign?.id) return [];
      
      const { data, error } = await supabase
        .from("campaign_logs")
        .select(`
          id,
          contact_id,
          status,
          sent_at,
          delivered_at,
          read_at,
          error_message
        `)
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Fetch contact info for each log
      const logsWithContacts = await Promise.all(
        (data || []).map(async (log) => {
          if (!log.contact_id) return { ...log, contact: null };
          
          const { data: contact } = await supabase
            .from("whatsapp_contacts")
            .select("name, phone_number")
            .eq("id", log.contact_id)
            .maybeSingle();
          
          return { ...log, contact };
        })
      );

      return logsWithContacts as CampaignLog[];
    },
    enabled: !!campaign?.id,
    refetchInterval: campaign?.status === "sending" ? 5000 : false,
  });

  if (!campaign) return null;

  const status = statusConfig[campaign.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  const totalRecipients = campaign.total_recipients || 0;
  const sentProgress = totalRecipients > 0 ? (campaign.sent_count / totalRecipients) * 100 : 0;
  const deliveredProgress = totalRecipients > 0 ? (campaign.delivered_count / totalRecipients) * 100 : 0;
  const readProgress = totalRecipients > 0 ? (campaign.read_count / totalRecipients) * 100 : 0;

  const handleStartCampaign = async () => {
    setIsStarting(true);
    try {
      // Call edge function to start campaign
      const { error } = await supabase.functions.invoke("send-campaign-messages", {
        body: { campaign_id: campaign.id },
      });

      if (error) throw error;

      toast({
        title: "Campanha iniciada",
        description: "Os envios começarão em breve.",
      });

      // Update local status
      updateCampaign({ id: campaign.id, status: "sending" });
    } catch (error: any) {
      console.error("Error starting campaign:", error);
      toast({
        title: "Erro ao iniciar campanha",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const canStart = campaign.status === "draft" || campaign.status === "scheduled";
  const canEdit = campaign.status === "draft";

  return (
    <Dialog
      open={!!campaign}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{campaign.name}</DialogTitle>
              {campaign.description && (
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
              )}
            </div>
            <Badge variant={status.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="stats" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="message">Mensagem</TabsTrigger>
            <TabsTrigger value="logs">Logs ({logs?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="flex-1 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Destinatários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaign.total_recipients}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Send className="h-3 w-3" /> Enviados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaign.sent_count}</div>
                  <Progress value={sentProgress} className="h-1 mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Entregues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaign.delivered_count}</div>
                  <Progress value={deliveredProgress} className="h-1 mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Lidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaign.read_count}</div>
                  <Progress value={readProgress} className="h-1 mt-2" />
                </CardContent>
              </Card>
            </div>

            {campaign.failed_count > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Falhas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{campaign.failed_count}</div>
                </CardContent>
              </Card>
            )}

            <div className="text-sm text-muted-foreground space-y-1">
              <p>Criada em: {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              {campaign.scheduled_at && (
                <p>Agendada para: {format(new Date(campaign.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              )}
              {campaign.started_at && (
                <p>Iniciada em: {format(new Date(campaign.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              )}
              {campaign.completed_at && (
                <p>Concluída em: {format(new Date(campaign.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="message" className="flex-1">
            <Card>
              <CardContent className="pt-4">
                <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">
                  {campaign.message_content}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 min-h-0">
            <ScrollArea className="h-[300px]">
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : logs && logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const logStatus = logStatusConfig[log.status] || logStatusConfig.pending;
                    return (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">{log.contact?.name || "Contato"}</p>
                          <p className="text-sm text-muted-foreground">{log.contact?.phone_number}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${logStatus.color}`}>{logStatus.label}</p>
                          {log.error_message && (
                            <p className="text-xs text-destructive">{log.error_message}</p>
                          )}
                          {log.sent_at && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.sent_at), "HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum log disponível
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {canEdit && (
            <Button variant="outline" onClick={() => onEdit(campaign)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {canStart && (
            <Button onClick={handleStartCampaign} disabled={isStarting}>
              {isStarting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Campanha
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
