import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { reviewerTable } from "@/integrations/supabase/reviewer-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";
import logoLight from "@/assets/validamabuku-logo-light.png";
import logoDark from "@/assets/validamabuku-logo-dark.png";

const ReviewerAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editorSecretId, setEditorSecretId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    // If already authenticated as reviewer, redirect
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await reviewerTable("reviewer_profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile && profile.status === "active") {
          navigate("/reviewer/dashboard");
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.session) {
        throw new Error("Sessão não criada. Tente novamente.");
      }

      // Step 2: Verify reviewer profile exists and is active
      const { data: profile, error: profileError } = await reviewerTable("reviewer_profiles")
        .select("*")
        .eq("id", authData.session.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Acesso restrito — esta conta não está registada como reviewer. Contacte o administrador.");
        setLoading(false);
        return;
      }

      if (profile.status !== "active") {
        await supabase.auth.signOut();
        setError("A sua conta de reviewer está suspensa ou inactiva. Contacte o administrador.");
        setLoading(false);
        return;
      }

      // Step 3: Verify Editor Secret ID
      if (editorSecretId && profile.editor_secret_id !== editorSecretId) {
        await supabase.auth.signOut();
        setError("O ID Secreto de Editor não corresponde. Verifique os seus dados.");
        setLoading(false);
        return;
      }

      toast({
        title: "Bem-vindo ao ValidaMabuku!",
        description: `Sessão iniciada como ${profile.full_name}`,
      });

      navigate("/reviewer/dashboard");
    } catch (err: any) {
      setError(err.message || "Erro ao iniciar sessão");
    } finally {
      setLoading(false);
    }
  };

  const logo = theme === "dark" ? logoDark : logoLight;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-secondary/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-glow p-8 space-y-6 border border-border/50">
          {/* Logo & Title */}
          <div className="text-center space-y-2">
            <div className="relative inline-block">
              <img src={logo} alt="ValidaMabuku" className="w-24 h-24 mx-auto rounded-2xl object-contain object-center" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                ValidaMabuku
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Painel de Revisão e Validação de Livros
              </p>
            </div>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
            <Lock className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Acesso restrito a reviewers autorizados. Para obter acesso, contacte o administrador do sistema.
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reviewer-email" className="text-sm font-medium">
                Email Profissional
              </Label>
              <Input
                id="reviewer-email"
                type="email"
                placeholder="revisor@editora.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewer-password" className="text-sm font-medium">
                Palavra-passe
              </Label>
              <div className="relative">
                <Input
                  id="reviewer-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editor-secret-id" className="text-sm font-medium">
                ID Secreto de Editor{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="editor-secret-id"
                type="text"
                placeholder="VM-XXXXXXXXXXXX"
                value={editorSecretId}
                onChange={(e) => setEditorSecretId(e.target.value)}
                className="h-11 font-mono text-sm tracking-wider"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-all duration-300 font-semibold text-base"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  A verificar...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Aceder ao Painel
                </div>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Kutara Mabuku · Painel ValidaMabuku
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewerAuth;
