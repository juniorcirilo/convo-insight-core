import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TeamMember, useTeamManagement } from "@/hooks/useTeamManagement";

interface DeactivateMemberDialogProps {
  member: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeactivateMemberDialog = ({ member, open, onOpenChange }: DeactivateMemberDialogProps) => {
  const { toggleActive, isTogglingActive } = useTeamManagement();

  const handleConfirm = async () => {
    await toggleActive({ userId: member.id, isActive: !member.is_active });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {member.is_active ? 'Desativar' : 'Ativar'} {member.full_name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {member.is_active ? (
              <>
                Este membro não poderá mais acessar o sistema. Suas conversas atribuídas
                permanecerão intactas, mas ele não receberá novas atribuições.
                <br /><br />
                Você pode reativar este membro a qualquer momento.
              </>
            ) : (
              <>
                Este membro poderá voltar a acessar o sistema normalmente e receberá
                novas atribuições de conversas.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isTogglingActive}>
            {isTogglingActive ? 'Processando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
