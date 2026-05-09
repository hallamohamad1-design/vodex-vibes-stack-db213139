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
      setEvents((prev) => [...prev.slice(-7), e]);
    });
  }, [worldId]);

  return (
    <div className="pointer-events-none absolute right-3 top-20 z-10 w-72 panel scanline p-3">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-title text-[11px] tracking-[0.3em] text-red-400">
          ENEMY · REGRESSIVE FEED
        </h3>
        <span className="font-mono text-[9px] text-muted-foreground">{events.length}/8</span>
      </div>
      <div className="flex flex-col gap-1 max-h-44 overflow-hidden">
        {events.length === 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            The mage is observing… counters appear here.
          </span>
        )}
        {events.slice(-8).map((e) => (
          <div
            key={e.id}
            className="animate-slide-in flex items-center gap-1.5 font-mono text-[10px]"
          >
            <span className="text-muted-foreground">{e.predicted ?? "—"}</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("font-bold", counterColor[e.counter] ?? "text-foreground")}>
              {e.counter}
            </span>
            {e.source === "stack" && (
              <span className="ml-auto text-[8px] tracking-[0.2em] text-red-400/80 border border-red-400/40 rounded px-1">
                STACK
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
