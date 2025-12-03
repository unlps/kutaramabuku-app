import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Moon, 
  Languages, 
  ChevronRight,
  ChevronLeft,
  CreditCard,
  Info
} from "lucide-react";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img src={logo} alt="Kutara Mabuku" className="w-10 h-10 rounded-lg" />
            <h1 className="text-2xl font-bold">Definições</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Dark Mode Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Moon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium">Modo Escuro</span>
            </div>
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
            />
          </div>
        </Card>

        {/* Language Setting */}
        <Card className="p-4 hover:shadow-card transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Languages className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium">Idioma</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Português (BR)</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Card>

        {/* Payment Methods */}
        <Card className="p-4 hover:shadow-card transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-medium">Métodos de Pagamento</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* About Kutara Mabuku */}
        <Card className="p-4 hover:shadow-card transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Info className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium">Sobre Kutara Mabuku</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Settings;