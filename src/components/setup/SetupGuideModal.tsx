import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { SetupStepCard } from "./SetupStepCard";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SetupGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SetupGuideModal = ({ open, onOpenChange }: SetupGuideModalProps) => {
  const { 
    categories, 
    totalProgress, 
    completedCount, 
    totalSteps,
    toggleManualCompletion,
    resetProgress
  } = useSetupProgress();
  
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || 'initial');
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentCategory = categories.find(c => c.id === selectedCategory);

  const handleStepAction = (stepId: string) => {
    // Handle actions based on step ID
    switch (stepId) {
      case 'connect-instance':
        onOpenChange(false);
        navigate('/whatsapp/settings');
        break;
      case 'invite-member':
        onOpenChange(false);
        navigate('/whatsapp/settings?tab=team');
        break;
      case 'define-hierarchy':
        onOpenChange(false);
        navigate('/whatsapp/settings?tab=team');
        break;
      case 'create-macro':
        onOpenChange(false);
        navigate('/whatsapp/settings?tab=macros');
        break;
      case 'configure-assignment':
        onOpenChange(false);
        navigate('/whatsapp/settings?tab=assignment');
        break;
      case 'visit-reports':
        toggleManualCompletion('visit-reports');
        onOpenChange(false);
        navigate('/whatsapp/relatorio');
        break;
      case 'visit-contacts':
        toggleManualCompletion('visit-contacts');
        onOpenChange(false);
        navigate('/whatsapp/contatos');
        break;
    }
  };

  const handleReset = () => {
    resetProgress();
    toast({
      title: "Progresso resetado",
      description: "Todos os passos foram desmarcados.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r border-border bg-muted/30 p-4 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base">Guia de Configuração</DialogTitle>
            </DialogHeader>

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso geral</span>
                <span className="font-semibold">{totalProgress}%</span>
              </div>
              <Progress value={totalProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completedCount} de {totalSteps} passos concluídos
              </p>
            </div>

            {/* Categories */}
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.title}</span>
                    <span className={cn(
                      "text-xs",
                      selectedCategory === category.id 
                        ? "text-primary-foreground/80" 
                        : "text-muted-foreground"
                    )}>
                      {category.progress}%
                    </span>
                  </div>
                  <Progress 
                    value={category.progress} 
                    className={cn(
                      "h-1 mt-1",
                      selectedCategory === category.id && "[&>div]:bg-primary-foreground"
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Reset Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="w-full justify-start text-xs"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Resetar progresso
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">{currentCategory?.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {currentCategory?.steps.filter(s => s.completed).length} de {currentCategory?.steps.length} passos concluídos
              </p>
            </div>

            {/* Steps */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-3">
                {currentCategory?.steps.map((step) => (
                  <SetupStepCard
                    key={step.id}
                    step={{
                      ...step,
                      actionLabel: step.completed ? undefined : getActionLabel(step.id),
                    }}
                    onAction={() => handleStepAction(step.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function getActionLabel(stepId: string): string {
  switch (stepId) {
    case 'connect-instance':
      return 'Ir para Configurações';
    case 'invite-member':
      return 'Convidar Membro';
    case 'define-hierarchy':
      return 'Gerenciar Equipe';
    case 'create-macro':
      return 'Criar Macro';
    case 'configure-assignment':
      return 'Configurar Regras';
    case 'visit-reports':
      return 'Ver Relatórios';
    case 'visit-contacts':
      return 'Ver Contatos';
    default:
      return 'Iniciar';
  }
}
