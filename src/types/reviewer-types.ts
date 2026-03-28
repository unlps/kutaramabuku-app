// ValidaMabuku — Reviewer Dashboard Types
// Local TypeScript types mirroring the Supabase tables

export type ReviewerRole = 'reviewer' | 'admin';
export type ReviewerStatus = 'active' | 'suspended' | 'inactive';
export type SubmissionStatus = 'pending_review' | 'in_review' | 'approved' | 'rejected' | 'revision_requested';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface ReviewerProfile {
  id: string;
  full_name: string;
  editor_secret_id: string;
  publisher_name: string | null;
  phone: string | null;
  secondary_contact: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  role: ReviewerRole;
  status: ReviewerStatus;
  created_at: string;
  updated_at: string;
}

export interface BookSubmission {
  id: string;
  ebook_id: string;
  submitted_by: string;
  reviewer_id: string | null;
  status: SubmissionStatus;
  review_notes: string | null;
  rejection_reason: string | null;
  priority: number;
  submitted_at: string;
  reviewed_at: string | null;
  // Joined fields (from ebooks table)
  ebook?: {
    title: string;
    description: string | null;
    cover_image: string | null;
    author: string | null;
    genre: string | null;
    pages: number | null;
    type: string;
  };
  // Joined fields (from profiles table)
  submitter?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface ReviewerInvitation {
  id: string;
  email: string;
  token: string;
  invited_by: string | null;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

// Dashboard statistics
export interface ReviewerStats {
  pendingCount: number;
  inReviewCount: number;
  approvedToday: number;
  rejectedCount: number;
  totalReviewed: number;
}
