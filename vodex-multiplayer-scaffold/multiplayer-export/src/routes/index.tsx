import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Clock, ScrollText } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-16">
        <section className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Multiplayer Arena</p>
          <h1 className="mt-4 font-display text-5xl sm:text-6xl text-primary text-glow">Realm Duel</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Forge a hero, parley with a rival, and battle for three burning minutes
            across worlds of fire, frost and arcane ruin.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to={user ? "/lobby" : "/auth"}>
              <Button size="lg" className="bg-gold text-primary-foreground shadow-glow">
                {user ? "Enter the Lobby" : "Forge Your Hero"}
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Real Rivals", desc: "Sign up, see who's online, chat to challenge them." },
            { icon: Sparkles, title: "Pick a World", desc: "Five themed arenas, each with its own mood." },
            { icon: Clock, title: "3-Minute Rounds", desc: "Sharp, decisive matches. No drag." },
            { icon: ScrollText, title: "Action History", desc: "Every move stacked & queued for replay." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border/60 bg-card/60 p-5 backdrop-blur">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-display text-lg">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
