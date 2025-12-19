import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';

interface QueueIndicatorProps {
  assignedTo?: string | null;
  assignedToName?: string;
  size?: 'sm' | 'default';
}

export function QueueIndicator({ assignedTo, assignedToName, size = 'default' }: QueueIndicatorProps) {
  const isInQueue = !assignedTo;
  
  if (isInQueue) {
    return (
      <Badge 
        variant="outline" 
        className={`
          bg-yellow-500/10 text-yellow-700 border-yellow-500/20
          dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20
          ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : ''}
        `}
      >
        <Clock className={size === 'sm' ? 'h-2.5 w-2.5 mr-1' : 'h-3 w-3 mr-1'} />
        Na Fila
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`
        bg-green-500/10 text-green-700 border-green-500/20
        dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20
        ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : ''}
      `}
    >
      <User className={size === 'sm' ? 'h-2.5 w-2.5 mr-1' : 'h-3 w-3 mr-1'} />
      {assignedToName ? assignedToName.split(' ')[0] : 'Atribuído'}
    </Badge>
  );
}
