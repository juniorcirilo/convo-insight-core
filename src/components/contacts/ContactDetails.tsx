import { useContactDetails } from '@/hooks/whatsapp/useContactDetails';
import { ContactHeader } from './ContactHeader';
import { ContactMetrics } from './ContactMetrics';
import { ContactConversationHistory } from './ContactConversationHistory';
import { ContactTopicsChart } from './ContactTopicsChart';
import { ContactSentimentEvolution } from './ContactSentimentEvolution';
import { ContactSummaries } from './ContactSummaries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface ContactDetailsProps {
  contactId: string;
}

export function ContactDetails({ contactId }: ContactDetailsProps) {
  const { data: contactDetails, isLoading } = useContactDetails(contactId);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contactDetails) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Erro ao carregar detalhes do contato
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <ContactHeader contact={contactDetails.contact} />
        <ContactMetrics metrics={contactDetails.metrics} />
        <ContactSentimentEvolution sentimentHistory={contactDetails.sentimentHistory} />
        <ContactTopicsChart topicsDistribution={contactDetails.topicsDistribution} />
        <ContactConversationHistory conversations={contactDetails.conversations} />
        <ContactSummaries summaries={contactDetails.summaries} />
      </div>
    </ScrollArea>
  );
}
