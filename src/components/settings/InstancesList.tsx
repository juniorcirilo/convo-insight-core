import { useWhatsAppInstances } from "@/hooks/whatsapp";
import { InstanceCard } from "./InstanceCard";
import { Loader2 } from "lucide-react";

export const InstancesList = () => {
  const { instances, isLoading } = useWhatsAppInstances();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="text-6xl">📱</div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Nenhuma instância configurada</h3>
          <p className="text-muted-foreground max-w-md">
            Adicione sua primeira instância para começar a usar o WhatsApp.
          </p>
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          Primeira vez configurando? Veja nosso guia passo a passo para facilitar o processo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {instances.map((instance) => (
        <InstanceCard key={instance.id} instance={instance} />
      ))}
    </div>
  );
};
