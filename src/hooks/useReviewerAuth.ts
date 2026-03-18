import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { reviewerTable } from "@/integrations/supabase/reviewer-client";
import type { ReviewerProfile } from "@/types/reviewer-types";

interface UseReviewerAuthReturn {
  reviewerProfile: ReviewerProfile | null;
  isLoading: boolean;
  isAuthorized: boolean;
  userId: string | null;
}

export const useReviewerAuth = (redirectOnFail = true): UseReviewerAuthReturn => {
  const [reviewerProfile, setReviewerProfile] = useState<ReviewerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkReviewerAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (redirectOnFail) navigate("/reviewer/auth");
          setIsLoading(false);
          return;
        }

        setUserId(session.user.id);

        // Check if user has a reviewer profile
        const { data: profile, error } = await reviewerTable("reviewer_profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          if (redirectOnFail) navigate("/reviewer/auth");
          setIsLoading(false);
          return;
        }

        if (profile.status !== "active") {
          if (redirectOnFail) navigate("/reviewer/auth");
          setIsLoading(false);
          return;
        }

        setReviewerProfile(profile as ReviewerProfile);
        setIsAuthorized(true);
      } catch {
        if (redirectOnFail) navigate("/reviewer/auth");
      } finally {
        setIsLoading(false);
      }
    };

    checkReviewerAuth();
  }, [navigate, redirectOnFail]);

  return { reviewerProfile, isLoading, isAuthorized, userId };
};
