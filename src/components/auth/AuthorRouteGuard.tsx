import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getProfileCompletionStatus } from "@/lib/profile-completion";

interface AuthorRouteGuardProps {
  children: ReactNode;
}

export const AuthorRouteGuard = ({ children }: AuthorRouteGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const status = await getProfileCompletionStatus();

        if (!isMounted) return;

        setHasSession(status.hasSession);
        setIsComplete(status.isComplete);
      } catch {
        if (!isMounted) return;
        setHasSession(false);
        setIsComplete(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">A carregar perfil...</div>
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to="/auth" replace />;
  }

  if (!isComplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};
