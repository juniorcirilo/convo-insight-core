import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ExternalLink,
  QrCode,
  Settings,
  Copy,
  Webhook,
  CheckCircle2,
  Globe,
  MessageSquare,
  Shield,
  Zap,
  Check,
  Rocket,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWhatsAppInstances } from "@/hooks/whatsapp";
import confetti from "canvas-confetti";

interface InstanceSetupCollapsibleProps {
  onOpenAddDialog?: () => void;
}

const onboardingSteps = [
  {
    id: 1,
    phase: "evolution",
    phaseLabel: "Configuração do Evolution",
    title: "Acessar o Evolution",
    description: "Acesse a sua instância do Evolution API ou contrate utilizando o Cloudfy.",
    link: "https://www.cloudfy.host",
    linkText: "Contratar no Cloudfy",
    icon: Globe
  },
  {
    id: 2,
    phase: "evolution",
    phaseLabel: "Configuração do Evolution",
    title: "Criar uma instância nova",
    description: "No painel do Evolution, crie uma nova instância para conectar seu WhatsApp.",
    icon: MessageSquare
  },
  {
    id: 3,
    phase: "evolution",
    phaseLabel: "Configuração do Evolution",
    title: "Conectar via QR Code no Evolution",
    description: "Clique no ícone de engrenagem (⚙️) na instância criada no Evolution e selecione 'Get QR Code'. Escaneie o QR Code com o WhatsApp do número que deseja conectar.",
    icon: QrCode
  },
  {
    id: 4,
    phase: "evolution",
    phaseLabel: "Configuração do Evolution",
    title: "Ignorar grupos",
    description: "Acesse Configurations > Settings e ative 'Ignore All Groups' para evitar mensagens de grupos.",
    icon: Shield
  },
  {
    id: 5,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Criar nova instância",
    description: "Na plataforma de WhatsApp desenvolvida, clique em 'Criar nova Instância'.",
    icon: Zap,
    showAddInstanceButton: true
  },
  {
    id: 6,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Nome de identificação",
    description: "Adicione o nome que identifique a instância (ex: 'WhatsApp Vendas').",
    icon: Settings
  },
  {
    id: 7,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Nome da instância no Evolution",
    description: "Adicione o nome da instância configurada no Evolution (ex: 'my-instance').",
    icon: Settings
  },
  {
    id: 8,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "URL da API",
    description: "Adicione a URL da API do Evolution (a mesma URL do navegador).",
    icon: ExternalLink
  },
  {
    id: 9,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Chave da API",
    description: "Adicione a sua chave da API. Se você está usando no Cloudfy, ela se encontra no painel da ferramenta em Infraestrutura.",
    icon: Shield
  },
  {
    id: 10,
    phase: "platform",
    phaseLabel: "Configuração da Plataforma",
    title: "Salvar configurações",
    description: "Clique em 'Salvar' para criar a instância na plataforma.",
    icon: CheckCircle2
  },
  {
    id: 11,
    phase: "webhook",
    phaseLabel: "Configuração do Webhook",
    title: "Copiar URL do Webhook",
    description: "Copie a URL do Webhook exibida no card da instância criada (na aba 'Instâncias').",
    icon: Copy
  },
  {
    id: 12,
    phase: "webhook",
    phaseLabel: "Configuração do Webhook",
    title: "Acessar configuração de Webhook",
    description: "No Evolution, acesse Events > Webhook.",
    icon: Webhook
  },
    {
      id: 13,
      phase: "webhook",
      phaseLabel: "Configuração do Webhook",
      title: "Configurar Webhook",
      description: "Acesse Events > Webhook, clique em 'Enable' para ativar, e cole a URL no campo 'URL'. Ative 'Webhook base 64'.",
      icon: Settings
    },
  {
    id: 14,
    phase: "webhook",
    phaseLabel: "Configuração do Webhook",
    title: "Ativar eventos",
    description: "Role a página e ative o evento 'MESSAGES_UPSERT'. Clique em salvar.",
    icon: CheckCircle2,
    showEventsInfo: true
  },
  {
    id: 15,
    phase: "finalization",
    phaseLabel: "Finalização",
    title: "Testar conexão",
    description: "Pronto! Agora teste a sua conexão enviando uma mensagem de teste pelo WhatsApp conectado.",
    icon: CheckCircle2
  }
];

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case "evolution": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "platform": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "webhook": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "finalization": return "bg-primary/10 text-primary border-primary/20";
    default: return "";
  }
};

export const InstanceSetupCollapsible = ({
  onOpenAddDialog,
}: InstanceSetupCollapsibleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const saved = localStorage.getItem('whatsapp-onboarding-progress');
    return saved ? JSON.parse(saved) : [];
  });
  const [hasCelebrated, setHasCelebrated] = useState<boolean>(() => {
    const saved = localStorage.getItem('whatsapp-onboarding-celebrated');
    return saved ? JSON.parse(saved) : false;
  });
  const { toast } = useToast();
  const { instances, isLoading: isLoadingInstances } = useWhatsAppInstances();

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setIsOpen((prev) => (prev === nextOpen ? prev : nextOpen));
  }, []);

  // Persistir progresso no localStorage
  useEffect(() => {
    localStorage.setItem('whatsapp-onboarding-progress', JSON.stringify(completedSteps));
  }, [completedSteps]);

  // Abrir automaticamente se não houver instâncias e o checklist não estiver completo
  useEffect(() => {
    if (!isLoadingInstances && instances.length === 0 && completedSteps.length < onboardingSteps.length) {
      setIsOpen((prev) => (prev ? prev : true));
    }
  }, [isLoadingInstances, instances.length, completedSteps.length]);

  // Celebração ao completar todos os passos
  useEffect(() => {
    if (completedSteps.length === onboardingSteps.length && !hasCelebrated) {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0.95, y: 0.95 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
        });
      }, 250);

      toast({
        title: "🎉 Parabéns!",
        description: "Você completou toda a configuração!",
      });

      setHasCelebrated(true);
      localStorage.setItem('whatsapp-onboarding-celebrated', JSON.stringify(true));
    }
  }, [completedSteps.length, hasCelebrated, toast]);

  const progressPercent = Math.round((completedSteps.length / onboardingSteps.length) * 100);
  const remainingSteps = onboardingSteps.length - completedSteps.length;

  const toggleStep = (stepId: number) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const handleOpenAddInstance = () => {
    onOpenAddDialog?.();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground justify-between h-12">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            <span className="font-semibold">
              {completedSteps.length === onboardingSteps.length 
                ? "Configuração Completa! 🎉" 
                : "Configurar Evolution API"}
            </span>
            {remainingSteps > 0 && (
              <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">
                {remainingSteps} passos
              </span>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {/* Header com progresso */}
          <div className="bg-muted p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso da Configuração</span>
              <span className="text-sm font-semibold">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          {/* Lista de passos */}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {onboardingSteps.map((step) => {
                const isCompleted = completedSteps.includes(step.id);
                const Icon = step.icon;

                return (
                  <AccordionItem 
                    key={step.id} 
                    value={`step-${step.id}`}
                    className="border rounded-md"
                  >
                    <div className="flex items-start gap-2 px-3 py-2">
                      <Checkbox 
                        checked={isCompleted}
                        onCheckedChange={() => toggleStep(step.id)}
                        className="mt-2"
                      />
                      <AccordionTrigger className="flex-1 hover:no-underline py-0">
                        <div className="flex items-center gap-2 text-left w-full">
                          <div className={cn("p-1.5 rounded-md", getPhaseColor(step.phase))}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={cn(
                            "text-sm flex-1",
                            isCompleted && "line-through text-muted-foreground"
                          )}>
                            {step.title}
                          </span>
                        </div>
                      </AccordionTrigger>
                    </div>
                    
                    <AccordionContent className="px-3 pb-3 pt-0 pl-12">
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>

                        {/* Link externo */}
                        {step.link && (
                          <Button variant="outline" size="sm" asChild className="w-full">
                            <a href={step.link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-3 w-3" />
                              {step.linkText}
                            </a>
                          </Button>
                        )}

                        {/* Botão para abrir AddInstanceDialog */}
                        {step.showAddInstanceButton && (
                          <Button onClick={handleOpenAddInstance} size="sm" className="w-full">
                            <Zap className="mr-2 h-3 w-3" />
                            Criar Nova Instância
                          </Button>
                        )}

                        {/* Informações de eventos */}
                        {step.showEventsInfo && (
                          <div className="p-2 bg-primary/5 border border-primary/20 rounded-md">
                            <div className="text-xs font-medium mb-1">Eventos a ativar:</div>
                            <ul className="text-xs space-y-0.5 text-muted-foreground">
                              <li>✓ MESSAGES_UPSERT</li>
                              <li>✓ Webhook base 64</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Footer */}
          <div className="border-t p-3 bg-muted/50">
            <Button 
              onClick={() => {
                setCompletedSteps([]);
                setHasCelebrated(false);
                localStorage.removeItem('whatsapp-onboarding-progress');
                localStorage.removeItem('whatsapp-onboarding-celebrated');
                toast({
                  title: "Progresso resetado",
                  description: "Todos os passos foram desmarcados.",
                });
              }}
              variant="ghost"
              size="sm"
              className="w-full text-xs"
            >
              Resetar progresso
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
