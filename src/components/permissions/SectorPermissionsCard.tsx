import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, Users, Info } from 'lucide-react';
import { useSectors } from '@/hooks/useSectors';
import { useUserSectors } from '@/hooks/useUserSectors';
import { usePermissionTypes } from '@/hooks/permissions';
import { useSectorPermissions } from '@/hooks/permissions/useSectorPermissions';

const SectorPermissionsCard = () => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');
  
  const { sectors, isLoading: isLoadingSectors } = useSectors();
  const { data: permissionTypes, isLoading: isLoadingTypes } = usePermissionTypes();
  const { sectorPermissions, setSectorPermission, initializeSectorPermissions, isSettingPermission } = useSectorPermissions(selectedSectorId);
  const { userSectors } = useUserSectors(selectedSectorId);

  // Auto-select first sector
  useEffect(() => {
    if (sectors.length > 0 && !selectedSectorId) {
      setSelectedSectorId(sectors[0].id);
    }
  }, [sectors, selectedSectorId]);

  // Initialize permissions if sector has none
  useEffect(() => {
    if (selectedSectorId && permissionTypes && sectorPermissions.length === 0) {
      initializeSectorPermissions({
        sectorId: selectedSectorId,
        permissionTypes: permissionTypes.map(pt => ({
          key: pt.key,
          default_for_agent: pt.default_for_agent,
        })),
      });
    }
  }, [selectedSectorId, permissionTypes, sectorPermissions.length, initializeSectorPermissions]);

  const selectedSector = sectors.find(s => s.id === selectedSectorId);
  
  const getPermissionValue = (key: string) => {
    const permission = sectorPermissions.find(sp => sp.permission_key === key);
    if (permission) return permission.is_enabled;
    // Default from permission type
    const type = permissionTypes?.find(pt => pt.key === key);
    return type?.default_for_agent ?? false;
  };

  const handleToggle = async (key: string) => {
    if (!selectedSectorId) return;
    
    const currentValue = getPermissionValue(key);
    await setSectorPermission({
      sectorId: selectedSectorId,
      permissionKey: key,
      isEnabled: !currentValue,
    });
  };

  const categories = [
    { key: 'conversations', label: 'Conversas' },
    { key: 'sales', label: 'Vendas' },
    { key: 'admin', label: 'Administração' },
  ];

  if (isLoadingSectors || isLoadingTypes) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Permissões por Setor
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure as permissões padrão para membros de cada setor
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sector selector */}
        <div className="flex items-center gap-4">
          <Select value={selectedSectorId || undefined} onValueChange={setSelectedSectorId}>
            <SelectTrigger className="w-[250px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Selecione um setor" />
            </SelectTrigger>
            <SelectContent>
              {sectors.filter(sector => sector.id).map(sector => (
                <SelectItem key={sector.id} value={sector.id}>
                  {sector.name}
                  {sector.is_default && (
                    <Badge variant="outline" className="ml-2 text-xs">Padrão</Badge>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSector && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{userSectors.length} membro(s)</span>
            </div>
          )}
        </div>

        {/* Info card */}
        {selectedSector && (
          <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Membros deste setor poderão:</p>
              <p className="text-muted-foreground">
                {permissionTypes?.filter(pt => getPermissionValue(pt.key)).map(pt => pt.name).join(', ') || 'Nenhuma permissão ativa'}
              </p>
            </div>
          </div>
        )}

        {/* Permissions grid */}
        {selectedSectorId && (
          <div className="space-y-4">
            {categories.map(category => {
              const categoryPermissions = permissionTypes?.filter(pt => pt.category === category.key) || [];
              if (categoryPermissions.length === 0) return null;
              
              return (
                <div key={category.key}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">{category.label}</h4>
                  <div className="grid gap-2">
                    {categoryPermissions.map(pt => {
                      const isEnabled = getPermissionValue(pt.key);
                      const isFromDb = sectorPermissions.some(sp => sp.permission_key === pt.key);
                      
                      return (
                        <div 
                          key={pt.key} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{pt.name}</span>
                              {!isFromDb && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-xs">Padrão</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Usando valor padrão do sistema
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {pt.description && (
                              <p className="text-xs text-muted-foreground mt-1">{pt.description}</p>
                            )}
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => handleToggle(pt.key)}
                            disabled={isSettingPermission}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sectors.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum setor configurado</p>
            <p className="text-sm">Crie setores em Configurações → Setores</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SectorPermissionsCard;
