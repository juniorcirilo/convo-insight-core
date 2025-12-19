import { useState } from "react";
import { ShieldCheck, UserCog, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TeamMember, AppRole, useTeamManagement } from "@/hooks/useTeamManagement";

interface ChangeRoleDialogProps {
  member: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleOptions = [
  {
    value: 'admin' as AppRole,
    label: 'Admin',
    description: 'Acesso total ao sistema, pode gerenciar usuários e configurações',
    icon: ShieldCheck,
  },
  {
    value: 'supervisor' as AppRole,
    label: 'Supervisor',
    description: 'Pode visualizar todas as conversas e atribuir agentes',
    icon: UserCog,
  },
  {
    value: 'agent' as AppRole,
    label: 'Agent',
    description: 'Pode visualizar e responder apenas conversas atribuídas',
    icon: Users,
  },
];

export const ChangeRoleDialog = ({ member, open, onOpenChange }: ChangeRoleDialogProps) => {
  const [selectedRole, setSelectedRole] = useState<AppRole>(member.role);
  const { updateRole, isUpdatingRole } = useTeamManagement();

  const handleSubmit = async () => {
    if (selectedRole === member.role) {
      onOpenChange(false);
      return;
    }

    await updateRole({ userId: member.id, newRole: selectedRole });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Role de {member.full_name}</DialogTitle>
          <DialogDescription>
            Selecione o novo role para este membro. Esta ação afetará as permissões de acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
            <div className="space-y-3">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.value}
                    className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-accent"
                    onClick={() => setSelectedRole(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="flex items-center gap-2 cursor-pointer">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{option.label}</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdatingRole}>
            {isUpdatingRole ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
