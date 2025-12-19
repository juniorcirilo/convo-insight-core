import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Settings, Loader2, BarChart3, ChevronRight, ChevronLeft, MessageSquare, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWhatsAppConversations } from "@/hooks/whatsapp";
import { useDebounce } from "@/hooks/useDebounce";
import { useWhatsAppMessageSearch } from "@/hooks/whatsapp/useWhatsAppMessageSearch";
import ConversationItem from "./ConversationItem";
import QuickFilterPills from "./QuickFilterPills";
import NewConversationModal from "./NewConversationModal";
import { ConversationFiltersPopover } from "./ConversationFiltersPopover";
import { NotificationToggle } from "@/components/notifications/NotificationToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ConversationsSidebarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  instanceId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type FilterType = "all" | "unread" | "waiting" | "queue" | "mine";

const ConversationsSidebar = ({ selectedId, onSelect, instanceId, isCollapsed, onToggleCollapse }: ConversationsSidebarProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [instanceFilter, setInstanceFilter] = useState<string | null>(null);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const { user } = useAuth();

  // Debounce search for advanced message search
  const debouncedSearchQuery = useDebounce(search, 300);
  const { data: messageSearchResults, isLoading: isSearchingMessages } = useWhatsAppMessageSearch(debouncedSearchQuery);

  // Build filters for conversations query
  const conversationFilters = {
    instanceId: instanceFilter || instanceId,
    status: statusFilter === "all" ? undefined : statusFilter,
    page: currentPage,
    pageSize,
    assignedTo: filter === "mine" ? user?.id : undefined,
    unassigned: filter === "queue" ? true : undefined,
  };

  const { conversations, totalCount, totalPages, unreadCount, waitingCount, isLoading } = useWhatsAppConversations(conversationFilters);

  // Get counts for queue and my conversations
  const queueCount = useMemo(() => {
    return conversations.filter(c => !c.assigned_to).length;
  }, [conversations]);

  const myConversationsCount = useMemo(() => {
    return conversations.filter(c => c.assigned_to === user?.id).length;
  }, [conversations, user]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [instanceFilter, statusFilter, filter, debouncedSearchQuery]);

  // Lógica de filtragem
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // Busca rápida: nome, telefone e preview da última mensagem
    const searchLower = search.toLowerCase();
    const matchesQuickSearch = (conv: typeof conversations[0]) =>
      conv.contact?.name?.toLowerCase().includes(searchLower) ||
      conv.contact?.phone_number?.includes(search) ||
      conv.last_message_preview?.toLowerCase().includes(searchLower);

    // Busca avançada: histórico completo (se tiver 3+ caracteres)
    const matchesAdvancedSearch = (conv: typeof conversations[0]) =>
      debouncedSearchQuery.trim().length >= 3 && messageSearchResults
        ? messageSearchResults.includes(conv.id)
        : false;

    // Aceita se encontrou na busca rápida OU na busca avançada
    if (search.trim()) {
      result = result.filter(conv => matchesQuickSearch(conv) || matchesAdvancedSearch(conv));
    }

    // Filtros rápidos (pills)
    if (filter === "unread") {
      result = result.filter(conv => (conv.unread_count || 0) > 0);
    } else if (filter === "waiting") {
      result = result.filter(conv => conv.isLastMessageFromMe === false);
    } else if (filter === "queue") {
      result = result.filter(conv => !conv.assigned_to);
    } else if (filter === "mine") {
      result = result.filter(conv => conv.assigned_to === user?.id);
    }

    // Ordenação
    if (sortBy === "unread") {
      result.sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0));
    } else if (sortBy === "waiting") {
      result.sort((a, b) => {
        if (a.isLastMessageFromMe === false && b.isLastMessageFromMe !== false) return -1;
        if (a.isLastMessageFromMe !== false && b.isLastMessageFromMe === false) return 1;
        return 0;
      });
    } else if (sortBy === "oldest") {
      result.sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateA - dateB;
      });
    }
    // sortBy === "recent" já é o padrão da query

    return result;
  }, [conversations, search, debouncedSearchQuery, messageSearchResults, filter, sortBy]);

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full w-14 bg-sidebar items-center py-3 gap-3">
        {/* Expand button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleCollapse}
          title="Expandir"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Conversations icon */}
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        
        {/* New conversation */}
        <Button 
          size="icon" 
          variant="ghost"
          onClick={() => setIsNewConversationOpen(true)}
          title="Nova conversa"
        >
          <Plus className="h-4 w-4" />
        </Button>
        
        {/* Quick links */}
        <NotificationToggle />
        
        <Link to="/whatsapp/contatos">
          <Button variant="ghost" size="icon" title="Contatos">
            <Users className="h-4 w-4" />
          </Button>
        </Link>
        
        <Link to="/whatsapp/relatorio">
          <Button variant="ghost" size="icon" title="Relatórios">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </Link>
        
        <Link to="/whatsapp/settings">
          <Button variant="ghost" size="icon" title="Configurações">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        
        {/* Unread badge */}
        {unreadCount > 0 && (
          <div className="mt-auto mb-2">
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          </div>
        )}
        
        <NewConversationModal
          open={isNewConversationOpen}
          onOpenChange={setIsNewConversationOpen}
          instanceId={instanceId}
          onSuccess={(conversationId) => {
            onSelect(conversationId);
            setIsNewConversationOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-80 bg-sidebar">
      {/* Title Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">Conversas</h1>
          <div className="flex items-center gap-1">
            <NotificationToggle />
            <Link to="/whatsapp/contatos">
              <Button variant="ghost" size="icon" title="Contatos">
                <Users className="h-5 w-5" />
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
            {onToggleCollapse && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onToggleCollapse}
                title="Recolher"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <UserMenu />
      </div>

      {/* Search and new conversation */}
      <div className="p-3 space-y-2 border-b border-sidebar-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-sidebar-accent border-sidebar-border"
            />
          </div>
          <Button
            size="icon"
            onClick={() => setIsNewConversationOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Pills de filtro rápido + Filtros avançados */}
        <div className="flex items-center justify-between gap-2">
          <QuickFilterPills 
            activeFilter={filter} 
            onFilterChange={setFilter}
            unreadCount={unreadCount}
            waitingCount={waitingCount}
            queueCount={queueCount}
            myConversationsCount={myConversationsCount}
          />
          <ConversationFiltersPopover
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            instanceFilter={instanceFilter}
            onInstanceChange={setInstanceFilter}
          />
        </div>

        {/* Indicadores de busca */}
        {isSearchingMessages && debouncedSearchQuery.trim().length >= 3 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Buscando no histórico...
          </div>
        )}
        {search.trim() && (
          <div className="text-xs text-muted-foreground">
            {filteredConversations.length} conversa{filteredConversations.length !== 1 ? 's' : ''} encontrada{filteredConversations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
          </div>
        ) : (
          <div className="divide-y divide-sidebar-border">
            {filteredConversations.map((conversation) => {
              // Calcular se foi encontrado no histórico
              const searchLower = search.toLowerCase();
              const matchesQuickSearch =
                conversation.contact?.name?.toLowerCase().includes(searchLower) ||
                conversation.contact?.phone_number?.includes(search) ||
                conversation.last_message_preview?.toLowerCase().includes(searchLower);

              const foundByContent =
                debouncedSearchQuery.trim().length >= 3 &&
                messageSearchResults?.includes(conversation.id) &&
                !matchesQuickSearch;

              return (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={conversation.id === selectedId}
                  onClick={() => onSelect(conversation.id)}
                  foundByContent={foundByContent}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-sidebar-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {totalCount} conversa{totalCount !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[60px] text-center">
            {currentPage} / {totalPages || 1}
          </span>
          <Button 
            variant="outline" 
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <NewConversationModal
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        instanceId={instanceId}
        onSuccess={(conversationId) => {
          onSelect(conversationId);
          setIsNewConversationOpen(false);
        }}
      />
    </div>
  );
};

export default ConversationsSidebar;
