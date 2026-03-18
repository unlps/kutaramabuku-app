import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { reviewerTable } from "@/integrations/supabase/reviewer-client";
import { useReviewerAuth } from "@/hooks/useReviewerAuth";
import ReviewerLayout from "@/components/reviewer/ReviewerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import type { BookSubmission, SubmissionStatus } from "@/types/reviewer-types";
import { useToast } from "@/hooks/use-toast";

const ReviewerQueue = () => {
  const { reviewerProfile, isLoading } = useReviewerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<BookSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<BookSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && reviewerProfile) {
      fetchSubmissions();
    }
  }, [isLoading, reviewerProfile]);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, statusFilter, searchQuery]);

  const fetchSubmissions = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await reviewerTable("book_submissions")
        .select(`
          *,
          ebook:ebooks(title, cover_image, author, genre, pages, type, description),
          submitter:profiles!book_submissions_submitted_by_fkey(full_name, avatar_url, email)
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setSubmissions(data as unknown as BookSubmission[]);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = [...submissions];

    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.ebook?.title?.toLowerCase().includes(query) ||
          s.ebook?.author?.toLowerCase().includes(query) ||
          s.submitter?.full_name?.toLowerCase().includes(query)
      );
    }

    setFilteredSubmissions(filtered);
  };

  const handleStartReview = async (submissionId: string) => {
    try {
      const { error } = await reviewerTable("book_submissions")
        .update({
          status: "in_review" as SubmissionStatus,
          reviewer_id: reviewerProfile?.id,
        })
        .eq("id", submissionId);

      if (error) throw error;

      toast({
        title: "Revisão iniciada",
        description: "O livro foi atribuído a si para revisão.",
      });

      navigate(`/reviewer/book/${submissionId}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a revisão.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "in_review":
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "revision_requested":
        return <AlertTriangle className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_review": return "Pendente";
      case "in_review": return "Em Revisão";
      case "approved": return "Aprovado";
      case "rejected": return "Rejeitado";
      case "revision_requested": return "Revisão Pedida";
      default: return status;
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "pending_review": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "in_review": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "approved": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "rejected": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "revision_requested": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDaysAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    return `Há ${days} dias`;
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  if (isLoading) return null;

  return (
    <ReviewerLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Fila de Revisão</h2>
          <p className="text-muted-foreground mt-1">
            Livros submetidos para validação.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título, autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-11">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending_review">Pendentes</SelectItem>
                <SelectItem value="in_review">Em Revisão</SelectItem>
                <SelectItem value="approved">Aprovados</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
                <SelectItem value="revision_requested">Revisão Pedida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filteredSubmissions.length} resultado{filteredSubmissions.length !== 1 ? "s" : ""}
        </p>

        {/* Submissions List */}
        {loadingData ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-20 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-1/5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h4 className="text-lg font-semibold mb-2">Nenhuma submissão encontrada</h4>
            <p className="text-muted-foreground text-sm">
              {searchQuery || statusFilter !== "all"
                ? "Tente ajustar os filtros de pesquisa."
                : "Ainda não existem livros submetidos para revisão."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map((submission) => {
              const isUrgent =
                submission.status === "pending_review" &&
                (Date.now() - new Date(submission.submitted_at).getTime()) / (1000 * 60 * 60 * 24) > 3;

              return (
                <Card
                  key={submission.id}
                  className={`p-5 hover:shadow-card transition-all duration-200 cursor-pointer group border ${
                    isUrgent ? "border-amber-500/30 bg-amber-500/5" : ""
                  }`}
                  onClick={() => navigate(`/reviewer/book/${submission.id}`)}
                >
                  <div className="flex items-center gap-4">
                    {/* Cover */}
                    <div className="w-14 h-20 rounded-lg bg-gradient-primary flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {submission.ebook?.cover_image ? (
                        <img
                          src={submission.ebook.cover_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-7 w-7 text-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {stripHtml(submission.ebook?.title || "Sem título")}
                        </h4>
                        {isUrgent && (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white">
                            URGENTE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        por {submission.submitter?.full_name || "Desconhecido"}
                        {submission.ebook?.genre && ` · ${submission.ebook.genre}`}
                        {submission.ebook?.pages && ` · ${submission.ebook.pages} págs`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getDaysAgo(submission.submitted_at)}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="flex-shrink-0 hidden sm:block">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(
                          submission.status
                        )}`}
                      >
                        {getStatusIcon(submission.status)}
                        {getStatusLabel(submission.status)}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      {submission.status === "pending_review" ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartReview(submission.id);
                          }}
                          className="bg-gradient-primary hover:opacity-90 h-9"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Iniciar</span>
                        </Button>
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ReviewerLayout>
  );
};

export default ReviewerQueue;
