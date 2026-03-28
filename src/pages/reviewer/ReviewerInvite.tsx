import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { reviewerTable } from "@/integrations/supabase/reviewer-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import logoLight from "@/assets/validamabuku-logo-light.png";
import logoDark from "@/assets/validamabuku-logo-dark.png";

const ReviewerInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [publisherName, setPublisherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedSecretId, setGeneratedSecretId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;

  useEffect(() => {
    if (!token) {
      setValidatingToken(false);
      setTokenError("Nenhum token de convite fornecido. Verifique o link recebido por email.");
      return;
    }

    const validateToken = async () => {
      try {
        const { data: invitation, error } = await reviewerTable("reviewer_invitations")
          .select("*")
          .eq("token", token)
          .single();

        if (error || !invitation) {
          setTokenError("Token de convite inválido ou expirado.");
          setValidatingToken(false);
          return;
        }

        if (invitation.status === "accepted") {
          setTokenError("Este convite já foi utilizado.");
          setValidatingToken(false);
          return;
        }

        if (new Date(invitation.expires_at) < new Date()) {
          setTokenError("Este convite expirou. Contacte o administrador para um novo convite.");
          setValidatingToken(false);
          return;
        }

        setEmail(invitation.email);
        setTokenValid(true);
      } catch {
        setTokenError("Erro ao validar o convite.");
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call Edge Function — uses service role to create user with email pre-confirmed
      const response = await supabase.functions.invoke("register-reviewer", {
        body: {
          token,
          email,
          password,
          fullName,
          publisherName: publisherName || null,
          phone: phone || null,
          dateOfBirth: dateOfBirth || null,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data as { success: boolean; editor_secret_id: string; error?: string };
      if (result.error) throw new Error(result.error);

      setGeneratedSecretId(result.editor_secret_id);
      setSuccess(true);

      toast({
        title: "Conta de Reviewer criada!",
        description: "Bem-vindo ao ValidaMabuku.",
      });
    } catch (err: any) {
      toast({
        title: "Erro no registo",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logo = theme === "dark" ? logoDark : logoLight;

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">A validar convite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-glow p-8 space-y-6 border border-border/50">
          {/* Logo */}
          <div className="text-center space-y-2">
            <img src={logo} alt="ValidaMabuku" className="w-20 h-20 mx-auto rounded-2xl object-contain" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ValidaMabuku
            </h1>
            <p className="text-sm text-muted-foreground">Registo de Reviewer por Convite</p>
          </div>

          {/* Token Error */}
          {tokenError && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-4">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Convite Inválido</p>
                <p className="text-xs text-destructive/80 mt-0.5">{tokenError}</p>
              </div>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Conta Criada com Sucesso!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    O seu ID Secreto de Editor é:
                  </p>
                </div>
                <div className="bg-muted rounded-xl px-6 py-3 font-mono text-lg tracking-widest font-bold select-all">
                  {generatedSecretId}
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Guarde este ID com segurança. Será necessário para verificações futuras.
                </p>
              </div>
              <Button
                onClick={() => navigate("/reviewer/auth")}
                className="w-full h-12 bg-gradient-primary"
              >
                <Shield className="h-5 w-5 mr-2" />
                Ir para o Login
              </Button>
            </div>
          )}

          {/* Registration Form */}
          {tokenValid && !success && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-fullname">Nome Completo *</Label>
                <Input
                  id="invite-fullname"
                  type="text"
                  placeholder="João da Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  disabled
                  className="h-11 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-password">Palavra-passe *</Label>
                <div className="relative">
                  <Input
                    id="invite-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-publisher">Editora</Label>
                  <Input
                    id="invite-publisher"
                    type="text"
                    placeholder="Nome da editora"
                    value={publisherName}
                    onChange={(e) => setPublisherName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-phone">Contacto</Label>
                  <Input
                    id="invite-phone"
                    type="tel"
                    placeholder="+258 84 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-dob">Data de Nascimento</Label>
                <Input
                  id="invite-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-all duration-300 font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    A criar conta...
                  </div>
                ) : (
                  "Criar Conta de Reviewer"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewerInvite;
