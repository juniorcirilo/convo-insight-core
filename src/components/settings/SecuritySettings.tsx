import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { Shield, Trash2, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function SecuritySettings() {
  const { settings, isLoading, toggleRestriction, addDomain, removeDomain } = useSecuritySettings();
  const [newDomain, setNewDomain] = useState("");

  const handleAddDomain = () => {
    const domain = newDomain.trim();
    
    if (!domain) {
      toast.error("Digite um domínio válido");
      return;
    }

    // Validação básica de domínio
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const cleanDomain = domain.replace(/^@/, "");
    
    if (!domainRegex.test(cleanDomain)) {
      toast.error("Formato de domínio inválido");
      return;
    }

    addDomain.mutate(cleanDomain, {
      onSuccess: () => {
        setNewDomain("");
      },
    });
  };

  const handleRemoveDomain = (domain: string) => {
    removeDomain.mutate(domain);
  };

  const handleToggleRestriction = (checked: boolean) => {
    toggleRestriction.mutate({ enabled: checked, key: 'restrict_signup_by_domain' });
  };

  const handleToggleApproval = (checked: boolean) => {
    toggleRestriction.mutate({ enabled: checked, key: 'require_account_approval' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Segurança</CardTitle>
          </div>
          <CardDescription>
            Configure as políticas de segurança para cadastro de novos usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle de aprovação de contas */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="require-approval" className="text-base font-medium">
                Exigir Aprovação para Novas Contas
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, novos usuários precisarão de aprovação manual de um administrador para acessar o sistema
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={settings.requireApproval}
              onCheckedChange={handleToggleApproval}
              disabled={toggleRestriction.isPending}
            />
          </div>

          {/* Toggle de restrição de domínio */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="domain-restriction" className="text-base font-medium">
                Restrição de Domínio de Email
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, apenas emails de domínios específicos poderão se cadastrar
              </p>
            </div>
            <Switch
              id="domain-restriction"
              checked={settings.restrictEnabled}
              onCheckedChange={handleToggleRestriction}
              disabled={toggleRestriction.isPending}
            />
          </div>

          {/* Adicionar novo domínio */}
          {settings.restrictEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-domain">Adicionar Domínio Permitido</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-domain"
                    placeholder="empresa.com.br"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDomain();
                      }
                    }}
                    disabled={addDomain.isPending}
                  />
                  <Button
                    onClick={handleAddDomain}
                    disabled={addDomain.isPending || !newDomain.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite apenas o domínio (ex: empresa.com.br), sem @ ou espaços
                </p>
              </div>

              {/* Lista de domínios permitidos */}
              {settings.allowedDomains.length > 0 ? (
                <div className="space-y-2">
                  <Label>Domínios Permitidos</Label>
                  <div className="rounded-lg border divide-y">
                    {settings.allowedDomains.map((domain) => (
                      <div
                        key={domain}
                        className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                      >
                        <span className="font-mono text-sm">@{domain}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveDomain(domain)}
                          disabled={removeDomain.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum domínio configurado. Adicione pelo menos um domínio para ativar a restrição.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Alerta informativo */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> O primeiro usuário a se cadastrar (admin) sempre poderá
              criar uma conta, independente do domínio. Esta restrição só será aplicada aos cadastros
              subsequentes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
