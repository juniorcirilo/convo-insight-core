import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Pencil } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { ResponseStatusIndicator } from "./ResponseStatusIndicator";
import { TopicBadges } from "@/components/chat/topics/TopicBadges";
import { ConversationItemMenu } from "./ConversationItemMenu";
import { QueueIndicator } from "./QueueIndicator";
import { EditContactModal } from "@/components/chat/EditContactModal";
import { isContactNameMissing } from "@/utils/contactUtils";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Conversation = Tables<"whatsapp_conversations"> & {
  contact?: Tables<"whatsapp_contacts"> | null;
  isLastMessageFromMe?: boolean;
  assigned_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  foundByContent?: boolean;
}

const getSentimentEmoji = (sentiment: string | null) => {
  switch (sentiment) {
    case "positive":
      return "😊";
    case "negative":
      return "😟";
    case "neutral":
      return "😐";
    default:
      return null;
  }
};

const formatTimestamp = (dateString: string | null) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (isToday(date)) {
    return format(date, "HH:mm");
  }

  if (isYesterday(date)) {
    return "Ontem";
  }

  if (isThisWeek(date)) {
    return format(date, "EEE", { locale: ptBR });
  }

  return format(date, "dd/MM", { locale: ptBR });
};

const getInitials = (name: string) => {
  const words = name.split(" ");
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const ConversationItem = ({ 
  conversation, 
  isSelected, 
  onClick, 
  foundByContent = false 
}: ConversationItemProps) => {
  const contact = conversation.contact;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const nameIsMissing = contact ? isContactNameMissing(contact.name, contact.phone_number) : false;
  const contactName = nameIsMissing ? "Sem nome" : (contact?.name || "Desconhecido");
  const profilePicture = conversation.contact?.profile_picture_url;
  const lastMessage = conversation.last_message_preview || "";
  const lastMessageTime = conversation.last_message_at;
  const unreadCount = conversation.unread_count || 0;
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };
  
  // Get sentiment from metadata if available
  const sentiment = (conversation.metadata as any)?.sentiment || null;
  const sentimentEmoji = getSentimentEmoji(sentiment);
  
  // Get topics from metadata
  const topics = (conversation.metadata as any)?.topics || [];
  
  // Determine if conversation is closed or archived
  const status = conversation.status;
  const showStatusBadge = status === "closed" || status === "archived";

  return (
    <>
      <ConversationItemMenu conversation={conversation}>
        <div
          onClick={onClick}
          className={`
            flex items-center gap-3 p-3 cursor-pointer transition-colors
            hover:bg-sidebar-accent
            ${isSelected ? "bg-sidebar-accent" : ""}
          `}
        >
          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profilePicture || undefined} alt={contactName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name and timestamp row */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className={cn(
                  "font-medium text-sm truncate",
                  nameIsMissing && "text-muted-foreground italic"
                )}>
                  {contactName}
                </span>
                {nameIsMissing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0 flex-shrink-0" 
                    onClick={handleEditClick}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
                {sentimentEmoji && (
                  <span className="text-sm shrink-0">{sentimentEmoji}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatTimestamp(lastMessageTime)}
              </span>
            </div>

            {/* Preview and indicators row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {lastMessage || "Sem mensagens"}
                </p>
                {foundByContent && (
                  <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ResponseStatusIndicator
                  isLastMessageFromMe={conversation.isLastMessageFromMe}
                  conversationStatus={conversation.status || undefined}
                />
                {unreadCount > 0 && (
                  <Badge
                    variant="default"
                    className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </div>
            </div>

            {/* Topics row */}
            {topics.length > 0 && (
              <div className="mt-1.5">
                <TopicBadges topics={topics} size="sm" maxTopics={2} />
              </div>
            )}

            {/* Status and Assignment row */}
            <div className="mt-1.5 flex items-center gap-2">
              <QueueIndicator
                assignedTo={conversation.assigned_to}
                assignedToName={conversation.assigned_profile?.full_name}
                size="sm"
              />
              {showStatusBadge && (
                <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                  {status === "closed" ? "Encerrada" : "Arquivada"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </ConversationItemMenu>
      
      {/* Edit Contact Modal */}
      {contact && (
        <EditContactModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          contactId={contact.id}
          contactName={contact.name}
          contactPhone={contact.phone_number}
          contactNotes={contact.notes || ''}
          onSuccess={() => {
            setIsEditModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export default ConversationItem;
