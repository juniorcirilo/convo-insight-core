import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAgents } from "@/hooks/useAgents";

interface AgentMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function AgentMultiSelect({ value, onChange }: AgentMultiSelectProps) {
  const { agents = [] } = useAgents();

  const selectedAgents = agents.filter(agent => value.includes(agent.id));

  const toggleAgent = (agentId: string) => {
    if (value.includes(agentId)) {
      onChange(value.filter(id => id !== agentId));
    } else {
      onChange([...value, agentId]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-start"
          >
            {selectedAgents.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {selectedAgents.map((agent) => (
                  <Badge key={agent.id} variant="secondary" className="text-xs">
                    {agent.full_name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Selecionar agentes...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar agente..." />
            <CommandEmpty>Nenhum agente encontrado.</CommandEmpty>
            <CommandGroup>
              {agents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  value={agent.id}
                  onSelect={() => toggleAgent(agent.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(agent.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {agent.full_name}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {agent.role}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedAgents.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedAgents.length} agente(s) selecionado(s)
        </p>
      )}
    </div>
  );
}
