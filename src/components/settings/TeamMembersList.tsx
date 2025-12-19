import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { TeamMemberRow } from "./TeamMemberRow";
import { InviteMemberDialog } from "./InviteMemberDialog";

export const TeamMembersList = () => {
  const { members, isLoading } = useTeamManagement();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando membros...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Membros da Equipe</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os membros, roles e permissões
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Convidar Membro
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>Role / Status Aprovação</TableHead>
              <TableHead>Status Presença</TableHead>
              <TableHead>Conversas Ativas</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TeamMemberRow key={member.id} member={member} />
            ))}
          </TableBody>
        </Table>
      </div>

      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
    </div>
  );
};
