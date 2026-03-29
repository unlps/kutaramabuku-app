import { supabase } from "@/integrations/supabase/client";

const PROFILE_COMPLETION_OVERRIDE_KEY = "kutaramabuku.profile_completed";

export interface ProfileCompletionStatus {
  hasSession: boolean;
  isComplete: boolean;
}

export const setProfileCompletionOverride = () => {
  localStorage.setItem(PROFILE_COMPLETION_OVERRIDE_KEY, "true");
};

export const clearProfileCompletionOverride = () => {
  localStorage.removeItem(PROFILE_COMPLETION_OVERRIDE_KEY);
};

export const getProfileCompletionStatus = async (): Promise<ProfileCompletionStatus> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    clearProfileCompletionOverride();
    return {
      hasSession: false,
      isComplete: false,
    };
  }

  const hasLocalOverride = localStorage.getItem(PROFILE_COMPLETION_OVERRIDE_KEY) === "true";

  if (hasLocalOverride) {
    return {
      hasSession: true,
      isComplete: true,
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
