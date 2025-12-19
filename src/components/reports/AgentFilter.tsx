import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgents } from '@/hooks/useAgents';

interface AgentFilterProps {
  selectedAgent: string | null;
  onAgentChange: (agentId: string | null) => void;
}

export function AgentFilter({ selectedAgent, onAgentChange }: AgentFilterProps) {
  const { agents, isLoading } = useAgents();

  return (
    <Select
      value={selectedAgent || 'all'}
      onValueChange={(value) => onAgentChange(value === 'all' ? null : value)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Todos os Agentes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os Agentes</SelectItem>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
