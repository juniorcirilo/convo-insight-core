import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Inbox, User } from "lucide-react";

type FilterType = "all" | "unread" | "waiting" | "queue" | "mine";

interface QuickFilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  unreadCount?: number;
  waitingCount?: number;
  queueCount?: number;
  myConversationsCount?: number;
}

const QuickFilterPills = ({ 
  activeFilter, 
  onFilterChange,
  unreadCount = 0,
  waitingCount = 0,
  queueCount = 0,
  myConversationsCount = 0
}: QuickFilterPillsProps) => {
  const filters: { value: FilterType; label: string; count?: number; icon?: any }[] = [
    { value: "all", label: "Todas" },
    { value: "unread", label: "Não lidas", count: unreadCount },
    { value: "waiting", label: "Aguardando", count: waitingCount, icon: Clock },
    { value: "queue", label: "Na Fila", count: queueCount, icon: Inbox },
    { value: "mine", label: "Minhas", count: myConversationsCount, icon: User },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto flex-nowrap pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;

        return (
          <Button
            key={filter.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
            className={`
              h-8 px-2 text-xs font-medium rounded-full transition-colors whitespace-nowrap flex-shrink-0
              ${
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-sidebar-accent text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/80"
              }
            `}
          >
            {filter.label}
            {filter.count !== undefined && filter.count > 0 && (
              <Badge
                variant={isActive ? "secondary" : "default"}
                className="ml-1.5 h-4 px-1 text-xs"
              >
                {filter.count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default QuickFilterPills;
