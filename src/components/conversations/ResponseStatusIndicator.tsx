import { Circle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ResponseStatusIndicatorProps {
  isLastMessageFromMe: boolean | null | undefined;
  conversationStatus?: string;
}

export function ResponseStatusIndicator({ 
  isLastMessageFromMe, 
  conversationStatus 
}: ResponseStatusIndicatorProps) {
  // Não mostrar indicador se a conversa está encerrada
  if (conversationStatus === 'archived' || conversationStatus === 'closed') {
    return null;
  }

  if (isLastMessageFromMe === null || isLastMessageFromMe === undefined) {
    return null;
  }

  const isWaitingForClient = isLastMessageFromMe === true;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Circle
            className={`h-2 w-2 shrink-0 ${
              isWaitingForClient
                ? 'fill-green-500 text-green-500'
                : 'fill-red-500 text-red-500'
            }`}
          />
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">
            {isWaitingForClient
              ? 'Aguardando resposta do cliente'
              : 'Aguardando resposta do CS'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
