import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Search, Image, FileText, X, Upload } from "lucide-react";
import { useCampaigns, Campaign } from "@/hooks/campaigns/useCampaigns";
import { useWhatsAppInstances } from "@/hooks/whatsapp/useWhatsAppInstances";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  instance_id: z.string().min(1, "Selecione uma instância"),
  message_content: z.string().min(1, "Mensagem é obrigatória"),
  message_type: z.enum(["text", "image", "document"]),
  scheduled_at: z.string().optional(),
});

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign | null;
}

export const CampaignDialog = ({ open, onOpenChange, campaign }: CampaignDialogProps) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { createCampaign, updateCampaign, isCreating, isUpdating } = useCampaigns();
  const { instances } = useWhatsAppInstances();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      instance_id: "",
      message_content: "",
      message_type: "text",
      scheduled_at: "",
    },
  });

  const selectedInstanceId = form.watch("instance_id");
  const messageType = form.watch("message_type");
  const campaignId = campaign?.id ?? null;

  // Fetch contacts for selected instance (only opt-in contacts)
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["campaign-contacts", selectedInstanceId, contactSearch],
    queryFn: async () => {
      if (!selectedInstanceId) return [];

      let query = supabase
        .from("whatsapp_contacts")
        .select("id, name, phone_number, opt_in, is_group")
        .eq("instance_id", selectedInstanceId)
        .eq("opt_in", true)
        .eq("is_group", false)
        .order("name");

      if (contactSearch) {
        query = query.or(`name.ilike.%${contactSearch}%,phone_number.ilike.%${contactSearch}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedInstanceId,
  });

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        description: campaign.description || "",
        instance_id: campaign.instance_id,
        message_content: campaign.message_content,
        message_type: (campaign.message_type as "text" | "image" | "document") || "text",
        scheduled_at: campaign.scheduled_at || "",
      });
      setSelectedContacts((campaign.target_contacts as string[]) || []);

      const mediaUrl = (campaign as any).media_url;
      if (mediaUrl) {
        setExistingMediaUrl(mediaUrl);
        setMediaPreview(mediaUrl);
      }
    } else {
      form.reset({
        name: "",
        description: "",
        instance_id: "",
        message_content: "",
        message_type: "text",
        scheduled_at: "",
      });
      setSelectedContacts([]);
      setMediaFile(null);
      setMediaPreview(null);
      setExistingMediaUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 10MB",
        variant: "destructive",
      });
      return;
    }

    setMediaFile(file);
    setExistingMediaUrl(null);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setExistingMediaUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadMedia = async (): Promise<{ url: string; mimetype: string } | null> => {
    if (!mediaFile) return null;

    setIsUploading(true);
    try {
      const fileName = `campaigns/${Date.now()}-${mediaFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("whatsapp-media")
        .upload(fileName, mediaFile, {
          contentType: mediaFile.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("whatsapp-media")
        .getPublicUrl(fileName);

      return {
        url: publicUrlData.publicUrl,
        mimetype: mediaFile.type,
      };
    } catch (error: any) {
      console.error("Error uploading media:", error);
      toast({
        title: "Erro ao fazer upload",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let mediaUrl = existingMediaUrl;
    let mediaMimetype = null;

    // Upload new media if selected
    if (mediaFile && messageType !== "text") {
      const uploadResult = await uploadMedia();
      if (!uploadResult) {
        toast({
          title: "Erro",
          description: "Falha ao fazer upload da mídia",
          variant: "destructive",
        });
        return;
      }
      mediaUrl = uploadResult.url;
      mediaMimetype = uploadResult.mimetype;
    }

    const payload = {
      name: values.name,
      instance_id: values.instance_id,
      message_content: values.message_content,
      message_type: values.message_type,
      description: values.description,
      target_contacts: selectedContacts,
      scheduled_at: values.scheduled_at || undefined,
      media_url: values.message_type !== "text" ? mediaUrl : null,
      media_mimetype: values.message_type !== "text" ? mediaMimetype : null,
    };

    if (campaign) {
      updateCampaign({ id: campaign.id, ...payload });
    } else {
      createCampaign(payload);
    }
    
    onOpenChange(false);
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllContacts = () => {
    if (contacts) {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const deselectAllContacts = () => {
    setSelectedContacts([]);
  };

  const getAcceptedFileTypes = () => {
    if (messageType === "image") return "image/*";
    if (messageType === "document") return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          <DialogDescription>
            Configure os detalhes da campanha e selecione os destinatários
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Campanha</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Black Friday 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instance_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instância</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma instância" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instances?.filter(instance => instance.id).map((instance) => (
                          <SelectItem key={instance.id} value={instance.id}>
                            {instance.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Breve descrição da campanha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message Type Selection */}
            <FormField
              control={form.control}
              name="message_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Mensagem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Texto
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Imagem
                        </div>
                      </SelectItem>
                      <SelectItem value="document">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documento
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Media Upload */}
            {messageType !== "text" && (
              <div className="space-y-3">
                <FormLabel>
                  {messageType === "image" ? "Imagem" : "Documento"}
                </FormLabel>
                
                {(mediaPreview || mediaFile) ? (
                  <div className="relative border rounded-md p-4">
                    {messageType === "image" && mediaPreview && (
                      <img 
                        src={mediaPreview} 
                        alt="Preview" 
                        className="max-h-48 rounded-md mx-auto"
                      />
                    )}
                    {messageType === "document" && mediaFile && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm">{mediaFile.name}</span>
                      </div>
                    )}
                    {messageType === "document" && existingMediaUrl && !mediaFile && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm">Documento existente</span>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeMedia}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar {messageType === "image" ? "uma imagem" : "um documento"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo 10MB
                    </p>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptedFileTypes()}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="message_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {messageType === "text" ? "Mensagem" : "Legenda"}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={messageType === "text" 
                        ? "Digite a mensagem que será enviada..." 
                        : "Digite a legenda da mídia (opcional)..."
                      }
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {messageType === "text" 
                      ? "A mensagem será enviada para todos os contatos selecionados"
                      : "A legenda aparecerá junto com a mídia"
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agendar envio (opcional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    Deixe em branco para salvar como rascunho
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Destinatários</FormLabel>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {selectedContacts.length} selecionados
                  </Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={selectAllContacts}>
                    Todos
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={deselectAllContacts}>
                    Nenhum
                  </Button>
                </div>
              </div>

              {selectedInstanceId ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar contatos..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <ScrollArea className="h-[180px] border rounded-md p-2">
                    {contactsLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : contacts && contacts.length > 0 ? (
                      <div className="space-y-2">
                        {contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleContact(contact.id)}
                          >
                            <Checkbox 
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() => toggleContact(contact.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{contact.name}</p>
                              <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Nenhum contato com opt-in encontrado
                      </div>
                    )}
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    Apenas contatos com opt-in ativo são exibidos
                  </p>
                </>
              ) : (
                <div className="border rounded-md p-4 text-center text-muted-foreground">
                  Selecione uma instância para ver os contatos
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating || isUpdating || isUploading || selectedContacts.length === 0}
              >
                {(isCreating || isUpdating || isUploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isUploading ? "Enviando mídia..." : campaign ? "Salvar" : "Criar Campanha"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
