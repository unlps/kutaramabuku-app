import { useState, useEffect } from "react";
import { Bell, Check, X, BookOpen, Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  };
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadNotifications();
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Cast the data to our Notification type
      const typedNotifications: Notification[] = (data || []).map(n => ({
        ...n,
        data: (n.data as Notification['data']) || {}
      }));
      setNotifications(typedNotifications);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCollaborationResponse = async (notification: Notification, accept: boolean) => {
    setProcessingId(notification.id);
    
    try {
      const bookAuthorId = notification.data.book_author_id;
      
      if (!bookAuthorId) {
        throw new Error("ID do convite não encontrado");
      }

      // Update the book_author status
      const { error: updateError } = await supabase
        .from("book_authors")
        .update({ 
          status: accept ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq("id", bookAuthorId);

      if (updateError) throw updateError;

      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));

      toast({
        title: accept ? "Convite aceito" : "Convite rejeitado",
        description: accept 
          ? `Agora você pode editar "${notification.data.ebook_title}"`
          : "O convite foi rejeitado."
      });

      // Optionally navigate to the book editor if accepted
      if (accept && notification.data.ebook_id) {
        setTimeout(() => {
          navigate(`/editor?id=${notification.data.ebook_id}`);
        }, 1500);
      }
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'collaboration_request':
        return <Users className="h-5 w-5 text-primary" />;
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
                  "p-4 transition-all",
                  !notification.is_read && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    {/* Collaboration request actions */}
                    {notification.type === 'collaboration_request' && !notification.is_read && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleCollaborationResponse(notification, true)}
                          disabled={processingId === notification.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === notification.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCollaborationResponse(notification, false)}
                          disabled={processingId === notification.id}
                          className="border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    )}

                    {/* View book button for accepted collaborations */}
                    {notification.type === 'collaboration_request' && notification.is_read && notification.data.ebook_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => navigate(`/editor?id=${notification.data.ebook_id}`)}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Ver Livro
                      </Button>
                    )}

                    {/* General actions for other notifications */}
                    {notification.type !== 'collaboration_request' && !notification.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-3"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Marcar como lida
                      </Button>
                    )}
                  </div>

                  {/* Delete button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
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
    </div>
  );
};

export default Notifications;
