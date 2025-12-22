import { useState } from "react";
import { UserPlus, Star, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserSectors } from "@/hooks/useUserSectors";
import { useAgents } from "@/hooks/useAgents";
import type { SectorWithInstance } from "@/hooks/useSectors";

interface SectorMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sector: SectorWithInstance;
}

export function SectorMembersDialog({
  open,
  onOpenChange,
  sector,
}: SectorMembersDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  
  const { userSectors, addUserToSector, removeUserFromSector, setPrimarySector, isLoading } = useUserSectors(sector.id);
  const { agents } = useAgents();

  // Filter out agents already in this sector
  const availableAgents = agents.filter(
    agent => !userSectors.some(us => us.user_id === agent.id)
  );

  const handleAddUser = async () => {
    if (selectedUserId) {
      await addUserToSector.mutateAsync({ 
        userId: selectedUserId, 
        sectorId: sector.id 
      });
      setSelectedUserId("");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    await removeUserFromSector.mutateAsync({ 
      userId, 
      sectorId: sector.id 
    });
  };

  const handleSetPrimary = async (userId: string) => {
    await setPrimarySector.mutateAsync({ 
      userId, 
      sectorId: sector.id 
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Membros do Setor: {sector.name}</DialogTitle>
          <DialogDescription>
            Gerencie os usuários que pertencem a este setor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add member section */}
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar usuário..." />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    Todos os usuários já estão neste setor
                  </SelectItem>
                ) : (
                  availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddUser} 
              disabled={!selectedUserId || addUserToSector.isPending}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Members list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {userSectors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum membro neste setor
              </div>
            ) : (
              userSectors.map((userSector) => (
                <div
                  key={userSector.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="text-xs">
                        {getInitials(userSector.user_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {userSector.user_name}
                        </span>
                        {userSector.is_primary && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {userSector.user_email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!userSector.is_primary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetPrimary(userSector.user_id)}
                        title="Definir como setor principal"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveUser(userSector.user_id)}
                      title="Remover do setor"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
