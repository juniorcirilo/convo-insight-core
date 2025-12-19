import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

export const NotificationToggle = () => {
  const { permission, soundEnabled, toggleSound, requestPermission } = useNotifications();

  const handleClick = () => {
    if (permission === "default") {
      requestPermission();
    } else {
      toggleSound();
    }
  };

  const getTooltipText = () => {
    if (permission === "denied") {
      return "Notificações bloqueadas no navegador";
    }
    if (permission === "default") {
      return "Clique para ativar notificações";
    }
    return soundEnabled ? "Som ativado - Clique para desativar" : "Som desativado - Clique para ativar";
  };

  const getIcon = () => {
    if (permission === "default" || permission === "denied") {
      return <Bell className="h-4 w-4" />;
    }
    return soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className={permission === "denied" ? "text-destructive" : ""}
          >
            {getIcon()}
          </Button>
          {permission === "denied" && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-2 w-2 p-0 rounded-full"
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};
