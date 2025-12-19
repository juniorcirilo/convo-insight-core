import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Save, X, MessageSquare } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ContactHeaderProps {
  contact: Tables<'whatsapp_contacts'>;
}

export function ContactHeader({ contact }: ContactHeaderProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(contact.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('whatsapp_contacts')
        .update({ notes })
        .eq('id', contact.id);

      if (error) throw error;

      toast.success('Notas atualizadas com sucesso');
      setIsEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ['contact-details', contact.id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao salvar notas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartConversation = () => {
    navigate(`/whatsapp?contact=${contact.id}`);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={contact.profile_picture_url || undefined} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{contact.name}</h2>
                <p className="text-muted-foreground">{contact.phone_number}</p>
              </div>
              <Button onClick={handleStartConversation}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Nova Conversa
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Notas</label>
                {!isEditingNotes ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotes(contact.notes || '');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  </div>
                )}
              </div>

              {isEditingNotes ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações sobre este contato..."
                  rows={3}
                  className="resize-none"
                />
              ) : (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md min-h-[80px]">
                  {contact.notes || 'Nenhuma nota adicionada'}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
