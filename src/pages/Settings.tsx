import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { clearProfileCompletionOverride } from "@/lib/profile-completion";
import {
  Moon,
  Languages,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  Info,
  TriangleAlert,
  Chrome,
} from "lucide-react";
import logo from "@/assets/logo-new.png";
import BottomNav from "@/components/BottomNav";

const GOOGLE_REAUTH_WINDOW_MS = 10 * 60 * 1000;

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [authProvider, setAuthProvider] = useState<"google" | "password" | "unknown">("unknown");
  const [recentGoogleAuth, setRecentGoogleAuth] = useState(false);
  const [reauthenticatingGoogle, setReauthenticatingGoogle] = useState(false);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setAccountEmail(user.email || "");

      const providers = Array.isArray(user.app_metadata?.providers)
        ? (user.app_metadata.providers as string[])
        : [];
      const resolvedProvider =
        user.app_metadata?.provider === "google" || providers.includes("google")
          ? "google"
          : "password";

      setAuthProvider(resolvedProvider);

      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
      const isRecent = Boolean(lastSignIn && Date.now() - lastSignIn <= GOOGLE_REAUTH_WINDOW_MS);
      setRecentGoogleAuth(resolvedProvider === "google" && isRecent);

      if (searchParams.get("reauth") === "google-delete") {
        if (resolvedProvider === "google" && isRecent) {
          setDeleteDialogOpen(true);
          toast({
            title: "Google confirmado",
            description: "Ja podes concluir a eliminacao da conta.",
          });
        } else {
          toast({
            title: "Reautenticacao expirada",
            description: "Repete a confirmacao com Google para continuar.",
            variant: "destructive",
          });
        }

        navigate("/settings", { replace: true });
      }
    };

    void loadCurrentUser();
  }, [navigate, searchParams, toast]);

  const canDeleteAccount = useMemo(() => {
    if (!deleteAcknowledged || deletingAccount) return false;
    if (authProvider === "google") return recentGoogleAuth;
    return Boolean(deletePassword.trim());
  }, [authProvider, deleteAcknowledged, deletePassword, deletingAccount, recentGoogleAuth]);

  const handleGoogleReauthentication = async () => {
    setReauthenticatingGoogle(true);

    try {
      const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}/settings?reauth=google-delete`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setReauthenticatingGoogle(false);
      toast({
        title: "Erro ao confirmar com Google",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAcknowledged) {
      toast({
        title: "Confirmacao obrigatoria",
        description: "Marca a opcao que confirma que esta acao e irreversivel.",
        variant: "destructive",
      });
      return;
    }

    if (authProvider !== "google" && !deletePassword.trim()) {
      toast({
        title: "Password obrigatoria",
        description: "Introduz a tua password para confirmar a eliminacao da conta.",
        variant: "destructive",
      });
      return;
    }

    if (authProvider === "google" && !recentGoogleAuth) {
      toast({
        title: "Confirmacao com Google obrigatoria",
        description: "Faz uma confirmacao recente com Google antes de eliminar a conta.",
        variant: "destructive",
      });
      return;
    }

    setDeletingAccount(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.email) {
        throw new Error("Nao foi possivel validar a conta atual.");
      }

      if (authProvider !== "google") {
        const { error: passwordError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: deletePassword,
        });

        if (passwordError) {
          throw new Error("A password introduzida esta incorreta.");
        }
      }

      const { error: deleteError } = await (supabase as any).rpc("delete_current_user");
      if (deleteError) throw deleteError;

      clearProfileCompletionOverride();
      await supabase.auth.signOut();

      toast({
        title: "Conta eliminada",
        description: "A tua conta foi eliminada com sucesso.",
      });

      setDeleteDialogOpen(false);
      setDeletePassword("");
      setDeleteAcknowledged(false);
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast({
        title: "Nao foi possivel eliminar a conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <img src={logo} alt="Kutara Mabuku" className="w-10 h-10 rounded-lg" />
            <h1 className="text-2xl font-bold">Definicoes</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 space-y-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Moon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium">Modo Escuro</span>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
          </div>
        </Card>

        <Card className="p-4 hover:shadow-card transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Languages className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium">Idioma</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Portugues (BR)</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-card transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="font-medium">Metodos de Pagamento</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

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

        <Card className="border-destructive/25 bg-destructive/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Eliminar conta</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Esta acao remove a tua conta e os dados associados. Nao pode ser desfeita.
                </p>
              </div>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Eliminar conta</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tens certeza que queres eliminar a conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Depois da eliminacao, nao sera possivel recuperar a conta.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Conta atual</p>
                    <p className="mt-1">{accountEmail || "Utilizador autenticado"}</p>
                  </div>

                  {authProvider === "google" ? (
                    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Confirmacao com Google</p>
                        <p className="text-sm text-muted-foreground">
                          Para eliminar contas Google, precisas de um login recente com Google.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleReauthentication}
                        disabled={deletingAccount || reauthenticatingGoogle}
                      >
                        <Chrome className="mr-2 h-4 w-4" />
                        {recentGoogleAuth ? "Google confirmado" : reauthenticatingGoogle ? "A confirmar..." : "Confirmar com Google"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="delete-password">Password atual</Label>
                      <Input
                        id="delete-password"
                        type="password"
                        placeholder="Introduz a tua password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                    <Checkbox
                      id="delete-account-acknowledge"
                      checked={deleteAcknowledged}
                      onCheckedChange={(checked) => setDeleteAcknowledged(Boolean(checked))}
                      className="mt-0.5"
                    />
                    <Label htmlFor="delete-account-acknowledge" className="text-sm leading-6 text-foreground">
                      Entendo que esta ação é irreversível.
                    </Label>
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setDeletePassword("");
                      setDeleteAcknowledged(false);
                    }}
                    disabled={deletingAccount}
                  >
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDeleteAccount();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={!canDeleteAccount}
                  >
                    {deletingAccount ? "A eliminar..." : "Confirmar eliminacao"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
