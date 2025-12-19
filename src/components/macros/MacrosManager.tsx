import { useState } from "react";
import { Plus, Pencil, Trash2, Copy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhatsAppMacros } from "@/hooks/whatsapp/useWhatsAppMacros";
import { MacroDialog } from "./MacroDialog";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Macro = Tables<'whatsapp_macros'>;

interface MacrosManagerProps {
  instanceId?: string;
}

export const MacrosManager = ({ instanceId }: MacrosManagerProps) => {
  const {
    macros,
    isLoading,
    createMacro,
    updateMacro,
    deleteMacro,
    isCreating,
    isUpdating,
  } = useWhatsAppMacros(instanceId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [macroToDelete, setMacroToDelete] = useState<string | null>(null);

  const handleCreate = (data: any) => {
    createMacro(data);
    setDialogOpen(false);
  };

  const handleEdit = (macro: Macro) => {
    setEditingMacro(macro);
    setDialogOpen(true);
  };

  const handleUpdate = (data: any) => {
    if (editingMacro) {
      updateMacro({ id: editingMacro.id, updates: data });
      setDialogOpen(false);
      setEditingMacro(undefined);
    }
  };

  const handleDeleteClick = (id: string) => {
    setMacroToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (macroToDelete) {
      deleteMacro(macroToDelete);
      setDeleteDialogOpen(false);
      setMacroToDelete(null);
    }
  };

  const handleCopyShortcut = (shortcut: string) => {
    navigator.clipboard.writeText(`/macro:${shortcut}`);
    toast.success('Atalho copiado!');
  };

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Macros (Respostas Rápidas)</h2>
          <p className="text-muted-foreground">
            Use /macro:atalho no chat para inserir uma resposta rápida
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Macro
        </Button>
      </div>

      {macros.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Zap className="h-16 w-16 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Nenhuma macro criada</h3>
              <p className="text-muted-foreground mt-2">
                Crie sua primeira macro para começar a usar respostas rápidas
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Macro
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Atalho</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Usos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {macros.map((macro) => (
                <TableRow key={macro.id}>
                  <TableCell className="font-medium">{macro.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{macro.shortcut}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm text-muted-foreground">
                      {truncate(macro.content, 60)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{macro.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {macro.usage_count || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyShortcut(macro.shortcut)}
                        title="Copiar atalho"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(macro)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(macro.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <MacroDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingMacro(undefined);
        }}
        onSubmit={editingMacro ? handleUpdate : handleCreate}
        macro={editingMacro}
        instanceId={instanceId}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Macro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta macro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
