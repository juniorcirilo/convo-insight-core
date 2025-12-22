import { useState } from "react";
import { Plus, Building2, Users, Star, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSectors, type SectorWithInstance } from "@/hooks/useSectors";
import { useUserSectors } from "@/hooks/useUserSectors";
import { SectorDialog } from "./SectorDialog";
import { SectorMembersDialog } from "./SectorMembersDialog";
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

export function SectorsManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorWithInstance | undefined>();
  const [membersDialogSector, setMembersDialogSector] = useState<SectorWithInstance | undefined>();
  const [deletingSector, setDeletingSector] = useState<SectorWithInstance | undefined>();

  const { sectors, isLoading, deleteSector } = useSectors();
  const { userSectors } = useUserSectors();

  const handleCreate = () => {
    setEditingSector(undefined);
    setShowDialog(true);
  };

  const handleEdit = (sector: SectorWithInstance) => {
    setEditingSector(sector);
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (deletingSector) {
      await deleteSector.mutateAsync(deletingSector.id);
      setDeletingSector(undefined);
    }
  };

  const getMemberCount = (sectorId: string) => {
    return userSectors.filter(us => us.sector_id === sectorId).length;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Setores</h2>
            <p className="text-muted-foreground mt-1">
              Organize sua equipe em setores para melhor distribuição de conversas
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Setores</h2>
          <p className="text-muted-foreground mt-1">
            Organize sua equipe em setores para melhor distribuição de conversas
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Setor
        </Button>
      </div>

      {sectors.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Nenhum setor configurado
          </p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeiro Setor
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector) => (
            <Card key={sector.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{sector.name}</CardTitle>
                  </div>
                  {sector.is_default && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Padrão
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {sector.instance_name || 'Instância não definida'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sector.description && (
                  <p className="text-sm text-muted-foreground">
                    {sector.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{getMemberCount(sector.id)} membro(s)</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setMembersDialogSector(sector)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Membros
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(sector)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!sector.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingSector(sector)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SectorDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        sector={editingSector}
      />

      {membersDialogSector && (
        <SectorMembersDialog
          open={!!membersDialogSector}
          onOpenChange={(open) => !open && setMembersDialogSector(undefined)}
          sector={membersDialogSector}
        />
      )}

      <AlertDialog open={!!deletingSector} onOpenChange={(open) => !open && setDeletingSector(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Setor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o setor "{deletingSector?.name}"? 
              Os membros serão desvinculados e as conversas ficarão sem setor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
