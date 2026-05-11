import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Swords } from "lucide-react";

export function Navbar() {
  const { profile, user } = useAuth();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <span className="font-display text-lg text-primary text-glow">Realm Duel</span>
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/lobby" className="text-sm text-muted-foreground hover:text-foreground">Lobby</Link>
              <div className="hidden sm:flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-1.5">
                <span className="text-lg">{profile?.avatar ?? "🧙"}</span>
                <div className="leading-tight">
                  <div className="text-xs font-semibold">{profile?.character_name ?? "…"}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{profile?.character_class}</div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
            </>
          ) : (
            <Link to="/auth"><Button size="sm">Enter</Button></Link>
          )}
        </nav>
      </div>
    </header>
  );
}
