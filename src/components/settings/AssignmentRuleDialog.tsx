import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWhatsAppInstances } from "@/hooks/whatsapp";
import { useAgents } from "@/hooks/useAgents";
import { useSectors } from "@/hooks/useSectors";
import { AgentMultiSelect } from "./AgentMultiSelect";
import type { AssignmentRule } from "@/hooks/whatsapp/useAssignmentRules";

interface AssignmentRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AssignmentRule;
  onSave: (data: any) => void;
}

interface FormData {
  name: string;
  instance_id: string;
  sector_id: string;
  rule_type: 'fixed' | 'round_robin';
  fixed_agent_id: string;
  round_robin_agents: string[];
}

export function AssignmentRuleDialog({
  open,
  onOpenChange,
  rule,
  onSave,
}: AssignmentRuleDialogProps) {
  const { instances = [] } = useWhatsAppInstances();
  
  const [ruleType, setRuleType] = useState<'fixed' | 'round_robin'>(
    rule?.rule_type || 'fixed'
  );
  const [roundRobinAgents, setRoundRobinAgents] = useState<string[]>(
    rule?.round_robin_agents || []
  );

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      name: rule?.name || "",
      instance_id: rule?.instance_id || "",
      sector_id: rule?.sector_id || "",
      rule_type: rule?.rule_type || 'fixed',
      fixed_agent_id: rule?.fixed_agent_id || "",
      round_robin_agents: rule?.round_robin_agents || [],
    },
  });

  const selectedInstanceId = watch("instance_id");
  const selectedSectorId = watch("sector_id");
  
  // Load sectors for selected instance
  const { sectors = [] } = useSectors(selectedInstanceId || undefined);
  
  // Load agents filtered by sector if selected, otherwise by instance
  const { agents = [] } = useAgents(
    selectedSectorId 
      ? { sectorId: selectedSectorId }
      : selectedInstanceId 
        ? { instanceId: selectedInstanceId }
        : undefined
  );

  // Reset sector when instance changes
  useEffect(() => {
    if (selectedInstanceId && !rule?.sector_id) {
      setValue("sector_id", "");
    }
  }, [selectedInstanceId, setValue, rule]);

  // Reset form when rule changes
  useEffect(() => {
    if (rule) {
      reset({
        name: rule.name || "",
        instance_id: rule.instance_id || "",
        sector_id: rule.sector_id || "",
        rule_type: rule.rule_type || 'fixed',
        fixed_agent_id: rule.fixed_agent_id || "",
        round_robin_agents: rule.round_robin_agents || [],
      });
      setRuleType(rule.rule_type as 'fixed' | 'round_robin' || 'fixed');
      setRoundRobinAgents(rule.round_robin_agents || []);
    } else {
      reset({
        name: "",
        instance_id: "",
        sector_id: "",
        rule_type: 'fixed',
        fixed_agent_id: "",
        round_robin_agents: [],
      });
      setRuleType('fixed');
      setRoundRobinAgents([]);
    }
  }, [rule, reset]);

  const onSubmit = (data: FormData) => {
    const payload = {
      name: data.name,
      instance_id: data.instance_id,
      sector_id: data.sector_id || null,
      rule_type: ruleType,
      fixed_agent_id: ruleType === 'fixed' ? data.fixed_agent_id : null,
      round_robin_agents: ruleType === 'round_robin' ? roundRobinAgents : [],
      is_active: true,
    };

    if (rule) {
      onSave({ id: rule.id, ...payload });
    } else {
      onSave(payload);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Editar Regra" : "Nova Regra de Atribuição"}
          </DialogTitle>
          <DialogDescription>
            Configure como as conversas serão atribuídas automaticamente aos agentes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Regra</Label>
            <Input
              id="name"
              placeholder="Ex: Atribuição Automática - Suporte"
              {...register("name", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance">Instância</Label>
            <Select
              value={watch("instance_id") || undefined}
              onValueChange={(value) => setValue("instance_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar instância..." />
              </SelectTrigger>
              <SelectContent>
                {instances.filter(instance => instance.id).map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sector selector (optional) */}
          {selectedInstanceId && (
            <div className="space-y-2">
              <Label htmlFor="sector">Setor (opcional)</Label>
              <Select
                value={watch("sector_id") || "all_sectors"}
                onValueChange={(value) => setValue("sector_id", value === "all_sectors" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os setores da instância..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_sectors">Todos os setores</SelectItem>
                  {sectors.filter(sector => sector.id).map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name} {sector.is_default && "(Padrão)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se selecionado, a regra só se aplica a conversas deste setor
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Label>Tipo de Atribuição</Label>
            <RadioGroup
              value={ruleType}
              onValueChange={(value) => setRuleType(value as 'fixed' | 'round_robin')}
            >
              <div className="flex items-start space-x-2 rounded-lg border border-border p-3">
                <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="fixed" className="font-medium cursor-pointer">
                    Atribuição Fixa
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todas as conversas serão atribuídas para um único agente
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-lg border border-border p-3">
                <RadioGroupItem value="round_robin" id="round_robin" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="round_robin" className="font-medium cursor-pointer">
                    Round-Robin
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conversas distribuídas alternadamente entre múltiplos agentes
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {ruleType === 'fixed' && (
            <div className="space-y-2">
              <Label htmlFor="agent">Agente</Label>
              <Select
                value={watch("fixed_agent_id") || undefined}
                onValueChange={(value) => setValue("fixed_agent_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar agente..." />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter(agent => agent.id).map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name} ({agent.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {ruleType === 'round_robin' && (
            <div className="space-y-2">
              <Label>Agentes Participantes</Label>
              <AgentMultiSelect
                value={roundRobinAgents}
                onChange={setRoundRobinAgents}
                sectorId={selectedSectorId || undefined}
                instanceId={!selectedSectorId ? selectedInstanceId : undefined}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {rule ? "Salvar Alterações" : "Criar Regra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
