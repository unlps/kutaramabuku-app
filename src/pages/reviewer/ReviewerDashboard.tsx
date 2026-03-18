import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import type { ReviewerStats, BookSubmission } from "@/types/reviewer-types";

const ReviewerDashboard = () => {
  const { reviewerProfile, isLoading } = useReviewerAuth();
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
      // Pending count
      const { count: pendingCount } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review");

      // In review count
      const { count: inReviewCount } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_review");

      // Approved today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: approvedToday } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("reviewed_at", todayStart.toISOString());

      // Rejected total
      const { count: rejectedCount } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected");

      // Total reviewed by this reviewer
      const { count: totalReviewed } = await reviewerTable("book_submissions")
        .select("*", { count: "exact", head: true })
        .eq("reviewer_id", reviewerProfile?.id)
        .in("status", ["approved", "rejected", "revision_requested"]);

      // Urgent (pending more than 3 days)
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

  return (
    <ReviewerLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold">
            Olá, {reviewerProfile?.full_name?.split(" ")[0]} 👋
          </h2>
          <p className="text-muted-foreground mt-1">
            Aqui está o resumo do painel de revisão.
          </p>
        </div>

        {/* Urgent Alert */}
        {urgentCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {urgentCount} livro{urgentCount > 1 ? "s" : ""} há mais de 3 dias sem revisão
              </p>
              <p className="text-xs text-muted-foreground">Necessita de atenção urgente</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={() => navigate("/reviewer/queue")}
            >
              Ver Fila
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Pendentes
                </p>
                <p className="text-3xl font-bold mt-2">{stats.pendingCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Em Revisão
                </p>
                <p className="text-3xl font-bold mt-2">{stats.inReviewCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookCheck className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Aprovados Hoje
                </p>
                <p className="text-3xl font-bold mt-2 text-emerald-500">{stats.approvedToday}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Total Revistos
                </p>
                <p className="text-3xl font-bold mt-2">{stats.totalReviewed}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Submissions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Submissões Recentes</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => navigate("/reviewer/queue")}
            >
              Ver todos <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {recentSubmissions.length === 0 ? (
            <Card className="p-12 text-center">
              <BookCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h4 className="text-lg font-semibold mb-2">Nenhuma submissão</h4>
              <p className="text-muted-foreground text-sm">
                Ainda não existem livros submetidos para revisão.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((submission) => (
                <Card
                  key={submission.id}
                  className="p-4 hover:shadow-card transition-all duration-200 cursor-pointer group border"
                  onClick={() => navigate(`/reviewer/book/${submission.id}`)}
                >
                  <div className="flex items-center gap-4">
                    {/* Cover */}
                    <div className="w-12 h-16 rounded-lg bg-gradient-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                      {submission.ebook?.cover_image ? (
                        <img
                          src={submission.ebook.cover_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {stripHtml(submission.ebook?.title || "Sem título")}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        por {submission.submitter?.full_name || "Autor desconhecido"}
                        {submission.ebook?.genre && (
                          <span className="ml-2 text-primary/70">· {submission.ebook.genre}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submetido em{" "}
                        {new Date(submission.submitted_at).toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      {getStatusBadge(submission.status)}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-gradient-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Distribuição de Estados</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Pendentes", count: stats.pendingCount, color: "bg-amber-500", total: stats.pendingCount + stats.inReviewCount + stats.approvedToday + stats.rejectedCount },
                { label: "Em Revisão", count: stats.inReviewCount, color: "bg-blue-500", total: stats.pendingCount + stats.inReviewCount + stats.approvedToday + stats.rejectedCount },
                { label: "Aprovados", count: stats.approvedToday, color: "bg-emerald-500", total: stats.pendingCount + stats.inReviewCount + stats.approvedToday + stats.rejectedCount },
                { label: "Rejeitados", count: stats.rejectedCount, color: "bg-red-500", total: stats.pendingCount + stats.inReviewCount + stats.approvedToday + stats.rejectedCount },
              ].map((item) => {
                const percentage = item.total > 0 ? (item.count / item.total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">As Minhas Métricas</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-2xl font-bold text-primary">{stats.totalReviewed}</p>
                <p className="text-xs text-muted-foreground mt-1">Livros Revistos</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-500">{stats.approvedToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Aprovados Hoje</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-2xl font-bold text-amber-500">{stats.pendingCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Na Fila</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-2xl font-bold text-blue-500">{stats.inReviewCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Em Progresso</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ReviewerLayout>
  );
};

export default ReviewerDashboard;
