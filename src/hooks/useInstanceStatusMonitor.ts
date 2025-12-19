import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type WhatsAppInstance = Tables<'whatsapp_instances'>;

export const useInstanceStatusMonitor = () => {
  const [disconnectedInstances, setDisconnectedInstances] = useState<WhatsAppInstance[]>([]);

  useEffect(() => {
    // Initial fetch of disconnected instances
    const fetchDisconnectedInstances = async () => {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('status', 'disconnected');

      if (data) {
        setDisconnectedInstances(data);
      }
    };

    fetchDisconnectedInstances();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('instance-status-monitor')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances',
        },
        (payload) => {
          const newData = payload.new as WhatsAppInstance;
          const oldData = payload.old as WhatsAppInstance;

          // Detect disconnection
          if (newData.status === 'disconnected' && oldData.status !== 'disconnected') {
            toast({
              title: "⚠️ Instância Desconectada",
              description: `A instância "${newData.name}" foi desconectada.`,
              variant: "destructive",
            });

            // Add to disconnected list
            setDisconnectedInstances((prev) => [...prev, newData]);

            // Try to send web notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Instância WhatsApp Desconectada', {
                body: `A instância "${newData.name}" foi desconectada.`,
                icon: '/favicon.ico',
              });
            }
          }

          // Detect reconnection
          if (newData.status === 'connected' && oldData.status === 'disconnected') {
            toast({
              title: "✅ Instância Reconectada",
              description: `A instância "${newData.name}" foi reconectada com sucesso.`,
            });

            // Remove from disconnected list
            setDisconnectedInstances((prev) => 
              prev.filter((inst) => inst.id !== newData.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    disconnectedInstances,
    hasDisconnected: disconnectedInstances.length > 0,
  };
};
