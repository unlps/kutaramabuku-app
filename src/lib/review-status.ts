import { supabase } from "@/integrations/supabase/client";

export type SubmissionStatus =
  | "pending_review"
  | "in_review"
  | "approved"
  | "rejected"
  | "revision_requested";

export interface LatestSubmission {
  id: string;
  ebook_id: string;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
}

export type PublicationStage =
  | "draft"
  | "under_review"
  | "changes_requested"
  | "rejected"
  | "approved";

export interface EbookReviewState {
  stage: PublicationStage;
  label: string;
  description: string;
  badgeClassName: string;
  isLocked: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  readOnlyOnly: boolean;
}

export const loadLatestSubmissions = async (ebookIds: string[]) => {
  if (ebookIds.length === 0) return new Map<string, LatestSubmission>();

  const { data, error } = await supabase
    .from("book_submissions")
    .select("id, ebook_id, status, submitted_at, reviewed_at, review_notes, rejection_reason")
    .in("ebook_id", ebookIds)
    .order("submitted_at", { ascending: false });

  if (error) throw error;

  const map = new Map<string, LatestSubmission>();

  for (const row of (data || []) as LatestSubmission[]) {
    if (!map.has(row.ebook_id)) {
      map.set(row.ebook_id, row);
    }
  }

  return map;
};

export const getEbookReviewState = (
  isPublic: boolean | null | undefined,
  submission?: LatestSubmission | null
): EbookReviewState => {
  if (isPublic) {
    return {
      stage: "approved",
      label: "Publicado",
      description: "Livro aprovado e publico. Edicao encerrada.",
      badgeClassName: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      isLocked: true,
      canEdit: false,
      canSubmit: false,
      readOnlyOnly: true,
    };
  }

  if (!submission) {
    return {
      stage: "draft",
      label: "Rascunho",
      description: "Livro privado. Ainda nao foi submetido para avaliacao.",
      badgeClassName: "bg-slate-500/10 text-slate-700 border-slate-500/20",
      isLocked: false,
      canEdit: true,
      canSubmit: true,
      readOnlyOnly: false,
    };
  }

  switch (submission.status) {
    case "pending_review":
    case "in_review":
      return {
        stage: "under_review",
        label: "Em avaliacao",
        description: "Livro submetido e bloqueado ate resposta dos reviewers.",
        badgeClassName: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        isLocked: true,
        canEdit: false,
        canSubmit: false,
        readOnlyOnly: true,
      };
    case "revision_requested":
      return {
        stage: "changes_requested",
        label: "Revisao pedida",
        description: "Os reviewers pediram alteracoes. Edite e submeta novamente.",
        badgeClassName: "bg-purple-500/10 text-purple-700 border-purple-500/20",
        isLocked: false,
        canEdit: true,
        canSubmit: true,
        readOnlyOnly: false,
      };
    case "rejected":
      return {
        stage: "rejected",
        label: "Rejeitado",
        description: "Livro rejeitado. Revise o conteudo antes de submeter novamente.",
        badgeClassName: "bg-red-500/10 text-red-700 border-red-500/20",
        isLocked: false,
        canEdit: true,
        canSubmit: true,
        readOnlyOnly: false,
      };
    case "approved":
      return {
        stage: "approved",
        label: "Publicado",
        description: "Livro aprovado e publico. Edicao encerrada.",
        badgeClassName: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        isLocked: true,
        canEdit: false,
        canSubmit: false,
        readOnlyOnly: true,
      };
    default:
      return {
        stage: "draft",
        label: "Rascunho",
        description: "Livro privado. Ainda nao foi submetido para avaliacao.",
        badgeClassName: "bg-slate-500/10 text-slate-700 border-slate-500/20",
        isLocked: false,
        canEdit: true,
        canSubmit: true,
        readOnlyOnly: false,
      };
  }
};
