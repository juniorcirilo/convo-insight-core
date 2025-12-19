import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/utils/notificationSound";
import { useQuery } from "@tanstack/react-query";

interface NotificationContextType {
  permission: NotificationPermission;
  soundEnabled: boolean;
  totalUnread: number;
  selectedConversationId: string | null;
  requestPermission: () => Promise<void>;
  toggleSound: () => void;
  setSelectedConversationId: (id: string | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SOUND_ENABLED_KEY = "whatsapp-sound-enabled";

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    return saved !== null ? saved === "true" : true;
  });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversationRef = useRef<string | null>(null);

  // Sync ref with state for realtime listener
  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Calculate total unread count
  const { data: conversations } = useQuery({
    queryKey: ["conversations-unread-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("unread_count")
        .neq("unread_count", 0);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const totalUnread = conversations?.reduce((sum, conv) => sum + (conv.unread_count || 0), 0) || 0;

  // Update page title with unread count
  useEffect(() => {
    const baseTitle = "WhatsApp";
    if (totalUnread > 0) {
      document.title = totalUnread > 99 ? `(99+) ${baseTitle}` : `(${totalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [totalUnread]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem(SOUND_ENABLED_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const showWebNotification = useCallback(async (contactName: string, messagePreview: string, conversationId: string) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    try {
      const notification = new Notification(contactName, {
        body: messagePreview?.substring(0, 100) || "Nova mensagem",
        icon: "/favicon.ico",
        tag: `whatsapp-${conversationId}`,
        silent: true,
      });

      notification.onclick = () => {
        window.focus();
        window.dispatchEvent(
          new CustomEvent("openConversation", {
            detail: { conversationId },
          })
        );
        notification.close();
      };
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }, []);

  // Global listener for new messages
  useEffect(() => {
    const channel = supabase
      .channel("global-new-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Ignore messages sent by us
          if (newMessage.is_from_me) return;

          // Ignore messages in the currently open conversation
          if (newMessage.conversation_id === selectedConversationRef.current) return;

          // Fetch conversation and contact info
          try {
            const { data: conversation } = await supabase
              .from("whatsapp_conversations")
              .select("contact:whatsapp_contacts(name)")
              .eq("id", newMessage.conversation_id)
              .single();

            const contactName = conversation?.contact?.name || "Contato";
            const messagePreview = newMessage.content || "Nova mensagem";

            // Play sound
            if (soundEnabled) {
              playNotificationSound();
            }

            // Show web push notification
            showWebNotification(contactName, messagePreview, newMessage.conversation_id);
          } catch (error) {
            console.error("Error processing notification:", error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, showWebNotification]);

  return (
    <NotificationContext.Provider
      value={{
        permission,
        soundEnabled,
        totalUnread,
        selectedConversationId,
        requestPermission,
        toggleSound,
        setSelectedConversationId,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};
