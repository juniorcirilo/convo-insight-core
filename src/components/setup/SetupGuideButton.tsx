import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";
import { useSetupProgress } from "@/hooks/useSetupProgress";

interface SetupGuideButtonProps {
  onClick: () => void;
}

export const SetupGuideButton = ({ onClick }: SetupGuideButtonProps) => {
  const { remainingSteps, totalProgress } = useSetupProgress();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="relative"
    >
      <Rocket className="h-4 w-4 mr-2" />
      <span className="hidden sm:inline">Guia de Setup</span>
      <span className="sm:hidden">Setup</span>
      {remainingSteps > 0 && (
        <Badge 
          variant="secondary" 
          className="ml-2 bg-primary text-primary-foreground hover:bg-primary"
        >
          {remainingSteps}
        </Badge>
      )}
      {totalProgress === 100 && (
        <span className="ml-2">🎉</span>
      )}
    </Button>
  );
};
