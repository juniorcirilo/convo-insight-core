import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SmartReplySuggestion } from "@/hooks/whatsapp/useSmartReply";

interface SmartReplySuggestionsProps {
  suggestions: SmartReplySuggestion[];
  isLoading: boolean;
  isRefreshing: boolean;
  onSelectSuggestion: (text: string) => void;
  onRefresh: () => void;
}

const toneConfig = {
  formal: {
    label: 'Formal',
    borderColor: 'border-blue-500/50',
    badgeClass: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  friendly: {
    label: 'Amigável',
    borderColor: 'border-green-500/50',
    badgeClass: 'bg-green-500 text-white hover:bg-green-600',
  },
  direct: {
    label: 'Direto',
    borderColor: 'border-orange-500/50',
    badgeClass: 'bg-orange-500 text-white hover:bg-orange-600',
  }
};

export const SmartReplySuggestions = ({
  suggestions,
  isLoading,
  isRefreshing,
  onSelectSuggestion,
  onRefresh,
}: SmartReplySuggestionsProps) => {
  // Não renderizar se não houver sugestões e não estiver carregando
  if (!isLoading && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-card/50 p-2">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-xs font-medium text-foreground">Sugestões IA</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          className="ml-auto h-7 w-7 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Sparkles className="h-3 w-3" />
          <span>Gerando sugestões...</span>
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-1">
            {suggestions.map((suggestion, index) => {
              const config = toneConfig[suggestion.tone];
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => onSelectSuggestion(suggestion.text)}
                        className={`w-[170px] flex-shrink-0 p-2 rounded-lg cursor-pointer border-2 ${config.borderColor} bg-background hover:bg-accent/30 transition-colors`}
                      >
                        <Badge className={`text-[10px] ${config.badgeClass}`}>
                          {config.label}
                        </Badge>
                        <p className="mt-1 text-sm text-foreground line-clamp-1 whitespace-normal break-words overflow-hidden">
                          {suggestion.text}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">{suggestion.text}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
};
