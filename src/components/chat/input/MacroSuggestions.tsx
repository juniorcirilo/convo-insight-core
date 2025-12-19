import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { ScrollArea } from "@/components/ui/scroll-area";

type Macro = Tables<'whatsapp_macros'>;

interface MacroSuggestionsProps {
  macros: Macro[];
  onSelect: (macro: Macro) => void;
}

export const MacroSuggestions = ({ macros, onSelect }: MacroSuggestionsProps) => {
  if (macros.length === 0) return null;

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className="absolute bottom-full left-0 right-0 mb-2 border shadow-lg bg-card">
      <ScrollArea className="max-h-64">
        <div className="p-2">
          {macros.map((macro) => (
            <button
              key={macro.id}
              onClick={() => onSelect(macro)}
              className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{macro.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {macro.shortcut}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {truncate(macro.content, 100)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
