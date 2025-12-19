import { Settings2, Trash2, Users, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { AssignmentRule } from "@/hooks/whatsapp/useAssignmentRules";
import { useWhatsAppInstances } from "@/hooks/whatsapp";
import { useAgents } from "@/hooks/useAgents";

interface AssignmentRuleCardProps {
  rule: AssignmentRule;
  onEdit: (rule: AssignmentRule) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function AssignmentRuleCard({
  rule,
  onEdit,
  onDelete,
  onToggleActive,
}: AssignmentRuleCardProps) {
  const { instances = [] } = useWhatsAppInstances();
  const { agents = [] } = useAgents();

  const instance = instances.find((i) => i.id === rule.instance_id);
  const fixedAgent = rule.fixed_agent_id
    ? agents.find((a) => a.id === rule.fixed_agent_id)
    : null;
  const roundRobinAgentsList = rule.round_robin_agents
    .map((id) => agents.find((a) => a.id === id))
    .filter(Boolean);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{rule.name}</h3>
            <Badge variant={rule.is_active ? "default" : "secondary"}>
              {rule.is_active ? "Ativa" : "Inativa"}
            </Badge>
          </div>
          
          {instance && (
            <p className="text-sm text-muted-foreground">
              Instância: {instance.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={rule.is_active}
            onCheckedChange={(checked) => onToggleActive(rule.id, checked)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {rule.rule_type === 'fixed' ? (
          <>
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Atribuição Fixa:</span>
            <span className="font-medium">
              {fixedAgent ? fixedAgent.full_name : "Agente não encontrado"}
            </span>
          </>
        ) : (
          <>
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Round-Robin:</span>
            <span className="font-medium">
              {roundRobinAgentsList.length} agente(s)
            </span>
          </>
        )}
      </div>

      {rule.rule_type === 'round_robin' && roundRobinAgentsList.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {roundRobinAgentsList.map((agent) => (
            <Badge key={agent?.id} variant="outline" className="text-xs">
              {agent?.full_name}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(rule)}
          className="flex-1"
        >
          <Settings2 className="h-3 w-3 mr-1" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(rule.id)}
          className="flex-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Excluir
        </Button>
      </div>
    </Card>
  );
}
