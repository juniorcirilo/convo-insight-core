import { useState } from 'react';
import { MoreVertical, Edit, Archive, Download, CheckCircle, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EditContactModal } from './EditContactModal';
import { useWhatsAppActions } from '@/hooks/whatsapp/useWhatsAppActions';
import { exportConversation } from '@/utils/exportConversation';
import { toast } from 'sonner';

interface ChatHeaderMenuProps {
  conversation: any;
  onRefresh?: () => void;
}

export function ChatHeaderMenu({ conversation, onRefresh }: ChatHeaderMenuProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [generateSummary, setGenerateSummary] = useState(true);

  const { 
    archiveConversation, 
    closeConversation, 
    reopenConversation, 
    isArchiving, 
    isClosing, 
    isReopening 
  } = useWhatsAppActions();

  const handleArchive = () => {
    archiveConversation(conversation.id, {
      onSuccess: () => onRefresh?.(),
    });
  };

  const handleClose = () => {
    closeConversation(
      { conversationId: conversation.id, generateSummary },
      {
        onSuccess: () => {
          setShowCloseDialog(false);
          onRefresh?.();
        },
      }
    );
  };

  const handleReopen = () => {
    reopenConversation(conversation.id, {
      onSuccess: () => onRefresh?.(),
    });
  };

  const handleExport = async () => {
    try {
      await exportConversation(conversation.id);
      toast.success('Conversa exportada com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar conversa');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-background z-50">
          <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar contato
          </DropdownMenuItem>

          {conversation.status === 'closed' ? (
            <DropdownMenuItem onClick={handleReopen} disabled={isReopening}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reabrir conversa
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowCloseDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Encerrar conversa
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
            <Archive className="mr-2 h-4 w-4" />
            Arquivar conversa
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar conversa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditContactModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        contactId={conversation.contact.id}
        contactName={conversation.contact.name || ''}
        contactPhone={conversation.contact.phone_number}
        contactNotes={conversation.contact.notes}
        onSuccess={onRefresh}
      />

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa será marcada como concluída e você poderá visualizá-la 
              nos filtros de conversas encerradas.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox 
              id="summary" 
              checked={generateSummary}
              onCheckedChange={(checked) => setGenerateSummary(checked as boolean)}
            />
            <label 
              htmlFor="summary" 
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Gerar resumo automático com IA (recomendado)
            </label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isClosing}>
              {isClosing ? 'Encerrando...' : 'Encerrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
