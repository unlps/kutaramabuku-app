import { useState, useEffect, useCallback } from "react";
import { Bell, Check, X, BookOpen, Users, Loader2, UserPlus, UserCheck, UserX, Rocket, CalendarClock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNotificationContext } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";
import { SchedulePublishDialog } from "@/components/SchedulePublishDialog";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: {
    ebook_id?: string;
    book_author_id?: string;
    ebook_title?: string;
    inviter_id?: string;
    inviter_name?: string;
    collaborator_id?: string;
    collaborator_name?: string;
    follower_id?: string;
    follower_name?: string;
    follower_avatar?: string;
    acceptor_name?: string;
    acceptor_avatar?: string;
    response_status?: "pending" | "accepted" | "rejected";
    submission_id?: string;
    status?: string;
    review_notes?: string;
    rejection_reason?: string;
  };
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<{ ebookId: string; ebookTitle: string; notificationId: string } | null>(null);
  const [selectedCollaboration, setSelectedCollaboration] = useState<Notification | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUnreadCount } = useNotificationContext();

  const loadNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const typedNotifications: Notification[] = (data || []).map(n => ({
        ...n,
        data: (n.data as Notification['data']) || {}
      }));
      setNotifications(typedNotifications);
      await refreshUnreadCount();
      setSelectedCollaboration(null);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [refreshUnreadCount, toast]);

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(session.user.id);
      await loadNotifications();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`notifications-page-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, loadNotifications]);

  const handleCollaborationResponse = async (notification: Notification, accept: boolean) => {
    setProcessingId(notification.id);
    
    try {
      const bookAuthorId = notification.data.book_author_id;
      
      if (!bookAuthorId) {
        throw new Error("ID do convite não encontrado");
      }

      const { error: updateError } = await supabase.rpc("respond_to_collaboration_invite", {
        p_book_author_id: bookAuthorId,
        p_accept: accept,
        p_notification_id: notification.id,
      });

      if (updateError) throw updateError;
      await loadNotifications();

      toast({
        title: accept ? "Convite aceito" : "Convite rejeitado",
        description: accept 
          ? `Agora você pode editar "${notification.data.ebook_title}"`
          : "O convite foi rejeitado."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao processar resposta",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFollowRequestResponse = async (notification: Notification, accept: boolean) => {
    setProcessingId(notification.id);
    
    try {
      const followerId = notification.data.follower_id;
      
      if (!followerId) {
        throw new Error("ID do seguidor não encontrado");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      if (accept) {
        await supabase
          .from("user_follows")
          .update({ status: 'accepted' })
          .eq("follower_id", followerId)
          .eq("following_id", session.user.id);

        // Fetch own profile for the acceptance notification
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .single();

        // Notify the follower that request was accepted
        await supabase.rpc('create_system_notification', {
          p_user_id: followerId,
          p_type: 'follow_accepted',
          p_title: 'Pedido aceite',
          p_message: `${myProfile?.full_name || 'Um utilizador'} aceitou o teu pedido para seguir`,
          p_data: {
            acceptor_name: myProfile?.full_name || null,
            acceptor_avatar: myProfile?.avatar_url || null,
          }
        });
      } else {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", followerId)
          .eq("following_id", session.user.id);
      }

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));

      toast({
        title: accept ? "Pedido aceite" : "Pedido rejeitado",
        description: accept 
          ? "O utilizador agora pode ver o teu conteúdo"
          : "O pedido de seguir foi rejeitado."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao processar resposta",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Publish an approved book immediately.
   */
  const handlePublishNow = async (notification: Notification) => {
    const ebookId = notification.data.ebook_id;
    if (!ebookId) return;

    setProcessingId(notification.id);
    try {
      // Use the publish_ebook function which also notifies subscribers and forces profile public
      const { error } = await supabase.rpc("publish_ebook", { p_ebook_id: ebookId });
      if (error) throw error;

      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      setNotifications(prev => prev.map(n =>
        n.id === notification.id ? { ...n, is_read: true } : n
      ));

      toast({
        title: "Livro publicado!",
        description: `"${notification.data.ebook_title}" está agora disponível para todos.`,
      });

      setTimeout(() => {
        navigate(`/book/${ebookId}`);
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Erro ao publicar",
        description: error.message || "Não foi possível publicar o livro.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Open the schedule dialog for an approved book.
   */
  const handleOpenSchedule = (notification: Notification) => {
    if (!notification.data.ebook_id) return;
    setScheduleTarget({
      ebookId: notification.data.ebook_id,
      ebookTitle: notification.data.ebook_title || "Livro",
      notificationId: notification.id,
    });
    setScheduleDialogOpen(true);
  };

  const handleScheduleCompleted = async () => {
    if (scheduleTarget) {
      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", scheduleTarget.notificationId);

      setNotifications(prev => prev.map(n =>
        n.id === scheduleTarget.notificationId ? { ...n, is_read: true } : n
      ));
    }
    setScheduleTarget(null);
    loadNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error: any) {
      toast({
        title: "Erro ao remover notificação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora mesmo";
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getCollaborationStatus = (notification: Notification) => {
    return notification.data.response_status || (notification.is_read ? "accepted" : "pending");
  };

  const getNotificationIcon = (notification: Notification) => {
    const { type, data } = notification;

    // For follow-related notifications, show the user's avatar
    if (type === 'follow_request' && (data.follower_avatar || data.follower_name)) {
      return (
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
          <AvatarImage src={data.follower_avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {data.follower_name?.charAt(0) || <UserPlus className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      );
    }

    if (type === 'follow_accepted' && (data.acceptor_avatar || data.acceptor_name)) {
      return (
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
          <AvatarImage src={data.acceptor_avatar} />
          <AvatarFallback className="bg-emerald-500/10 text-emerald-700 text-xs">
            {data.acceptor_name?.charAt(0) || <UserCheck className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      );
    }

    switch (type) {
      case 'collaboration_request':
        return <Users className="h-5 w-5 text-primary" />;
      case 'collaboration_accepted':
        return <UserCheck className="h-5 w-5 text-emerald-600" />;
      case 'collaboration_rejected':
        return <UserX className="h-5 w-5 text-red-600" />;
      case 'follow_request':
        return <UserPlus className="h-5 w-5 text-primary" />;
      case 'follow_accepted':
        return <UserCheck className="h-5 w-5 text-emerald-600" />;
      case 'submission_reviewed':
        return <BookOpen className="h-5 w-5 text-primary" />;
      case 'book_released':
        return <Rocket className="h-5 w-5 text-emerald-600" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Kutara Mabuku" className="w-10 h-10 object-cover" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Notificações
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-primary">{unreadCount}</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando notificações...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Bell className="h-24 w-24 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Nada para mostrar</h2>
            <p className="text-muted-foreground text-center">
              Você não tem notificações no momento
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {notifications.map(notification => (
              <Card
                key={notification.id}
                className={cn(
                  "p-3 sm:p-4 transition-all",
                  !notification.is_read && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex gap-2 sm:gap-4">
                  {(notification.type === 'follow_request' || notification.type === 'follow_accepted') ? (
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification)}
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getNotificationIcon(notification)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{notification.title}</h3>
                          {/* Delete button - mobile inline */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="flex-shrink-0 h-6 w-6 sm:hidden text-muted-foreground hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-[10px] sm:text-xs text-muted-foreground mt-1 block sm:hidden">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <span className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    {/* Collaboration request actions */}
                    {notification.type === 'collaboration_request' && (
                      <div className="mt-3 space-y-2 sm:mt-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCollaboration(notification)}
                            className="h-8 text-xs sm:text-sm"
                          >
                            <Eye className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            Ver detalhes
                          </Button>
                          {getCollaborationStatus(notification) === "accepted" && notification.data.ebook_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs sm:text-sm"
                              onClick={() => navigate(`/editor?id=${notification.data.ebook_id}`)}
                            >
                              <BookOpen className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                              Abrir livro
                            </Button>
                          )}
                        </div>

                        {getCollaborationStatus(notification) === "pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleCollaborationResponse(notification, true)}
                              disabled={processingId === notification.id}
                              className="bg-green-600 hover:bg-green-700 h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                            >
                              {processingId === notification.id ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                              ) : (
                                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              )}
                              Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCollaborationResponse(notification, false)}
                              disabled={processingId === notification.id}
                              className="border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Rejeitar
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-fit",
                              getCollaborationStatus(notification) === "accepted"
                                ? "border-emerald-500/30 text-emerald-700"
                                : "border-red-500/30 text-red-600"
                            )}
                          >
                            {getCollaborationStatus(notification) === "accepted" ? "Convite aceite" : "Convite rejeitado"}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Follow request actions */}
                    {notification.type === 'follow_request' && !notification.is_read && (
                      <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleFollowRequestResponse(notification, true)}
                          disabled={processingId === notification.id}
                          className="bg-green-600 hover:bg-green-700 h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                        >
                          {processingId === notification.id ? (
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                          ) : (
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          )}
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFollowRequestResponse(notification, false)}
                          disabled={processingId === notification.id}
                          className="border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    )}

                    {notification.type === 'collaboration_accepted' && notification.data.ebook_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 sm:mt-3 h-8 text-xs sm:text-sm"
                        onClick={() => navigate(`/editor?id=${notification.data.ebook_id}`)}
                      >
                        <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Abrir livro
                      </Button>
                    )}

                    {notification.type === 'collaboration_rejected' && notification.data.ebook_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 sm:mt-3 h-8 text-xs sm:text-sm"
                        onClick={() => navigate(`/editor?id=${notification.data.ebook_id}`)}
                      >
                        <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Ver livro
                      </Button>
                    )}

                    {/* View profile button for accepted follow requests */}
                    {notification.type === 'follow_request' && notification.is_read && notification.data.follower_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 sm:mt-3 h-8 text-xs sm:text-sm"
                        onClick={() => navigate(`/account/${notification.data.follower_id}`)}
                      >
                        <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Ver Perfil
                      </Button>
                    )}

                    {/* follow_accepted — mark as read */}
                    {notification.type === 'follow_accepted' && !notification.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 sm:mt-3 h-8 text-xs sm:text-sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Marcar como lida
                      </Button>
                    )}

                    {/* Submission reviewed actions */}
                    {notification.type === 'submission_reviewed' && (
                      <div className="mt-3 space-y-3">
                        {(notification.data.review_notes || notification.data.rejection_reason) && (
                          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                            {notification.data.review_notes && (
                              <p>{notification.data.review_notes}</p>
                            )}
                            {notification.data.rejection_reason && (
                              <p className="mt-2 text-red-600">{notification.data.rejection_reason}</p>
                            )}
                          </div>
                        )}

                        {/* APPROVED: Show Publish Now / Schedule buttons */}
                        {notification.data.status === "approved" && !notification.is_read ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handlePublishNow(notification)}
                              disabled={processingId === notification.id}
                              className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                            >
                              {processingId === notification.id ? (
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                              ) : (
                                <Rocket className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              )}
                              Publicar agora
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenSchedule(notification)}
                              disabled={processingId === notification.id}
                              className="h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                            >
                              <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Agendar publicação
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs sm:text-sm"
                            onClick={() =>
                              notification.data.status === "approved"
                                ? navigate(`/book/${notification.data.ebook_id}`)
                                : navigate(`/editor?id=${notification.data.ebook_id}`)
                            }
                          >
                            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            {notification.data.status === "approved" ? "Ver Livro" : "Abrir Editor"}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Book released notification */}
                    {notification.type === 'book_released' && notification.data.ebook_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 sm:mt-3 h-8 text-xs sm:text-sm"
                        onClick={() => navigate(`/book/${notification.data.ebook_id}`)}
                      >
                        <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Ver Livro
                      </Button>
                    )}

                    {/* General actions for other notifications */}
                    {notification.type !== 'collaboration_request' && notification.type !== 'collaboration_accepted' && notification.type !== 'collaboration_rejected' && notification.type !== 'follow_request' && notification.type !== 'follow_accepted' && notification.type !== 'submission_reviewed' && notification.type !== 'book_released' && !notification.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 sm:mt-3 h-8 text-xs sm:text-sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Marcar como lida
                      </Button>
                    )}
                  </div>

                  {/* Delete button - desktop */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hidden sm:flex flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      <Dialog
        open={!!selectedCollaboration}
        onOpenChange={(open) => {
          if (!open) setSelectedCollaboration(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Convite para colaborar</DialogTitle>
            <DialogDescription>
              Detalhes do convite e permissoes da colaboracao.
            </DialogDescription>
          </DialogHeader>

          {selectedCollaboration && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">
                  Livro: {selectedCollaboration.data.ebook_title || "Livro"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Convite enviado por {selectedCollaboration.data.inviter_name || "autor"}.
                </p>
              </div>

              <div className="space-y-2 text-muted-foreground">
                <p>Ao aceitar, poderas visualizar e editar o conteudo do livro.</p>
                <p>Como colaborador, nao poderas publicar, submeter, agendar ou alterar a visibilidade.</p>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  "w-fit",
                  getCollaborationStatus(selectedCollaboration) === "accepted"
                    ? "border-emerald-500/30 text-emerald-700"
                    : getCollaborationStatus(selectedCollaboration) === "rejected"
                      ? "border-red-500/30 text-red-600"
                      : "border-yellow-500/30 text-yellow-700"
                )}
              >
                {getCollaborationStatus(selectedCollaboration) === "accepted"
                  ? "Aceite"
                  : getCollaborationStatus(selectedCollaboration) === "rejected"
                    ? "Rejeitado"
                    : "Pendente"}
              </Badge>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selectedCollaboration && getCollaborationStatus(selectedCollaboration) === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => void handleCollaborationResponse(selectedCollaboration, false)}
                  disabled={processingId === selectedCollaboration.id}
                  className="w-full sm:w-auto"
                >
                  Rejeitar
                </Button>
                <Button
                  onClick={() => void handleCollaborationResponse(selectedCollaboration, true)}
                  disabled={processingId === selectedCollaboration.id}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                >
                  {processingId === selectedCollaboration.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Aceitar
                </Button>
              </>
            )}
            {selectedCollaboration &&
              getCollaborationStatus(selectedCollaboration) === "accepted" &&
              selectedCollaboration.data.ebook_id && (
                <Button
                  onClick={() => {
                    navigate(`/editor?id=${selectedCollaboration.data.ebook_id}`);
                    setSelectedCollaboration(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  Abrir livro
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Publish Dialog */}
      {scheduleTarget && (
        <SchedulePublishDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          ebookId={scheduleTarget.ebookId}
          ebookTitle={scheduleTarget.ebookTitle}
          onScheduled={handleScheduleCompleted}
        />
      )}
    </div>
  );
};

export default Notifications;
