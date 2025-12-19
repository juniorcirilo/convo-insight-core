import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SetupStep } from "@/hooks/useSetupProgress";

interface SetupStepCardProps {
  step: SetupStep;
  onAction?: () => void;
}

export const SetupStepCard = ({ step, onAction }: SetupStepCardProps) => {
  const Icon = step.icon;

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border transition-colors",
        step.completed 
          ? "bg-primary/5 border-primary/20" 
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5">
          {step.completed ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h4 className={cn(
                "font-medium text-sm",
                step.completed && "text-muted-foreground"
              )}>
                {step.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {step.description}
              </p>
            </div>
          </div>

          {/* Action Button */}
          {step.actionLabel && !step.completed && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAction}
              className="w-full"
            >
              {step.actionLabel}
            </Button>
          )}

          {/* Completed Badge */}
          {step.completed && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <CheckCircle2 className="h-3 w-3" />
              <span>Concluído</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
