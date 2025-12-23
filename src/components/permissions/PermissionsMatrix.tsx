import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Filter, Edit2, Shield, Users } from 'lucide-react';
import { useTeamManagement, TeamMember } from '@/hooks/useTeamManagement';
import { useUserSectors } from '@/hooks/useUserSectors';
import { useSectors } from '@/hooks/useSectors';
import { usePermissionTypes, useUserEffectivePermissions } from '@/hooks/permissions';
import UserPermissionsModal from './UserPermissionsModal';

const roleConfig = {
  admin: { label: 'Admin', variant: 'destructive' as const },
  supervisor: { label: 'Supervisor', variant: 'default' as const },
  agent: { label: 'Agente', variant: 'secondary' as const },
};

interface MemberRowProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
}

const MemberRow = ({ member, onEdit }: MemberRowProps) => {
  const { userSectors } = useUserSectors(undefined, member.id);
  const { data: effectivePermissions } = useUserEffectivePermissions(member.id);
  
  const enabledCount = effectivePermissions?.filter(p => p.is_enabled).length || 0;
  const totalCount = effectivePermissions?.length || 0;
  const hasOverrides = effectivePermissions?.some(p => p.source === 'user_override');

  const config = roleConfig[member.role];

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback>
              {member.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">{member.full_name}</span>
            {member.email && (
              <p className="text-xs text-muted-foreground">{member.email}</p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {userSectors.length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhum setor</span>
          ) : (
            userSectors.slice(0, 2).map(us => (
              <Badge key={us.id} variant="outline" className="text-xs">
                {us.sector_name}
                {us.is_primary && <span className="ml-1 text-primary">★</span>}
              </Badge>
            ))
          )}
          {userSectors.length > 2 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs">
                  +{userSectors.length - 2}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {userSectors.slice(2).map(us => us.sector_name).join(', ')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-green-600">{enabledCount}</span>
            <span className="text-sm text-muted-foreground">/ {totalCount}</span>
          </div>
          {hasOverrides && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Override
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Este usuário tem permissões personalizadas
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <Button variant="ghost" size="sm" onClick={() => onEdit(member)}>
          <Edit2 className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </td>
    </tr>
  );
};

const PermissionsMatrix = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  const { members, isLoading: isLoadingMembers } = useTeamManagement();
  const { sectors } = useSectors();
  const { data: permissionTypes } = usePermissionTypes();

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!member.full_name.toLowerCase().includes(query) && 
            !member.email?.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Role filter
      if (roleFilter !== 'all' && member.role !== roleFilter) {
        return false;
      }
      
      return true;
    });
  }, [members, searchQuery, roleFilter]);

  if (isLoadingMembers) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Matriz de Acessos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualize e gerencie permissões de cada usuário
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="agent">Agente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[180px]">
                <Shield className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {sectors.filter(sector => sector.id).map(sector => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Usuário</th>
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">Setores</th>
                  <th className="text-left py-3 px-4 font-medium">Permissões</th>
                  <th className="text-left py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map(member => (
                    <MemberRow 
                      key={member.id} 
                      member={member} 
                      onEdit={setSelectedMember}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredMembers.length} usuário(s) encontrado(s)</span>
            <span>
              {permissionTypes?.length || 0} tipos de permissões configurados
            </span>
          </div>
        </CardContent>
      </Card>

      <UserPermissionsModal
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
      />
    </>
  );
};

export default PermissionsMatrix;
