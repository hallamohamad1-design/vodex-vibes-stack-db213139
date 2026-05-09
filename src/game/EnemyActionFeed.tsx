import { useEffect, useState } from "react";
import { getMageAI } from "@/game/MirrorMageAI";
import type { EnemyEvent, WorldId } from "@/game/types";
import { cn } from "@/lib/utils";

const counterColor: Record<string, string> = {
  DODGE:     "text-primary",
  PARRY:     "text-gold",
  INTERCEPT: "text-accent",
  SPECIAL:   "text-secondary",
  ATTACK:    "text-accent",
  REGRESS:   "text-red-400",
  MIMIC:     "text-secondary",
};

export function EnemyActionFeed({ worldId }: { worldId: WorldId }) {
  const [events, setEvents] = useState<EnemyEvent[]>(() => getMageAI(worldId).snapshot().events);

  useEffect(() => {
    const ai = getMageAI(worldId);
    setEvents(ai.snapshot().events);
    return ai.subscribeEvents((e) => {
      setEvents((prev) => [...prev.slice(-4), e]); // Only last 5 events
    });
  }, [worldId]);

  return (
    <div className="pointer-events-none absolute right-3 top-20 z-10 w-80 panel scanline p-4 border-red-500/20 bg-black/60 backdrop-blur-md">
      <div className="flex items-baseline justify-between mb-3 border-b border-red-500/10 pb-2">
        <div className="flex flex-col">
          <h3 className="font-title text-[11px] tracking-[0.3em] text-red-500 animate-pulse">
            ENEMY · REGRESSIVE FEED
          </h3>
          <span className="font-mono text-[8px] text-muted-foreground uppercase tracking-widest">
            {worldId} · Neural Monitoring
          </span>
        </div>
        <span className="font-mono text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
          ACTIVE
        </span>
      </div>
      <div className="flex flex-col gap-2 max-h-60 overflow-hidden">
        {events.length === 0 && (
          <span className="font-mono text-[10px] text-muted-foreground/60 italic py-4 text-center">
            Mage is synchronizing… monitoring user patterns.
          </span>
        )}
        {events.slice(-5).map((e) => (
          <div
            key={e.id}
            className="animate-slide-in flex flex-col gap-1 font-mono text-[10px] bg-red-500/5 p-2 rounded border border-white/5"
          >
            <div className="flex justify-between items-center opacity-60">
              <span className="text-[8px] tracking-tighter">
                [{new Date(e.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>
              <span className="text-[8px] text-muted-foreground uppercase">{e.source}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col flex-1">
                <span className="text-[8px] text-muted-foreground uppercase tracking-[1px]">Prediction</span>
                <span className="truncate">{e.predicted ?? "IDLE"}</span>
              </div>
              <span className="text-red-500 font-bold text-lg leading-none mt-1">×</span>
              <div className="flex flex-col flex-1 text-right">
                <span className="text-[8px] text-muted-foreground uppercase tracking-[1px]">Counter</span>
                <span className={cn("font-bold", counterColor[e.counter] ?? "text-foreground")}>
                  {e.counter}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
