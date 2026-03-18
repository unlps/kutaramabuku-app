import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useReviewerAuth } from "@/hooks/useReviewerAuth";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  BookCheck,
  UserCircle,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoLight from "@/assets/validamabuku-logo-light.png";
import logoDark from "@/assets/validamabuku-logo-dark.png";

interface ReviewerLayoutProps {
  children: React.ReactNode;
}

const baseNavItems = [
  { path: "/reviewer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/reviewer/queue", label: "Fila de Revisão", icon: BookCheck },
  { path: "/reviewer/profile", label: "Meu Perfil", icon: UserCircle },
];

const adminNavItems = [
  { path: "/reviewer/admin/invites", label: "Gerir Convites", icon: UserPlus },
];

const ReviewerLayout = ({ children }: ReviewerLayoutProps) => {
  const { reviewerProfile, isLoading } = useReviewerAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Sessão terminada", description: "Até breve!" });
    navigate("/reviewer/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">A carregar ValidaMabuku...</p>
        </div>
      </div>
    );
  }

  const logo = theme === "dark" ? logoDark : logoLight;
  const roleBadgeColor =
    reviewerProfile?.role === "admin"
      ? "bg-red-500/10 text-red-500 border-red-500/20"
      : reviewerProfile?.role === "senior_reviewer"
      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";

  const roleLabel =
    reviewerProfile?.role === "admin"
      ? "Admin"
      : reviewerProfile?.role === "senior_reviewer"
      ? "Senior Reviewer"
      : "Reviewer";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-72
          bg-card border-r border-border
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="ValidaMabuku" className="w-10 h-10 rounded-lg object-cover" />
              <div>
                <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                  ValidaMabuku
                </h1>
                <p className="text-xs text-muted-foreground">Painel de Revisão</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {baseNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                {item.label}
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            );
          })}

          {/* Admin-only nav items */}
          {(reviewerProfile?.role === "admin" || reviewerProfile?.role === "senior_reviewer") && (
            <>
              <div className="pt-3 pb-1 px-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Administração</p>
              </div>
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                      transition-all duration-200 group
                      ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </button>
                );
              })}
            </>
          )}
        </nav>



        {/* User Info */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-sm">
              {reviewerProfile?.full_name?.charAt(0)?.toUpperCase() || "R"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {reviewerProfile?.full_name || "Reviewer"}
              </p>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${roleBadgeColor}`}
              >
                <Shield className="h-3 w-3" />
                {roleLabel}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Terminar Sessão
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar (mobile) */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src={logo} alt="ValidaMabuku" className="w-7 h-7 rounded-md" />
              <span className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">
                ValidaMabuku
              </span>
            </div>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default ReviewerLayout;
