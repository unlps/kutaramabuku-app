import { supabase } from "@/integrations/supabase/client";

export interface ProfileCompletionStatus {
  hasSession: boolean;
  isComplete: boolean;
}

export const getProfileCompletionStatus = async (): Promise<ProfileCompletionStatus> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      hasSession: false,
      isComplete: false,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("profile_completed")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    hasSession: true,
    isComplete: Boolean(data?.profile_completed),
  };
};
