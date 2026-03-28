import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { reviewerTable } from "@/integrations/supabase/reviewer-client";
import { useReviewerAuth } from "@/hooks/useReviewerAuth";
import ReviewerLayout from "@/components/reviewer/ReviewerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  BookOpen,
  TrendingUp,
  BarChart3,
  Shield,
  BadgeCheck,
  Building2,
  Settings,
  LogOut,
} from "lucide-react";
import type { ReviewerStats, BookSubmission } from "@/types/reviewer-types";
import logoLight from "@/assets/validamabuku-logo-light.png";
import logoDark from "@/assets/validamabuku-logo-dark.png";

const ReviewerDashboard = () => {
  const { reviewerProfile, isLoading } = useReviewerAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReviewerStats>({
    pendingCount: 0,
    inReviewCount: 0,
    approvedToday: 0,
    rejectedCount: 0,
    totalReviewed: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<BookSubmission[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    if (!isLoading && reviewerProfile) {
      fetchStats();
      fetchRecentSubmissions();
    }
  }, [isLoading, reviewerProfile]);

  const fetchStats = async () => {
    try {
      const { count: pendingCount } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review");

      const { count: inReviewCount } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_review");

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: approvedToday } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("reviewed_at", todayStart.toISOString());

      const { count: rejectedCount } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected");

      const { count: totalReviewed } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("reviewer_id", reviewerProfile?.id)
        .in("status", ["approved", "rejected", "revision_requested"]);

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { count: urgent } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review")
        .lte("submitted_at", threeDaysAgo.toISOString());

      setStats({
        pendingCount: pendingCount || 0,
        inReviewCount: inReviewCount || 0,
        approvedToday: approvedToday || 0,
        rejectedCount: rejectedCount || 0,
        totalReviewed: totalReviewed || 0,
      });
      setUrgentCount(urgent || 0);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentSubmissions = async () => {
    try {
      const { data } = await reviewerTable("book_submissions")
        .select(`
          *,
          ebook:ebooks(title, cover_image, author, genre),
          submitter:profiles!book_submissions_submitted_by_fkey(full_name, avatar_url)
        `)
        .order("submitted_at", { ascending: false })
        .limit(5);

      if (data) {
        setRecentSubmissions(data as unknown as BookSubmission[]);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Clock className="h-3 w-3" /> Pendente
          </span>
        );
      case "in_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <BookOpen className="h-3 w-3" /> Em Revisão
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Aprovado
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
            <XCircle className="h-3 w-3" /> Rejeitado
          </span>
        );
      case "revision_requested":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <AlertTriangle className="h-3 w-3" /> Revisão Pedida
          </span>
        );
      default:
        return null;
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  if (isLoading) return null;

  const logo = theme === "dark" ? logoDark : logoLight;
  const roleBadgeColor =
    reviewerProfile?.role === "admin"
      ? "bg-red-500/10 text-red-500 border-red-500/20"
      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  const roleLabel =
    reviewerProfile?.role === "admin"
      ? "Admin"
      : "Reviewer";

  const total = stats.pendingCount + stats.inReviewCount + stats.approvedToday + stats.rejectedCount;

  return (
    <ReviewerLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* ── Top Row: Profile Card + Welcome Banner ── */}
        <div>
          <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Início / Dashboard ValidaMabuku
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Profile Card */}
          <Card className="p-6 border">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg overflow-hidden">
                {reviewerProfile?.avatar_url ? (
                  <img src={reviewerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  reviewerProfile?.full_name?.charAt(0)?.toUpperCase() || "R"
                )}
              </div>
              <h3 className="text-lg font-bold flex items-center justify-center gap-1.5">
                {reviewerProfile?.full_name || "Reviewer"}
                {reviewerProfile?.role === "admin" ? (
                  <Shield className="h-4 w-4 text-red-500" />
                ) : (
                  <BadgeCheck className="h-4 w-4 text-blue-500" />
                )}
              </h3>
              {reviewerProfile?.publisher_name && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3" />
                  {reviewerProfile.publisher_name}
                </p>
              )}

              <div className="flex gap-2 mt-5 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate("/reviewer/profile")}
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/reviewer/auth");
                  }}
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  Sair
                </Button>
              </div>
            </div>

            {/* Quick links */}
            {reviewerProfile?.role === "admin" && (
              <div className="mt-5 pt-5 border-t border-border space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Atalho
                </p>
                {[
                  { label: "Convidar mais Reviewers", path: "/reviewer/admin/invites", icon: BookCheck },
                ].map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="w-full flex items-center gap-2 text-sm text-primary hover:underline py-1"
                  >
                    <link.icon className="h-3.5 w-3.5" />
                    {link.label}
                  </button>
                ))}
              </div>
            )}
          </Card>
          {/* Welcome Banner */}
          <Card className="lg:col-span-2 p-0 overflow-hidden border relative min-h-[260px] bg-gradient-to-b from-[#0a1628] via-[#162d4a] to-[#3b82a0] text-white shadow-xl dark:border-white/10">
            {/* Background Logo */}
            <img
              src={logo}
              alt=""
              className="absolute -right-40 top-1/2 -translate-y-1/2 w-[900px] h-[900px] object-contain opacity-15 dark:opacity-25 pointer-events-none rotate-12"
            />
            {/* Soft glow behind text */}
            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-emerald-500/15 to-transparent pointer-events-none" />

            <div className="relative p-8 h-full flex flex-col justify-between z-10">
              <div className="max-w-xl">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 leading-tight">
                  Validar livros nunca foi tão fácil.
                </h2>
                <p className="text-emerald-400 font-semibold text-base sm:text-lg mb-2">
                  No ValidaMabuku valide obras de vários autores do KutaraMabuku em poucos cliques.
                </p>
                <p className="text-white/70 text-sm leading-relaxed max-w-lg mb-8">
                  Gerir e validar as submissões de livros. O teu papel é fundamental para garantir a
                  qualidade do catálogo Kutara Mabuku.
                </p>
              </div>

              {/* Action area */}
              <div className="flex items-center">
                <button
                  onClick={() => navigate("/reviewer/queue")}
                  className="flex items-center gap-2 text-sm font-bold text-white/90 hover:text-emerald-400 transition-colors group"
                >
                  <BookCheck className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Ir para fila de revisão <span className="text-white/50 font-normal"></span></span>
                </button>
              </div>

              {/* Urgent alert in corner */}
              {urgentCount > 0 && (
                <div className="absolute top-6 right-6 flex items-center gap-2 bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/30 rounded-full px-4 py-1.5 shadow-lg cursor-pointer hover:bg-amber-500/30 transition-colors"
                  onClick={() => navigate("/reviewer/queue")}
                >
                  <AlertTriangle className="h-4 w-4 animate-pulse" />
                  <p className="text-xs font-semibold">
                    {urgentCount} urgente{urgentCount > 1 ? "s" : ""} na fila
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Pendentes",
              value: stats.pendingCount,
              icon: Clock,
              color: "text-amber-500",
              iconBg: "bg-amber-500/10",
            },
            {
              label: "Em Revisão",
              value: stats.inReviewCount,
              icon: BookCheck,
              color: "text-blue-500",
              iconBg: "bg-blue-500/10",
            },
            {
              label: "Aprovados Hoje",
              value: stats.approvedToday,
              icon: CheckCircle2,
              color: "text-emerald-500",
              iconBg: "bg-emerald-500/10",
            },
            {
              label: "Total Revistos",
              value: stats.totalReviewed,
              icon: TrendingUp,
              color: "text-primary",
              iconBg: "bg-primary/10",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="p-5 border text-center relative overflow-hidden hover:shadow-card transition-all duration-300 group"
            >
              <div className={`w-8 h-8 rounded-lg ${stat.iconBg} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* ── Submissions Table ── */}
        <Card className="border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Submissões Recentes
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs"
              onClick={() => navigate("/reviewer/queue")}
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <BookCheck className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-40" />
              <h4 className="text-base font-semibold mb-1">Nenhuma submissão</h4>
              <p className="text-muted-foreground text-sm">
                Ainda não existem livros submetidos para revisão.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/reviewer/book/${submission.id}`)}
                >
                  {/* Cover */}
                  <div className="w-10 h-14 rounded-lg bg-gradient-primary flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    {submission.ebook?.cover_image ? (
                      <img
                        src={submission.ebook.cover_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-5 w-5 text-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {stripHtml(submission.ebook?.title || "Sem título")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      por {submission.submitter?.full_name || "Autor desconhecido"}
                      {submission.ebook?.genre && (
                        <span className="ml-2 text-primary/70">· {submission.ebook.genre}</span>
                      )}
                    </p>
                  </div>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground hidden md:block flex-shrink-0">
                    {new Date(submission.submitted_at).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>

                  {/* Status */}
                  <div className="flex-shrink-0">{getStatusBadge(submission.status)}</div>

                  {/* Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 hidden sm:flex h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reviewer/book/${submission.id}`);
                    }}
                  >
                    Rever
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Bottom Two-Column ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Distribution Chart */}
          <Card className="border overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm">Distribuição de Estados</h3>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "Pendentes", count: stats.pendingCount, color: "bg-amber-500" },
                { label: "Em Revisão", count: stats.inReviewCount, color: "bg-blue-500" },
                { label: "Aprovados", count: stats.approvedToday, color: "bg-emerald-500" },
                { label: "Rejeitados", count: stats.rejectedCount, color: "bg-red-500" },
              ].map((item) => {
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* My Performance */}
          <Card className="border overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm">As Minhas Métricas</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Livros Revistos", value: stats.totalReviewed, color: "text-primary" },
                  { label: "Aprovados Hoje", value: stats.approvedToday, color: "text-emerald-500" },
                  { label: "Na Fila", value: stats.pendingCount, color: "text-amber-500" },
                  { label: "Em Progresso", value: stats.inReviewCount, color: "text-blue-500" },
                ].map((metric) => (
                  <div key={metric.label} className="text-center p-4 bg-muted/40 rounded-xl">
                    <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ReviewerLayout>
  );
};

export default ReviewerDashboard;
