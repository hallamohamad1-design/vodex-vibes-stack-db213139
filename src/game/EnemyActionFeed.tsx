import { useEffect, useState } from "react";
import { getMageAI } from "@/game/MirrorMageAI";
import type { EnemyEvent, WorldId } from "@/game/types";
import { cn } from "@/lib/utils";

const counterColor: Record<string, string> = {
  DODGE:     "text-primary",
  PARRY:     "text-yellow-400",
  INTERCEPT: "text-accent",
  SPECIAL:   "text-secondary",
  ATTACK:    "text-orange-400",
  REGRESS:   "text-red-400",
  MIMIC:     "text-purple-400",
};

const sourceStyle: Record<string, { label: string; classes: string; dot: string }> = {
  queue: {
    label: "QUEUE",
    classes: "text-primary border-primary/40 bg-primary/10",
    dot:    "bg-primary",
  },
  stack: {
    label: "STACK",
    classes: "text-secondary border-secondary/40 bg-secondary/10",
    dot:    "bg-secondary",
  },
};

/** Formats a performance.now() timestamp as HH:MM:SS.mmm */
function formatTs(ts: number): string {
  const d = new Date(Date.now() - performance.now() + ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function EnemyActionFeed({ worldId }: { worldId: WorldId }) {
  const [events, setEvents] = useState<EnemyEvent[]>(() => {
    const initial = getMageAI(worldId).snapshot().events;
    // Filter to last 5 on init
    return initial.slice(-5);
  });

  useEffect(() => {
    const ai = getMageAI(worldId);
    // Reset when worldId changes — only keep last 5
    setEvents(ai.snapshot().events.slice(-5));

    const unsub = ai.subscribeEvents((e) => {
      setEvents((prev) => [...prev.slice(-4), e]);
    });
    return unsub;
  }, [worldId]);

  const src = sourceStyle;

  return (
    <div className="pointer-events-none absolute right-3 top-20 z-10 w-[22rem] select-none">
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between rounded-t-lg border border-red-500/20 bg-black/70 px-3 py-2 backdrop-blur-md">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            <h3 className="font-title text-[10px] tracking-[0.3em] text-red-400">
              REGRESSIVE FEED
            </h3>
          </div>
          <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">
            {worldId} · Neural Monitoring Active
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[8px] text-red-400 uppercase tracking-widest">
            LIVE
          </span>
          <span className="font-mono text-[8px] text-muted-foreground/50">
            last {events.length}/5
          </span>
        </div>
      </div>

      {/* Events list */}
      <div className="flex flex-col gap-1.5 rounded-b-lg border border-t-0 border-red-500/20 bg-black/60 p-2.5 backdrop-blur-md">
        {events.length === 0 && (
          <div className="py-6 text-center font-mono text-[10px] italic text-muted-foreground/50">
            Mage is synchronizing… monitoring your patterns.
          </div>
        )}

        {events.map((e, idx) => {
          const s = src[e.source] ?? src.queue;
          return (
            <div
              key={e.id}
              className="animate-slide-in rounded-md border border-white/5 bg-gradient-to-r from-red-500/5 to-transparent p-2"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {/* Row 1: Timestamp + Source badge */}
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-[8px] text-muted-foreground/60 tabular-nums">
                  [{formatTs(e.timestamp)}]
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest",
                    s.classes
                  )}
                >
                  <span className={cn("h-1 w-1 rounded-full", s.dot)} />
                  {s.label}
                </span>
              </div>

              {/* Row 2: Predicted → Counter */}
              <div className="flex items-center gap-2">
                {/* Predicted */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="mb-0.5 font-mono text-[7px] uppercase tracking-[2px] text-muted-foreground/70">
                    Predicted
                  </span>
                  <span className="truncate font-mono text-[11px] text-foreground/70">
                    {e.predicted ?? "IDLE"}
                  </span>
                </div>

                {/* Arrow divider */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-mono text-[10px] text-red-500/70">→</span>
                </div>

                {/* Counter */}
                <div className="flex min-w-0 flex-1 flex-col items-end text-right">
                  <span className="mb-0.5 font-mono text-[7px] uppercase tracking-[2px] text-muted-foreground/70">
                    Counter
                  </span>
                  <span
                    className={cn(
                      "truncate font-mono text-[12px] font-bold",
                      counterColor[e.counter] ?? "text-foreground"
                    )}
                  >
                    {e.counter}
                  </span>
                </div>
              </div>

              {/* Stack source extra hint */}
              {e.source === "stack" && (
                <div className="mt-1.5 rounded border border-secondary/20 bg-secondary/5 px-1.5 py-0.5">
                  <span className="font-mono text-[7px] text-secondary/80 uppercase tracking-widest">
                    ⚡ Signature Replay Deployed
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-1 flex items-center justify-end gap-3 px-1">
        <span className="flex items-center gap-1 font-mono text-[7px] text-primary/50 uppercase">
          <span className="h-1 w-1 rounded-full bg-primary" /> Queue
        </span>
        <span className="flex items-center gap-1 font-mono text-[7px] text-secondary/50 uppercase">
          <span className="h-1 w-1 rounded-full bg-secondary" /> Stack
        </span>
      </div>
    </div>
  );
}
