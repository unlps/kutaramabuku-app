import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Chrome } from "lucide-react";
import logo from "@/assets/logo-new.png";
import authBackground from "@/assets/auth-background.png";
import { authSchema } from "@/lib/validations";
import { getProfileCompletionStatus } from "@/lib/profile-completion";

type SignupStep = "details" | "verify";

const Auth = () => {
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const redirectAfterAuth = async () => {
    const status = await getProfileCompletionStatus();
    if (!status.hasSession) return;

    navigate(status.isComplete ? "/dashboard" : "/complete-profile", {
      replace: true,
    });
  };

  useEffect(() => {
    redirectAfterAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await redirectAfterAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (signupStep !== "verify" || resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [signupStep, resendCooldown]);

  const resetSignupFlow = () => {
    setSignupStep("details");
    setVerificationCode("");
    setPendingSignupEmail("");
    setResendCooldown(0);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationResult = authSchema.safeParse({
        email,
        password,
        fullName: isLogin ? undefined : fullName,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Erro de validacao",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Bem-vindo de volta",
          description: "Entraste com sucesso.",
        });
        return;
      }

      const { data: emailAvailable, error: emailCheckError } = await (supabase as any).rpc("is_email_available", {
        p_email: email,
      });

      if (emailCheckError) throw emailCheckError;
      if (!emailAvailable) {
        throw new Error("Este email já está associado a uma conta.");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        await supabase.auth.signOut();
        throw new Error("Ativa a confirmacao de email no Supabase para exigir o codigo de verificacao.");
      }

      setPendingSignupEmail(email);
      setVerificationCode("");
      setSignupStep("verify");
      setResendCooldown(60);

      toast({
        title: "Codigo enviado",
        description: "Introduz o codigo de 6 digitos enviado para o teu email para concluir o registo.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !pendingSignupEmail) return;

    setLoading(true);

    try {
      const { error } = await (supabase.auth as any).resend({
        type: "signup",
        email: pendingSignupEmail,
      });

      if (error) throw error;

      setResendCooldown(60);
      toast({
        title: "Codigo reenviado",
        description: "Enviamos um novo codigo de verificacao para o teu email.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao reenviar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCode = verificationCode.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      toast({
        title: "Codigo invalido",
        description: "Insere um codigo de 6 digitos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const targetEmail = pendingSignupEmail || email;
      let verifyError: Error | null = null;

      const signupResult = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: normalizedCode,
        type: "signup",
      });
      verifyError = signupResult.error;

      if (verifyError) {
        const fallbackResult = await supabase.auth.verifyOtp({
          email: targetEmail,
          token: normalizedCode,
          type: "email",
        });
        verifyError = fallbackResult.error;
      }

      if (verifyError) throw verifyError;

      toast({
        title: "Email verificado",
        description: "Conta confirmada com sucesso.",
      });

      resetSignupFlow();
      navigate("/complete-profile", { replace: true });
    } catch (error: any) {
      toast({
        title: "Erro na verificacao",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}/auth`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${authBackground})` }}
    >
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-glow p-8 space-y-6">
          <div className="text-center space-y-3">
            <img src={logo} alt="Kutara Mabuku" className="w-16 h-16 mx-auto" />
            <p className="text-muted-foreground">
              {isLogin
                ? "Bem-vindo de volta! Entre para continuar"
                : signupStep === "verify"
                  ? "Verifica o teu email para concluir a criacao da conta"
                  : "Crie sua conta para comecar"}
            </p>
          </div>

          {signupStep !== "verify" && (
            <>
              <Button onClick={handleGoogleAuth} variant="outline" className="w-full" type="button">
                <Chrome className="mr-2 h-4 w-4" />
                Continuar com Google
              </Button>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>
            </>
          )}

          {signupStep === "verify" ? (
            <form onSubmit={handleVerifySignupCode} className="space-y-6">
              <div className="space-y-3 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Verificar codigo</h2>
                <p className="text-sm text-muted-foreground">
                  Introduza o codigo de 6 digitos enviado para <span className="font-medium text-foreground">{pendingSignupEmail || email}</span>.
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="verificationCode" className="sr-only">Codigo de verificacao</Label>
                <InputOTP
                  id="verificationCode"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))}
                  containerClassName="justify-center gap-3"
                  autoFocus
                  pattern="^[0-9]+$"
                >
                  <InputOTPGroup className="gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-14 w-12 rounded-2xl border border-primary/25 bg-background text-lg font-semibold text-foreground shadow-sm transition-all first:rounded-2xl first:border last:rounded-2xl focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <div className="text-center text-sm text-muted-foreground">
                  Nao recebeste o codigo?{" "}
                  {resendCooldown > 0 ? (
                    <span className="font-medium text-primary/80">Podes reenviar em {formatCooldown(resendCooldown)}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="font-semibold text-primary hover:underline"
                    >
                      Reenviar codigo
                    </button>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
                {loading ? "A verificar..." : "Verificar codigo"}
              </Button>

              <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={resetSignupFlow}>
                Voltar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Joao Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
                {loading ? "Carregando..." : isLogin ? "Entrar" : "Enviar codigo"}
              </Button>
            </form>
          )}

          {signupStep !== "verify" && (
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetSignupFlow();
                }}
                className="text-primary hover:underline"
              >
                {isLogin ? "Nao tem uma conta? Criar conta" : "Ja tem uma conta? Entrar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
