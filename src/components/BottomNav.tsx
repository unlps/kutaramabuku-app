import { Home, Search, Plus, Bell, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useNotificationContext } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotificationContext();

  const navItems = [
    { id: "home", label: "Início", icon: Home, path: "/dashboard" },
    { id: "discover", label: "Descobrir", icon: Search, path: "/discover" },
    { id: "create", label: "Criar", icon: Plus, path: "/create" },
    { id: "notifications", label: "Notificações", icon: Bell, path: "/notifications" },
    { id: "account", label: "Conta", icon: User, path: "/account" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-transform hover:scale-110",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="h-6 w-6" />
                  {item.id === "notifications" && unreadCount > 0 && (
                    <Badge className="absolute -right-2.5 -top-2 min-w-5 rounded-full px-1.5 py-0 text-[10px] leading-5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
