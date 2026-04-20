import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="font-mono text-xs tracking-[0.5em] text-primary text-glow-cyan animate-flicker">
          LOADING ECHO…
        </p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}
