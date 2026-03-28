import { useState, useEffect } from "react";
import { reviewerTable } from "@/integrations/supabase/reviewer-client";
import { supabase } from "@/integrations/supabase/client";
import { useReviewerAuth } from "@/hooks/useReviewerAuth";
import ReviewerLayout from "@/components/reviewer/ReviewerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Link2,
  Trash2,
  RefreshCw,
  Mail,
  Shield,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ReviewerInvitation } from "@/types/reviewer-types";

const ReviewerInviteAdmin = () => {
  const { reviewerProfile, isLoading } = useReviewerAuth();
  const { toast } = useToast();

  const [invitations, setInvitations] = useState<ReviewerInvitation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const appUrl =
    (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") ||
    window.location.origin;

  useEffect(() => {
    if (!isLoading && reviewerProfile) {
      // Only allow admin
      if (reviewerProfile.role !== "admin") {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem gerir convites.",
          variant: "destructive",
        });
        return;
      }
      fetchInvitations();
    }
  }, [isLoading, reviewerProfile]);

  const fetchInvitations = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await reviewerTable("reviewer_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setInvitations(data as ReviewerInvitation[]);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setCreating(true);
    try {
      // Check if invitation already exists for this email
      const { data: existing } = await reviewerTable("reviewer_invitations")
        .select("id, status")
        .eq("email", email.trim().toLowerCase())
        .eq("status", "pending")
        .single();

      if (existing) {
        toast({
          title: "Convite já existe",
          description: "Já existe um convite pendente para este email.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      const { data: invitation, error } = await reviewerTable("reviewer_invitations")
        .insert({
          email: email.trim().toLowerCase(),
          invited_by: session?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Convite criado! ✉️",
        description: `Token gerado para ${email}. Copie o link e envie ao reviewer.`,
      });

      setEmail("");
      setDialogOpen(false);
      setInvitations((prev) => [invitation as ReviewerInvitation, ...prev]);
    } catch (error: any) {
      toast({
        title: "Erro ao criar convite",
        description: error.message || "Não foi possível criar o convite.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const getInviteLink = (token: string) => {
    return `${appUrl}/reviewer/invite?token=${token}`;
  };

  const handleCopyLink = async (invitation: ReviewerInvitation) => {
    const link = getInviteLink(invitation.token);
    await navigator.clipboard.writeText(link);
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId(null), 2500);
    toast({
      title: "Link copiado!",
      description: "O link de convite foi copiado para a área de transferência.",
    });
  };

  const handleDeleteInvitation = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await reviewerTable("reviewer_invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      toast({ title: "Convite removido" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o convite.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleExtendInvitation = async (invitation: ReviewerInvitation) => {
    setExtendingId(invitation.id);
    try {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const { data, error } = await reviewerTable("reviewer_invitations")
        .update({
          expires_at: newExpiry.toISOString(),
          status: "pending",
        })
        .eq("id", invitation.id)
        .select()
        .single();

      if (error) throw error;

      setInvitations((prev) =>
        prev.map((inv) => (inv.id === invitation.id ? (data as ReviewerInvitation) : inv))
      );
      toast({
        title: "Convite renovado! ✅",
        description: `O prazo para ${invitation.email} foi extendido por mais 7 dias.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao renovar",
        description: error.message || "Não foi possível renovar o convite.",
        variant: "destructive",
      });
    } finally {
      setExtendingId(null);
    }
  };

  const getStatusBadge = (invitation: ReviewerInvitation) => {
    const isExpired = new Date(invitation.expires_at) < new Date();

    if (invitation.status === "accepted") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> Aceite
        </span>
      );
    }

    if (isExpired || invitation.status === "expired") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
          <AlertTriangle className="h-3 w-3" /> Expirado
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <Clock className="h-3 w-3" /> Pendente
      </span>
    );
  };

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Expirado";
    if (days === 1) return "Expira amanhã";
    return `Expira em ${days} dias`;
  };

  if (isLoading) return null;

  // Access guard
  if (reviewerProfile?.role !== "admin") {
    return (
      <ReviewerLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Shield className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Acesso Restrito</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Apenas administradores e senior reviewers podem gerir convites.
          </p>
        </div>
      </ReviewerLayout>
    );
  }

  const pendingCount = invitations.filter(
    (inv) => inv.status === "pending" && new Date(inv.expires_at) > new Date()
  ).length;
  const acceptedCount = invitations.filter((inv) => inv.status === "accepted").length;

  return (
    <ReviewerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Gestão de Convites</h2>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie tokens de convite para novos reviewers.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 h-11 px-6">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Convite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Convite</DialogTitle>
                <DialogDescription>
                  Introduza o email do reviewer a convidar. Será gerado um token único e um link de
                  registo que pode partilhar.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email-admin">Email do Reviewer *</Label>
                  <Input
                    id="invite-email-admin"
                    type="email"
                    placeholder="novo.revisor@editora.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    O convite expira automaticamente em <strong>7 dias</strong>.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-primary"
                    disabled={creating || !email.trim()}
                  >
                    {creating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        A criar...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Gerar Convite
                      </div>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-card text-center">
            <p className="text-3xl font-bold">{invitations.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </Card>
          <Card className="p-4 bg-gradient-card text-center">
            <p className="text-3xl font-bold text-amber-500">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
          </Card>
          <Card className="p-4 bg-gradient-card text-center">
            <p className="text-3xl font-bold text-emerald-500">{acceptedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Aceites</p>
          </Card>
        </div>

        {/* Invitations List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Convites</h3>
            <Button variant="ghost" size="sm" onClick={fetchInvitations}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {loadingData ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <Card className="p-12 text-center">
              <Mail className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h4 className="text-lg font-semibold mb-2">Nenhum convite</h4>
              <p className="text-muted-foreground text-sm">
                Clique em "Novo Convite" para gerar um token de acesso.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const isExpired =
                  invitation.status !== "accepted" &&
                  new Date(invitation.expires_at) < new Date();
                const isPending = invitation.status === "pending" && !isExpired;

                return (
                  <Card
                    key={invitation.id}
                    className={`p-5 border transition-all duration-200 ${
                      isExpired ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          invitation.status === "accepted"
                            ? "bg-emerald-500/10"
                            : isExpired
                            ? "bg-red-500/10"
                            : "bg-amber-500/10"
                        }`}
                      >
                        <Mail
                          className={`h-5 w-5 ${
                            invitation.status === "accepted"
                              ? "text-emerald-500"
                              : isExpired
                              ? "text-red-500"
                              : "text-amber-500"
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{invitation.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {getStatusBadge(invitation)}
                          {isPending && (
                            <span className="text-xs text-muted-foreground">
                              {getDaysRemaining(invitation.expires_at)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Criado em{" "}
                            {new Date(invitation.created_at).toLocaleDateString("pt-PT", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {/* Token preview */}
                        {isPending && (
                          <div className="mt-2 flex items-center gap-2">
                            <code className="text-[10px] bg-muted px-2 py-1 rounded font-mono text-muted-foreground truncate max-w-xs">
                              {getInviteLink(invitation.token)}
                            </code>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isPending && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => handleCopyLink(invitation)}
                          >
                            {copiedId === invitation.id ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            <span className="ml-1.5 hidden sm:inline">
                              {copiedId === invitation.id ? "Copiado!" : "Copiar Link"}
                            </span>
                          </Button>
                        )}
                        {isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600"
                            onClick={() => handleExtendInvitation(invitation)}
                            disabled={extendingId === invitation.id}
                          >
                            {extendingId === invitation.id ? (
                              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-1.5 hidden sm:inline">Renovar</span>
                          </Button>
                        )}
                        {invitation.status !== "accepted" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            disabled={deletingId === invitation.id}
                          >
                            {deletingId === invitation.id ? (
                              <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ReviewerLayout>
  );
};

export default ReviewerInviteAdmin;
