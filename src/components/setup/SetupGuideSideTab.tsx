import { Rocket, X } from "lucide-react";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SetupGuideSideTabProps {
  onClick: () => void;
  onClose: () => void;
}

export const SetupGuideSideTab = ({ onClick, onClose }: SetupGuideSideTabProps) => {
  const { totalProgress, remainingSteps } = useSetupProgress();

  // Hide when setup is 100% complete
  if (totalProgress === 100) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed right-0 bottom-4 z-50",
        "flex items-center gap-2 py-2 px-2.5",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90",
        "transition-all duration-200",
        "shadow-lg rounded-l-lg",
        "[writing-mode:vertical-rl]"
      )}
      title={`${remainingSteps} passos restantes`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="hover:bg-primary-foreground/20 rounded p-0.5 transition-colors"
        title="Ocultar temporariamente"
      >
        <X className="h-3 w-3" />
      </button>
      <Rocket className="h-3.5 w-3.5" />
      <span className="font-medium text-xs whitespace-nowrap">
        Guia de Setup
      </span>
      <Badge 
        variant="secondary" 
        className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 text-xs px-1.5 py-0.5"
      >
        {remainingSteps}
      </Badge>
    </button>
  );
};
