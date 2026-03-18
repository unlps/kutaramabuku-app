import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { reviewerTable } from "@/integrations/supabase/reviewer-client";
import { useReviewerAuth } from "@/hooks/useReviewerAuth";
import ReviewerLayout from "@/components/reviewer/ReviewerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Calendar,
  Tag,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BookSubmission, SubmissionStatus } from "@/types/reviewer-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapter_order: number;
}

const ReviewerBookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { reviewerProfile, isLoading } = useReviewerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [submission, setSubmission] = useState<BookSubmission | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    if (!isLoading && reviewerProfile && id) {
      fetchSubmission();
    }
  }, [isLoading, reviewerProfile, id]);

  const fetchSubmission = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await reviewerTable("book_submissions")
        .select(`
          *,
          ebook:ebooks(id, title, cover_image, author, genre, pages, type, description, created_at),
          submitter:profiles!book_submissions_submitted_by_fkey(full_name, avatar_url, email)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setSubmission(data as unknown as BookSubmission);
      setReviewNotes(data.review_notes || "");

      // Fetch chapters
      if (data.ebook_id) {
        const { data: chaptersData } = await supabase
          .from("chapters")
          .select("*")
          .eq("ebook_id", data.ebook_id)
          .order("chapter_order", { ascending: true });

        if (chaptersData) {
          setChapters(chaptersData);
        }
      }
    } catch (error) {
      console.error("Error fetching submission:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da submissão.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleAction = async (newStatus: SubmissionStatus) => {
    if (!submission || !reviewerProfile) return;

    setActionLoading(newStatus);
    try {
      if (newStatus === "in_review") {
        const { error } = await reviewerTable("book_submissions")
          .update({
            status: newStatus,
            reviewer_id: reviewerProfile.id,
            review_notes: reviewNotes,
            reviewed_at: null,
          })
          .eq("id", submission.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any).rpc("reviewer_resolve_submission", {
          p_submission_id: submission.id,
          p_status: newStatus,
          p_review_notes: reviewNotes || null,
          p_rejection_reason: newStatus === "rejected" ? rejectionReason : null,
        });

        if (error) throw error;
      }

      const actionLabels: Record<string, string> = {
        approved: "Livro aprovado com sucesso!",
        rejected: "Livro rejeitado.",
        revision_requested: "Pedido de revisão enviado ao autor.",
        in_review: "Revisão iniciada.",
      };

      toast({
        title: actionLabels[newStatus] || "Estado actualizado",
        description: "A submissão foi actualizada.",
      });

      setShowRejectDialog(false);
      fetchSubmission();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível actualizar a submissão.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; classes: string }> = {
      pending_review: { label: "Pendente", classes: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      in_review: { label: "Em Revisão", classes: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      approved: { label: "Aprovado", classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
      rejected: { label: "Rejeitado", classes: "bg-red-500/10 text-red-600 border-red-500/20" },
      revision_requested: { label: "Revisão Pedida", classes: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    };
    return statusMap[status] || { label: status, classes: "bg-muted" };
  };

  if (isLoading || loadingData) {
    return (
      <ReviewerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </ReviewerLayout>
    );
  }

  if (!submission) {
    return (
      <ReviewerLayout>
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Submissão não encontrada</h3>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/reviewer/queue")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à Fila
          </Button>
        </div>
      </ReviewerLayout>
    );
  }

  const statusDisplay = getStatusDisplay(submission.status);
  const canReview = submission.status === "in_review" || submission.status === "pending_review";

  return (
    <ReviewerLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/reviewer/queue")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à Fila
        </Button>

        {/* Book Header */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Cover */}
          <div className="flex-shrink-0">
            <div className="w-48 h-64 rounded-xl bg-gradient-primary flex items-center justify-center overflow-hidden shadow-card">
              {submission.ebook?.cover_image ? (
                <img
                  src={submission.ebook.cover_image}
                  alt={stripHtml(submission.ebook.title || "")}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpen className="h-16 w-16 text-white" />
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusDisplay.classes}`}
                >
                  {statusDisplay.label}
                </span>
                {submission.priority > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    PRIORIDADE
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold">
                {stripHtml(submission.ebook?.title || "Sem título")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1 line-clamp-3">
                {stripHtml(submission.ebook?.description || "Sem descrição")}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{submission.ebook?.author || submission.submitter?.full_name || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span>{submission.ebook?.genre || "Sem género"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{submission.ebook?.pages || 0} páginas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(submission.submitted_at).toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Submetido por{" "}
                <strong className="text-foreground">
                  {submission.submitter?.full_name || "Desconhecido"}
                </strong>{" "}
                ({submission.submitter?.email || ""})
              </span>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div>
          <h3 className="text-lg font-bold mb-4">
            Capítulos ({chapters.length})
          </h3>
          {chapters.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">Nenhum capítulo encontrado</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <Card key={chapter.id} className="overflow-hidden border">
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {chapter.chapter_order}
                      </span>
                      <span className="font-medium text-sm">{stripHtml(chapter.title)}</span>
                    </div>
                    {expandedChapters.has(chapter.id) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {expandedChapters.has(chapter.id) && (
                    <div className="px-4 pb-4 border-t">
                      <div
                        className="prose prose-sm max-w-none mt-4 rich-text-content"
                        dangerouslySetInnerHTML={{ __html: chapter.content }}
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Review Actions */}
        {canReview && (
          <Card className="p-6 bg-gradient-card border-2 border-primary/10">
            <h3 className="text-lg font-bold mb-4">Decisão de Revisão</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review-notes">Notas de Revisão</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Escreva as suas observações sobre o livro..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleAction("approved")}
                  disabled={!!actionLoading}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {actionLoading === "approved" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Aprovar Publicação
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleAction("revision_requested")}
                  disabled={!!actionLoading}
                  variant="outline"
                  className="flex-1 h-12 border-purple-500/30 text-purple-600 hover:bg-purple-500/10 font-semibold"
                >
                  {actionLoading === "revision_requested" ? (
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Pedir Revisão
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={!!actionLoading}
                  variant="outline"
                  className="flex-1 h-12 border-red-500/30 text-red-600 hover:bg-red-500/10 font-semibold"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Already reviewed info */}
        {!canReview && submission.review_notes && (
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-3">Notas da Revisão</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {submission.review_notes}
            </p>
            {submission.rejection_reason && (
              <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <p className="text-sm font-medium text-red-600">Motivo de rejeição:</p>
                <p className="text-sm text-red-600/80 mt-1">{submission.rejection_reason}</p>
              </div>
            )}
            {submission.reviewed_at && (
              <p className="text-xs text-muted-foreground mt-3">
                Revisto em{" "}
                {new Date(submission.reviewed_at).toLocaleDateString("pt-PT", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </Card>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Publicação</DialogTitle>
            <DialogDescription>
              Indique o motivo da rejeição. Esta informação será enviada ao autor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo de Rejeição *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explique por que o livro não pode ser publicado..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("rejected")}
              disabled={!rejectionReason.trim() || !!actionLoading}
            >
              {actionLoading === "rejected" ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirmar Rejeição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ReviewerLayout>
  );
};

export default ReviewerBookDetail;
