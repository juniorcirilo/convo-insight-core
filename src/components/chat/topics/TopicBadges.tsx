import { Badge } from '@/components/ui/badge';
import { Tag } from 'lucide-react';
import { CONVERSATION_TOPICS, TOPIC_COLORS } from '@/constants/conversationTopics';

interface TopicBadgesProps {
  topics?: string[];
  size?: 'sm' | 'default';
  showIcon?: boolean;
  maxTopics?: number;
}

const getTopicColor = (topic: string): string => {
  return TOPIC_COLORS[topic] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
};

const getTopicLabel = (topic: string): string => {
  return CONVERSATION_TOPICS[topic as keyof typeof CONVERSATION_TOPICS] 
    || topic.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function TopicBadges({ 
  topics, 
  size = 'default',
  showIcon = false,
  maxTopics = 3
}: TopicBadgesProps) {
  if (!topics || topics.length === 0) return null;

  const displayTopics = topics.slice(0, maxTopics);
  const remaining = topics.length - maxTopics;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {showIcon && (
        <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
      )}
      {displayTopics.map((topic, index) => (
        <Badge
          key={index}
          variant="secondary"
          className={`${getTopicColor(topic)} ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}
        >
          {getTopicLabel(topic)}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge
          variant="secondary"
          className={`bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}
        >
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
