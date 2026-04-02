import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const loadUnreadCount = useCallback(
    async (targetUserId?: string | null) => {
      const activeUserId = targetUserId ?? userId;

      if (!activeUserId) {
        setUnreadCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", activeUserId)
        .eq("is_read", false);

      if (error) {
        console.error("Error loading unread notifications:", error);
        return;
      }

      setUnreadCount(count ?? 0);
    },
    [userId]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      const nextUserId = session?.user.id ?? null;
      setUserId(nextUserId);
      await loadUnreadCount(nextUserId);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      setUserId(nextUserId);
      void loadUnreadCount(nextUserId);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-unread-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadUnreadCount(userId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadUnreadCount, userId]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount: async () => loadUnreadCount(),
    }),
    [loadUnreadCount, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }

  return context;
};
