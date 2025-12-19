import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignmentRuleCard } from "./AssignmentRuleCard";
import { AssignmentRuleDialog } from "./AssignmentRuleDialog";
import { useAssignmentRules, type AssignmentRule } from "@/hooks/whatsapp/useAssignmentRules";
import { Skeleton } from "@/components/ui/skeleton";

export function AssignmentRulesManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | undefined>();

  const {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    toggleRuleActive,
  } = useAssignmentRules();

  const handleCreate = () => {
    setEditingRule(undefined);
    setShowDialog(true);
  };

  const handleEdit = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setShowDialog(true);
  };

  const handleSave = (data: any) => {
    if (data.id) {
      updateRule.mutate(data);
    } else {
      createRule.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta regra?")) {
      deleteRule.mutate(id);
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleRuleActive.mutate({ id, is_active: isActive });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Regras de Atribuição</h2>
            <p className="text-muted-foreground mt-1">
              Configure a atribuição automática de conversas para agentes
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Regras de Atribuição</h2>
          <p className="text-muted-foreground mt-1">
            Configure a atribuição automática de conversas para agentes
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">
            Nenhuma regra de atribuição configurada
          </p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeira Regra
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <AssignmentRuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      <AssignmentRuleDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        rule={editingRule}
        onSave={handleSave}
      />
    </div>
  );
}
