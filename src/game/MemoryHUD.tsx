import { useMageMemory } from "@/game/useMageMemory";
import { cn } from "@/lib/utils";
import type { WorldId } from "@/game/types";

const typeColor: Record<string, string> = {
  ATTACK: "bg-accent text-accent-foreground",
  DODGE:  "bg-primary text-primary-foreground",
  BLOCK:  "bg-muted text-foreground",
  MOVE:   "bg-background-2 text-muted-foreground border border-border",
  JUMP:   "bg-background-2 text-primary border border-primary/40",
  SPRINT: "bg-background-2 text-primary border border-primary/40",
  SPECIAL:"bg-secondary text-secondary-foreground",
  KILL:   "bg-gold text-background",
  HEAL:   "bg-green text-background",
  HACK:   "bg-primary/80 text-background border border-primary",
  OVERLOAD:"bg-secondary/80 text-background border border-secondary",
  GRENADE:"bg-orange/80 text-background border border-orange",
  SNIPE:  "bg-gold/80 text-background border border-gold",
  GLITCH: "bg-secondary/80 text-background border border-secondary",
  REWIND: "bg-primary/60 text-background border border-primary",
  MINE:   "bg-orange/70 text-background border border-orange",
  BUILD:  "bg-green/70 text-background border border-green",
};

/** On-screen HUD: live queue/stack/predicted/counter visualization. */
export function MemoryHUD({ worldId }: { worldId?: WorldId } = {}) {
  const m = useMageMemory(worldId);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 p-3 sm:p-5 flex flex-col gap-3 text-foreground">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="panel scanline relative px-3 py-2 font-mono text-xs sm:text-sm">
          <span className="text-primary text-glow-cyan">PREDICTED:</span>{" "}
          <span className="text-foreground">{m.predicted ?? "—"}</span>
          <span className="ml-3 text-secondary text-glow-purple">COUNTER:</span>{" "}
          <span className="text-foreground">{m.lastCounter ?? "—"}</span>
        </div>
        <div className="panel px-3 py-2 font-mono text-xs sm:text-sm">
          <span className="text-muted-foreground">ACTIONS:</span>{" "}
          <span className="text-glow-cyan text-primary">{m.totalActions}</span>
          <span className="ml-3 text-muted-foreground">KILLS:</span>{" "}
          <span className="text-gold">{m.kills}</span>
          <span className="ml-3 text-muted-foreground">SIG:</span>{" "}
          <span className="text-secondary">{m.signatureMoves}</span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="panel p-3 box-glow-cyan/30">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-title text-sm tracking-[0.3em] text-primary text-glow-cyan">
              SHORT-TERM · CIRCULAR QUEUE
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              {m.queue.length} / 50 · FIFO
            </span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-hidden">
            {m.queue.slice(-30).map((a) => (
              <span
                key={a.id}
                className={cn(
                  "animate-slide-in font-mono text-[10px] px-1.5 py-0.5 rounded",
                  typeColor[a.type] ?? "bg-muted"
                )}
              >
                {a.type}
              </span>
            ))}
            {m.queue.length === 0 && (
              <span className="font-mono text-xs text-muted-foreground">
                Move, attack, jump… your habits will fill this queue.
              </span>
            )}
          </div>
        </div>

        <div className="panel p-3">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-title text-sm tracking-[0.3em] text-secondary text-glow-purple">
              LONG-TERM · SIGNATURE STACK
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              {m.stack.length} · LIFO · imp&gt;6
            </span>
          </div>
          <div className="flex flex-col-reverse gap-1 max-h-24 overflow-hidden">
            {m.stack.slice(-6).map((a) => (
              <div
                key={a.id}
                className="animate-pop-in flex items-center gap-2 font-mono text-[11px]"
              >
                <span className={cn("px-1.5 py-0.5 rounded", typeColor[a.type] ?? "bg-muted")}>
                  {a.type}
                </span>
                <span className="text-gold text-glow-gold">imp {a.importanceScore}</span>
                <span className="text-muted-foreground">combo×{a.comboCount}</span>
              </div>
            ))}
            {m.stack.length === 0 && (
              <span className="font-mono text-xs text-muted-foreground">
                Land combos, specials, or kills to push signature moves.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
