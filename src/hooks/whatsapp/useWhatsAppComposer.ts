import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ComposerAction =
  | 'expand'
  | 'rephrase'
  | 'my_tone'
  | 'friendly'
  | 'formal'
  | 'fix_grammar'
  | 'translate';

interface ComposeParams {
  message: string;
  action: ComposerAction;
  targetLanguage?: string;
}

interface ComposeResponse {
  original: string;
  composed: string;
  action: string;
}

export function useWhatsAppComposer() {
  const composeMutation = useMutation({
    mutationFn: async ({ message, action, targetLanguage }: ComposeParams) => {
      const { data, error } = await supabase.functions.invoke(
        'compose-whatsapp-message',
        {
          body: { message, action, targetLanguage }
        }
      );

      if (error) {
        console.error('Compose error:', error);
        throw new Error(error.message || 'Failed to compose message');
      }

      if (!data?.composed) {
        throw new Error('No composed message received');
      }

      return data as ComposeResponse;
    },
    onError: (error: Error) => {
      console.error('Composition error:', error);

      if (error.message.includes('Rate limit')) {
        toast.error('Limite de uso atingido. Tente novamente em alguns minutos.');
      } else if (error.message.includes('Payment required')) {
        toast.error('Créditos insuficientes. Adicione créditos para usar IA.');
      } else {
        toast.error('Erro ao processar com IA. Tente novamente.');
      }
    },
  });

  return {
    compose: composeMutation.mutateAsync,
    isComposing: composeMutation.isPending,
  };
}
