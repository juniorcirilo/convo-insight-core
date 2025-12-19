import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone } from 'lucide-react';
import { useWhatsAppInstances } from '@/hooks/whatsapp';

interface InstanceFilterProps {
  selectedInstance: string | null;
  onInstanceChange: (instanceId: string | null) => void;
}

export function InstanceFilter({ selectedInstance, onInstanceChange }: InstanceFilterProps) {
  const { instances, isLoading } = useWhatsAppInstances();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Smartphone className="h-4 w-4" />
        Instância
      </label>
      <Select
        value={selectedInstance || 'all'}
        onValueChange={(value) => onInstanceChange(value === 'all' ? null : value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecionar instância" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Instâncias</SelectItem>
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Carregando...
            </SelectItem>
          ) : (
            instances?.map((instance) => (
              <SelectItem key={instance.id} value={instance.id}>
                {instance.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
