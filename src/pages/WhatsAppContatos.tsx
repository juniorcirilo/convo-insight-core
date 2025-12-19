import { useState } from 'react';
import { ContactsSidebar } from '@/components/contacts/ContactsSidebar';
import { ContactDetails } from '@/components/contacts/ContactDetails';
import { useInstanceStatusMonitor } from '@/hooks/useInstanceStatusMonitor';
import { DisconnectedInstancesBanner } from '@/components/notifications/DisconnectedInstancesBanner';

export default function WhatsAppContatos() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { disconnectedInstances } = useInstanceStatusMonitor();

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Disconnected Instances Banner */}
      <DisconnectedInstancesBanner instances={disconnectedInstances} />
      
      <div className="flex flex-1 overflow-hidden">
      <ContactsSidebar
        selectedContactId={selectedContactId}
        onSelectContact={setSelectedContactId}
      />
      
      <main className="flex-1 flex flex-col">
        {selectedContactId ? (
          <ContactDetails contactId={selectedContactId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Selecione um contato para ver os detalhes</p>
              <p className="text-sm mt-2">Histórico completo, métricas e análises de IA</p>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
