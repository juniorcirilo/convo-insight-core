import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sparkles,
  Maximize2,
  RefreshCw,
  User,
  Smile,
  Briefcase,
  CheckCircle2,
  Languages,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useWhatsAppComposer, type ComposerAction } from '@/hooks/whatsapp/useWhatsAppComposer';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface AIComposerButtonProps {
  message: string;
  onComposed: (newMessage: string) => void;
  disabled?: boolean;
}

interface MenuItem {
  id: ComposerAction;
  label: string;
  icon: any;
  submenu?: { lang: string; label: string }[];
}

const menuOptions: MenuItem[] = [
  { id: 'expand', label: 'Expandir', icon: Maximize2 },
  { id: 'rephrase', label: 'Reformular', icon: RefreshCw },
  { id: 'my_tone', label: 'Meu tom de voz', icon: User },
  { id: 'friendly', label: 'Mais amigável', icon: Smile },
  { id: 'formal', label: 'Mais formal', icon: Briefcase },
  { id: 'fix_grammar', label: 'Corrigir gramática', icon: CheckCircle2 },
  {
    id: 'translate',
    label: 'Traduzir para...',
    icon: Languages,
    submenu: [
      { lang: 'en', label: 'Inglês' },
      { lang: 'es', label: 'Espanhol' },
      { lang: 'fr', label: 'Francês' },
      { lang: 'de', label: 'Alemão' },
      { lang: 'it', label: 'Italiano' }
    ]
  }
];

export function AIComposerButton({ message, onComposed, disabled }: AIComposerButtonProps) {
  const [open, setOpen] = useState(false);
  const [showTranslateSubmenu, setShowTranslateSubmenu] = useState(false);
  const { compose, isComposing } = useWhatsAppComposer();

  const handleAction = async (action: ComposerAction, targetLanguage?: string) => {
    if (!message.trim()) return;

    try {
      const result = await compose({ message, action, targetLanguage });
      onComposed(result.composed);
      setOpen(false);
      setShowTranslateSubmenu(false);
    } catch (error) {
      // Error handling done in hook
    }
  };

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setShowTranslateSubmenu(false);
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || !message.trim() || isComposing}
          className="h-9 w-9"
        >
          {isComposing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {isComposing ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando com IA...
          </div>
        ) : showTranslateSubmenu ? (
          <div className="space-y-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowTranslateSubmenu(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors justify-start"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Separator />
            {menuOptions.find(o => o.id === 'translate')?.submenu?.map((lang) => (
              <Button
                key={lang.lang}
                type="button"
                variant="ghost"
                onClick={() => handleAction('translate', lang.lang)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors justify-start"
              >
                <Languages className="h-4 w-4" />
                {lang.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {menuOptions.map((option, index) => (
              <div key={option.id}>
                {/* Separadores visuais */}
                {index === 2 && <Separator className="my-1" />}
                {index === 5 && <Separator className="my-1" />}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (option.submenu) {
                      setShowTranslateSubmenu(true);
                    } else {
                      handleAction(option.id);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors",
                    option.submenu ? "justify-between" : "justify-start"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                  {option.submenu && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
