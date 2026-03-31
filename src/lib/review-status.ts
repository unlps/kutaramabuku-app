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
  | "approved"
  | "scheduled"
  | "published";

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
  submission?: LatestSubmission | null,
  publicationStatus?: string | null
): EbookReviewState => {
  // Published state (live and visible to all)
  if (publicationStatus === "published" || (isPublic && !publicationStatus)) {
    return {
      stage: "published",
      label: "Publicado",
      description: "Livro publicado e visível para todos. Edição encerrada.",
      badgeClassName: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      isLocked: true,
      canEdit: false,
      canSubmit: false,
      readOnlyOnly: true,
    };
  }

  // Scheduled state (approved, waiting for release date)
  if (publicationStatus === "scheduled") {
    return {
      stage: "scheduled",
      label: "Agendado",
      description: "Publicação agendada. O livro ficará público na data selecionada.",
      badgeClassName: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      isLocked: true,
      canEdit: false,
      canSubmit: false,
      readOnlyOnly: true,
    };
  }

  // Approved state (approved by reviewers, awaiting author decision to publish)
  if (publicationStatus === "approved" || submission?.status === "approved") {
    return {
      stage: "approved",
      label: "Aprovado",
      description: "Livro aprovado pelos reviewers. Publique agora ou agende a publicação.",
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
      description: "Livro privado. Ainda não foi submetido para avaliação.",
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
        label: "Em avaliação",
        description: "Livro submetido e bloqueado até resposta dos reviewers.",
        badgeClassName: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        isLocked: true,
        canEdit: false,
        canSubmit: false,
        readOnlyOnly: true,
      };
    case "revision_requested":
      return {
        stage: "changes_requested",
        label: "Revisão pedida",
        description: "Os reviewers pediram alterações. Edite e submeta novamente.",
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
        description: "Livro rejeitado. Revise o conteúdo antes de submeter novamente.",
        badgeClassName: "bg-red-500/10 text-red-700 border-red-500/20",
        isLocked: false,
        canEdit: true,
        canSubmit: true,
        readOnlyOnly: false,
      };
    default:
      return {
        stage: "draft",
        label: "Rascunho",
        description: "Livro privado. Ainda não foi submetido para avaliação.",
        badgeClassName: "bg-slate-500/10 text-slate-700 border-slate-500/20",
        isLocked: false,
        canEdit: true,
        canSubmit: true,
        readOnlyOnly: false,
      };
  }
};

/**
 * Check if the given user has any published ebooks.
 * Used to enforce profile privacy rules.
 */
export const hasPublishedBooks = async (userId: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from("ebooks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("publication_status", "published");

  if (error) throw error;
  return (count ?? 0) > 0;
};
