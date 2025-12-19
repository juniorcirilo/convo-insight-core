import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWhatsAppActions } from '@/hooks/whatsapp/useWhatsAppActions';

interface EditContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactNotes?: string | null;
  onSuccess?: () => void;
}

interface ContactFormData {
  name: string;
  notes: string;
}

export function EditContactModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactPhone,
  contactNotes,
  onSuccess,
}: EditContactModalProps) {
  const { updateContact, isUpdatingContact } = useWhatsAppActions();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    defaultValues: { 
      name: contactName, 
      notes: contactNotes || '' 
    },
  });

  useEffect(() => {
    if (open) {
      reset({ 
        name: contactName, 
        notes: contactNotes || '' 
      });
    }
  }, [open, contactName, contactNotes, reset]);

  const onSubmit = (data: ContactFormData) => {
    updateContact(
      { contactId, data: { name: data.name, notes: data.notes || null } },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={contactPhone} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...register('name', { 
                  required: 'Nome é obrigatório',
                  minLength: { value: 2, message: 'Nome deve ter pelo menos 2 caracteres' }
                })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Adicione observações sobre este contato..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdatingContact}>
              {isUpdatingContact ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
