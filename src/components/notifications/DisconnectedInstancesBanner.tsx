import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tables } from '@/integrations/supabase/types';

type WhatsAppInstance = Tables<'whatsapp_instances'>;

interface DisconnectedInstancesBannerProps {
  instances: WhatsAppInstance[];
}

export const DisconnectedInstancesBanner = ({ instances }: DisconnectedInstancesBannerProps) => {
  if (instances.length === 0) return null;

  const instanceNames = instances.map((inst) => inst.name).join(', ');
  const isSingle = instances.length === 1;

  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isSingle ? 'Instância Desconectada' : `${instances.length} Instâncias Desconectadas`}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {isSingle 
            ? `A instância "${instanceNames}" está desconectada.` 
            : `As instâncias ${instanceNames} estão desconectadas.`}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link to="/whatsapp/settings">
            Verificar Configurações →
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};
