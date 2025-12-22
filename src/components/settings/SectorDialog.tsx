import { useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWhatsAppInstances } from "@/hooks/whatsapp";
import { useSectors, type SectorWithInstance } from "@/hooks/useSectors";

interface SectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sector?: SectorWithInstance;
}

interface FormData {
  name: string;
  description: string;
  instance_id: string;
  is_default: boolean;
}

export function SectorDialog({
  open,
  onOpenChange,
  sector,
}: SectorDialogProps) {
  const { instances = [] } = useWhatsAppInstances();
  const { createSector, updateSector } = useSectors();

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      instance_id: "",
      is_default: false,
    },
  });

  useEffect(() => {
    if (sector) {
      reset({
        name: sector.name,
        description: sector.description || "",
        instance_id: sector.instance_id,
        is_default: sector.is_default,
      });
    } else {
      reset({
        name: "",
        description: "",
        instance_id: instances[0]?.id || "",
        is_default: false,
      });
    }
  }, [sector, instances, reset]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      instance_id: data.instance_id,
      is_default: data.is_default,
      is_active: true,
    };

    if (sector) {
      await updateSector.mutateAsync({ id: sector.id, ...payload });
    } else {
      await createSector.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {sector ? "Editar Setor" : "Novo Setor"}
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes do setor para organizar sua equipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Setor</Label>
            <Input
              id="name"
              placeholder="Ex: Suporte, Vendas, Financeiro"
              {...register("name", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito deste setor..."
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance">Instância</Label>
            <Select
              value={watch("instance_id")}
              onValueChange={(value) => setValue("instance_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar instância..." />
              </SelectTrigger>
              <SelectContent>
                {instances.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_default">Setor Padrão</Label>
              <p className="text-xs text-muted-foreground">
                Novas conversas serão atribuídas a este setor automaticamente
              </p>
            </div>
            <Switch
              id="is_default"
              checked={watch("is_default")}
              onCheckedChange={(checked) => setValue("is_default", checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createSector.isPending || updateSector.isPending}
            >
              {sector ? "Salvar Alterações" : "Criar Setor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
