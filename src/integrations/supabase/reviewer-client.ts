/**
 * ValidaMabuku — Supabase helpers for reviewer tables.
 *
 * The auto-generated Supabase types in `integrations/supabase/types.ts` don't
 * include the new reviewer tables yet. These helpers provide a typed wrapper
 * until `npx supabase gen types typescript` is re-run after applying migrations.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Supabase query builder for tables not yet in the
 * auto-generated types. This is a thin wrapper around `supabase.from()`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reviewerTable = (table: "reviewer_profiles" | "reviewer_invitations" | "book_submissions") => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table);
};

export { supabase };
