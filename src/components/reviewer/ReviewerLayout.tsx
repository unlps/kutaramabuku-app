import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useReviewerAuth } from "@/hooks/useReviewerAuth";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  BookCheck,
  UserCircle,
  Menu,
  X,
  UserPlus,
  Sun,
  Moon,
  Globe,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoLight from "@/assets/validamabuku-logo-light.png";
import logoDark from "@/assets/validamabuku-logo-dark.png";

interface ReviewerLayoutProps {
  children: React.ReactNode;
}

const baseNavItems = [
  { path: "/reviewer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/reviewer/queue", label: "Revisão", icon: BookCheck },
];

const profileNavItem = { path: "/reviewer/profile", label: "Perfil", icon: UserCircle };

const adminNavItems = [
  { path: "/reviewer/admin/invites", label: "Convites", icon: UserPlus },
];

const languages = [
  { code: "pt", label: "Português", flag: "🇲🇿" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

const ReviewerLayout = ({ children }: ReviewerLayoutProps) => {
  const { reviewerProfile, isLoading } = useReviewerAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("pt");
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
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
  const isAdmin = reviewerProfile?.role === "admin" || reviewerProfile?.role === "senior_reviewer";
  const allNavItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;
  const lang = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — narrow icon-based */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-[76px]
          bg-gradient-to-b from-[#0a1628] via-[#162d4a] to-[#3b82a0]
          border-r border-white/10
          flex flex-col items-center
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Close (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden absolute top-3 right-1 h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Logo */}
        <div className="pt-5 pb-4 flex flex-col items-center border-b border-white/10 w-full">
          <img src={logo} alt="ValidaMabuku" className="w-10 h-10 rounded-lg object-contain" />
          <span className="text-[9px] font-bold -mt-1 text-white/80 tracking-tight leading-none">
            ValidaMabuku
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center pt-4 gap-1 w-full px-2">
          {allNavItems.map((item) => {
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
                  w-full flex flex-col items-center gap-1 py-2.5 rounded-xl
                  transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-white" : ""} group-hover:scale-110 transition-transform`} />
                <span className="text-[9px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile at bottom */}
        <div className="pb-4 pt-2 border-t border-white/10 w-full px-2">
          <button
            onClick={() => {
              navigate(profileNavItem.path);
              setSidebarOpen(false);
            }}
            className={`
              w-full flex flex-col items-center gap-1 py-2.5 rounded-xl
              transition-all duration-200 group
              ${
                location.pathname === profileNavItem.path
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }
            `}
          >
            <UserCircle className={`h-5 w-5 ${location.pathname === profileNavItem.path ? "text-white" : ""} group-hover:scale-110 transition-transform`} />
            <span className="text-[9px] font-medium leading-none">{profileNavItem.label}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* ── Fixed Top Toolbar ── */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center justify-between px-4 lg:px-6 h-12">
            {/* Mobile hamburger */}
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>

            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <img src={logo} alt="ValidaMabuku" className="w-6 h-6 rounded-md object-contain" />
              <span className="text-xs font-bold bg-gradient-primary bg-clip-text text-transparent">
                ValidaMabuku
              </span>
            </div>

            {/* Spacer on desktop */}
            <div className="hidden lg:block" />

            {/* Toolbar Actions (right side) */}
            <div className="flex items-center gap-1">
              {/* Language Selector */}
              <div ref={langRef} className="relative">
                <button
                  onClick={() => { setLangOpen(!langOpen); setProfileOpen(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{lang.flag} {lang.label}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[150px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setCurrentLang(l.code);
                          setLangOpen(false);
                          toast({ title: "Idioma", description: `Alterado para ${l.label}` });
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors ${
                          currentLang === l.code ? "text-primary font-medium" : "text-foreground"
                        }`}
                      >
                        <span>{l.flag}</span>
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-border mx-1" />

              {/* Dark/Light Mode Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-border mx-1" />

              {/* Profile Dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setLangOpen(false); }}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    {reviewerProfile?.avatar_url ? (
                      <img src={reviewerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      reviewerProfile?.full_name?.charAt(0)?.toUpperCase() || "R"
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline max-w-[120px] truncate">
                    {reviewerProfile?.full_name || "Reviewer"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[180px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* User info header */}
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-semibold truncate">{reviewerProfile?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {reviewerProfile?.role === "admin" ? "Administrador" : "Reviewer"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/reviewer/profile");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Editar Perfil
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Terminar Sessão
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default ReviewerLayout;
