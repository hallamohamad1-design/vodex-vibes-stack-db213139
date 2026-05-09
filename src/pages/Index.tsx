import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMageMemory } from "@/game/useMageMemory";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Hub = () => {
  const m = useMageMemory();
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username);
      });
  }, [user]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* aurora backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(hsl(187 100% 50% / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(187 100% 50% / 0.1) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      {/* user chip */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3 panel px-4 py-2">
        <span className="font-mono text-[11px] tracking-[0.3em] text-primary text-glow-cyan">
          {username || user?.email?.split("@")[0] || "ECHO"}
        </span>
        <Link
          to="/leaderboard"
          className="font-mono text-[10px] tracking-[0.3em] text-gold hover:text-glow-gold transition"
        >
          ★ LEADERS
        </Link>
        <button
          onClick={signOut}
          className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground hover:text-accent transition"
        >
          LOGOUT
        </button>
      </div>

      <header className="relative z-10 px-6 sm:px-10 pt-16 text-center">
        <p className="font-mono text-xs tracking-[0.6em] text-muted-foreground">
          TEMPORAL · ECHO · v3
        </p>
        <h1 className="mt-3 font-title font-black text-5xl sm:text-7xl tracking-[0.25em] text-primary text-glow-cyan animate-flicker">
          ECHO
        </h1>
        <p className="mt-3 font-body text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto">
          Face your reflection. The Mirror Mage records every step you take in a
          <span className="text-primary text-glow-cyan"> circular queue</span>,
          stores your signature moves on a
          <span className="text-secondary text-glow-purple"> stack</span>,
          then deploys them against you.
        </p>
      </header>

      <main className="relative z-10 mx-auto mt-12 grid w-full max-w-6xl grid-cols-1 gap-5 px-6 sm:grid-cols-2 sm:px-10 pb-12">
        <WorldCard
          to="/play/vodex"
          title="VODEX REALM"
          tag="WORLD · 01"
          desc="Neon grid arena. Cyan obelisks. The original proving ground."
          accent="cyan"
        />
        <WorldCard
          to="/play/battleground"
          title="BATTLEGROUND"
          tag="WORLD · 02"
          desc="Tactical sands. Ruined walls and supply crates. A soldier-clad mirror hunts you."
          accent="gold"
        />
        <WorldCard
          to="/play/virtual"
          title="VIRTUAL CORE"
          tag="WORLD · 03"
          desc="Pure cyberspace. Floating data platforms. A glitch-ghost mimic stalks the wireframe."
          accent="cyan"
        />
        <WorldCard
          to="/play/blockworld"
          title="BLOCKWORLD"
          tag="WORLD · 04"
          desc="Voxel terrain. Cubic trees and sky. A blocky golem golems your every move."
          accent="green"
        />
        <WorldCard
          to="/lobby"
          title="MULTIPLAYER"
          tag="COMMUNICATIONS · LINK"
          desc="Enter the neural hub. Chat with other operatives and challenge them to sync."
          accent="purple"
        />
      </main>

      <section className="relative z-10 mx-auto max-w-5xl px-6 sm:px-10 pb-20">
        <div className="panel scanline relative p-5 sm:p-6">
          <h2 className="font-title tracking-[0.4em] text-sm text-primary text-glow-cyan mb-3">
            LIVE MEMORY · SHARED ACROSS WORLDS
          </h2>
          <div className="grid grid-cols-3 gap-4 font-mono text-xs sm:text-sm">
            <Stat label="QUEUE" value={`${m.queue.length}/50`} accent="text-primary" />
            <Stat label="STACK" value={`${m.stack.length}`} accent="text-secondary" />
            <Stat label="HISTORY" value={`${m.history.length}`} accent="text-gold" />
          </div>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            The Mirror Mage's memory persists between worlds — your habits in Vodex follow you everywhere.
          </p>
        </div>
      </section>

      <footer className="relative z-10 pb-6 text-center font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
        DATA STRUCTURES · QUEUE · STACK · LINKED LIST · DECISION TREE
      </footer>
    </div>
  );
};

function WorldCard({
  to, title, tag, desc, accent,
}: { to: string; title: string; tag: string; desc: string; accent: "cyan" | "gold" | "green" | "purple" }) {
  const map = {
    cyan:  { hover: "hover:box-glow-cyan border-primary/30 hover:border-primary",   text: "text-primary text-glow-cyan" },
    gold:  { hover: "hover:shadow-[0_0_20px_hsl(33_100%_50%/0.5)] border-orange/40 hover:border-orange", text: "text-orange text-glow-gold" },
    green: { hover: "hover:shadow-[0_0_20px_hsl(152_100%_50%/0.5)] border-green/40 hover:border-green",  text: "text-green text-glow-gold" },
    purple: { hover: "hover:box-glow-purple border-secondary/30 hover:border-secondary", text: "text-secondary text-glow-purple" },
  }[accent];
  return (
    <Link to={to} className={`panel scanline relative p-6 transition group ${map.hover}`}>
      <p className="font-mono text-[10px] tracking-[0.5em] text-muted-foreground">{tag}</p>
      <h3 className={`mt-2 font-title text-2xl sm:text-3xl tracking-[0.3em] ${map.text}`}>
        {title}
      </h3>
      <p className="mt-3 text-sm text-foreground/80">{desc}</p>
      <span className="mt-5 inline-block font-mono text-xs tracking-[0.4em] text-foreground/90 group-hover:translate-x-1 transition">
        ENTER →
      </span>
    </Link>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="text-center">
      <div className={`font-title text-2xl ${accent}`}>{value}</div>
      <div className="text-muted-foreground tracking-[0.4em] text-[10px] mt-1">{label}</div>
    </div>
  );
}

export default Hub;
