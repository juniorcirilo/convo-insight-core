import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

const setPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirme a senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
}

export function ResetPasswordModal({ open, onOpenChange, member }: ResetPasswordModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'direct'>('email');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
  });

  const handleSendResetEmail = async () => {
    if (!member?.email) {
      toast.error('Usuário não possui email cadastrado');
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error('Erro ao enviar email: ' + error.message);
      } else {
        setEmailSent(true);
        toast.success('Email de recuperação enviado');
      }
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPassword = async (data: SetPasswordFormData) => {
    if (!member) return;

    setIsLoading(true);

    try {
      // Use admin API to update user password via edge function
      const { data: result, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { 
          userId: member.id,
          newPassword: data.password 
        }
      });

      if (error) {
        toast.error('Erro ao definir senha: ' + error.message);
      } else if (result?.error) {
        toast.error('Erro ao definir senha: ' + result.error);
      } else {
        setPasswordSet(true);
        toast.success('Senha definida com sucesso');
      }
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Erro ao definir senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmailSent(false);
    setPasswordSet(false);
    setActiveTab('email');
    reset();
    onOpenChange(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            Redefinir senha de <strong>{member.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        {(emailSent || passwordSet) ? (
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {emailSent 
                  ? 'O email de recuperação foi enviado para o usuário.'
                  : 'A nova senha foi definida com sucesso.'}
              </p>
              {emailSent && (
                <p className="text-xs text-muted-foreground">
                  O usuário receberá um link para criar uma nova senha.
                </p>
              )}
              {passwordSet && (
                <p className="text-xs text-muted-foreground">
                  Informe a nova senha ao usuário de forma segura.
                </p>
              )}
            </div>
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'email' | 'direct')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Enviar Email</TabsTrigger>
              <TabsTrigger value="direct">Definir Senha</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 pt-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Um email será enviado para <strong>{member.email || 'N/A'}</strong> com um link para o usuário criar uma nova senha.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSendResetEmail} 
                  disabled={isLoading || !member.email}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar email'
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="direct" className="space-y-4 pt-4">
              <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...register('password')}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-confirm-password">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...register('confirmPassword')}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Definindo...
                      </>
                    ) : (
                      'Definir senha'
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
