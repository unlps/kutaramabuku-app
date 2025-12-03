import { Bell } from "lucide-react";
import { useTheme } from "next-themes";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";

const Notifications = () => {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Kutara Mabuku" className="w-10 h-10" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Kutara Mabuku</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Bell className="h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Nada para mostrar</h2>
          <p className="text-muted-foreground text-center">
            Você não tem notificações no momento
          </p>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Notifications;
