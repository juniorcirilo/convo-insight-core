import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Users, MessageSquare, BarChart3, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWhatsAppContacts, ContactSortOption } from '@/hooks/whatsapp/useWhatsAppContacts';
import { useWhatsAppInstances } from '@/hooks/whatsapp';
import { ContactItem } from './ContactItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { UserMenu } from '@/components/auth/UserMenu';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ContactsSidebarProps {
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
}

export function ContactsSidebar({ selectedContactId, onSelectContact }: ContactsSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<ContactSortOption>('last_interaction');
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const { instances } = useWhatsAppInstances();
  const { data, isLoading } = useWhatsAppContacts(
    selectedInstanceId === 'all' ? undefined : selectedInstanceId,
    debouncedSearch,
    sortBy,
    currentPage,
    20
  );

  const contacts = data?.contacts || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedInstanceId, debouncedSearch]);

  return (
    <div className="w-80 border-r border-sidebar-border bg-sidebar flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Contatos</h1>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/whatsapp">
              <Button variant="ghost" size="icon" title="Conversas">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/whatsapp/relatorio">
              <Button variant="ghost" size="icon" title="Relatórios">
                <BarChart3 className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/whatsapp/settings">
              <Button variant="ghost" size="icon" title="Configurações">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-3">
          <UserMenu />
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-sidebar-accent border-sidebar-border h-9"
            />
          </div>
        </div>

        {/* Instance Filter */}
        <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as instâncias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as instâncias</SelectItem>
            {instances?.map((instance) => (
              <SelectItem key={instance.id} value={instance.id}>
                {instance.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Filter */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as ContactSortOption)}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_interaction">Última interação</SelectItem>
            <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
            <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
            <SelectItem value="conversations">Mais conversas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-sidebar-border">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 mb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))
          ) : contacts.length > 0 ? (
            contacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                isSelected={selectedContactId === contact.id}
                onClick={() => onSelectContact(contact.id)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum contato encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'contato' : 'contatos'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
