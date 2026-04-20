import { Link } from "react-router-dom";
import { useMageMemory } from "@/game/useMageMemory";

const Hub = () => {
  const m = useMageMemory();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* aurora backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <header className="relative z-10 px-6 sm:px-10 pt-10 text-center">
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

      <main className="relative z-10 mx-auto mt-12 grid w-full max-w-5xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 sm:px-10 pb-16">
        <WorldCard
          to="/play/vodex"
          title="VODEX REALM"
          tag="WORLD · 01"
          desc="Neon grid arena. Cyan obelisks. The original proving ground — now with full first-person movement, jumping, and sprint."
          accent="primary"
        />
        <WorldCard
          to="/play/aether"
          title="AETHER SPIRE"
          tag="WORLD · 02 · NEW"
          desc="Replaces HUP. A floating ritual circle of violet platforms and gold shards, where the Mage burns brighter."
          accent="secondary"
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
            The Mirror Mage's memory persists between worlds — your habits in Vodex follow you to Aether.
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
}: { to: string; title: string; tag: string; desc: string; accent: "primary" | "secondary" }) {
  const cls = accent === "primary"
    ? "hover:box-glow-cyan border-primary/30 hover:border-primary"
    : "hover:box-glow-purple border-secondary/30 hover:border-secondary";
  const text = accent === "primary" ? "text-primary text-glow-cyan" : "text-secondary text-glow-purple";
  return (
    <Link to={to} className={`panel scanline relative p-6 transition group ${cls}`}>
      <p className="font-mono text-[10px] tracking-[0.5em] text-muted-foreground">{tag}</p>
      <h3 className={`mt-2 font-title text-2xl sm:text-3xl tracking-[0.3em] ${text}`}>
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
