import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstancesList, AddInstanceDialog, TeamMembersList, AssignmentRulesManager, InstanceSetupCollapsible, SetupGuideCollapsible, SecuritySettings, WebhooksManager, ApiTokensManager, SectorsManager } from "@/components/settings";
import { MacrosManager } from "@/components/macros";
import { CampaignsManager } from "@/components/campaigns";
import { useAuth } from "@/contexts/AuthContext";
const WhatsAppSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { isAdmin } = useAuth();
  
  const currentTab = searchParams.get('tab') || 'setup';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link to="/whatsapp">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para WhatsApp
            </Button>
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Configurações do WhatsApp
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas instâncias e automações
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="instances">Instâncias</TabsTrigger>
            <TabsTrigger value="sectors">Setores</TabsTrigger>
            <TabsTrigger value="macros">Macros</TabsTrigger>
            <TabsTrigger value="assignment">Atribuição</TabsTrigger>
            {isAdmin && <TabsTrigger value="campaigns">Campanhas</TabsTrigger>}
            {isAdmin && <TabsTrigger value="webhooks">Webhooks</TabsTrigger>}
            {isAdmin && <TabsTrigger value="api">API</TabsTrigger>}
            {isAdmin && <TabsTrigger value="team">Equipe</TabsTrigger>}
            {isAdmin && <TabsTrigger value="security">Segurança</TabsTrigger>}
          </TabsList>

          <TabsContent value="setup" className="mt-6">
            <SetupGuideCollapsible />
          </TabsContent>

          <TabsContent value="instances" className="space-y-4 mt-6">
            <InstanceSetupCollapsible 
              onOpenAddDialog={() => setShowAddDialog(true)}
            />
            
            <div className="flex justify-end">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Instância
              </Button>
            </div>
            <InstancesList />
          </TabsContent>

          <TabsContent value="sectors" className="mt-6">
            <SectorsManager />
          </TabsContent>

          <TabsContent value="macros" className="mt-6">
            <MacrosManager />
          </TabsContent>

          <TabsContent value="assignment" className="mt-6">
            <AssignmentRulesManager />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="campaigns" className="mt-6">
              <CampaignsManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="webhooks" className="mt-6">
              <WebhooksManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="api" className="mt-6">
              <ApiTokensManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="team" className="mt-6">
              <TeamMembersList />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="security" className="mt-6">
              <SecuritySettings />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Add Instance Dialog */}
      <AddInstanceDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
};

export default WhatsAppSettings;
