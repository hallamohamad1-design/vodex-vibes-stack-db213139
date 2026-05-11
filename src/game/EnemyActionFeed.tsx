import { useEffect, useState, useMemo } from "react";
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

/** Format relative time ago */
function formatTimeAgo(ts: number): string {
  const elapsed = performance.now() - ts;
  if (elapsed < 1000) return "just now";
  if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s ago`;
  return `${Math.floor(elapsed / 60000)}m ago`;
}

const MAX_EVENTS_PER_WORLD = 5;

export function EnemyActionFeed({ worldId }: { worldId: WorldId }) {
  const [events, setEvents] = useState<EnemyEvent[]>(() => {
    const initial = getMageAI(worldId).snapshot().events;
    // Filter to last N events for this world
    return initial.slice(-MAX_EVENTS_PER_WORLD);
  });

  useEffect(() => {
    const ai = getMageAI(worldId);
    // Reset when worldId changes — only keep last N events
    setEvents(ai.snapshot().events.slice(-MAX_EVENTS_PER_WORLD));

    const unsub = ai.subscribeEvents((e) => {
      setEvents((prev) => {
        const newEvents = [...prev, e];
        // Keep only last N events per world
        return newEvents.slice(-MAX_EVENTS_PER_WORLD);
      });
    });
    return unsub;
  }, [worldId]);
  
  // Filter events to only show relevant ones for current world
  const relevantEvents = useMemo(() => {
    return events.slice(-MAX_EVENTS_PER_WORLD);
  }, [events]);

  const src = sourceStyle;
  
  // Filter events to only show relevant ones for current world
  const relevantEvents = useMemo(() => {
    return events.slice(-MAX_EVENTS_PER_WORLD);
  }, [events]);

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

      {/* Events list - Only show last N relevant events */}
      <div className="flex flex-col gap-1.5 rounded-b-lg border border-t-0 border-red-500/20 bg-black/60 p-2.5 backdrop-blur-md">
        {relevantEvents.length === 0 && (
          <div className="py-6 text-center font-mono text-[10px] italic text-muted-foreground/50">
            Mage is synchronizing… monitoring your patterns.
          </div>
        )}

        {relevantEvents.map((e, idx) => {
          const s = src[e.source] ?? src.queue;
          const isRecent = (performance.now() - e.timestamp) < 3000;
          return (
            <div
              key={e.id}
              className={cn(
                "animate-slide-in rounded-md border p-2 transition-all duration-300",
                isRecent 
                  ? "border-red-500/40 bg-gradient-to-r from-red-500/15 to-transparent" 
                  : "border-white/5 bg-gradient-to-r from-red-500/5 to-transparent"
              )}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {/* Row 1: Timestamp + Source badge + Time ago */}
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] text-muted-foreground/60 tabular-nums">
                    [{formatTs(e.timestamp)}]
                  </span>
                  <span className="font-mono text-[7px] text-muted-foreground/40">
                    {formatTimeAgo(e.timestamp)}
                  </span>
                </div>
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
                  <span className={cn(
                    "truncate font-mono text-[11px]",
                    e.predicted ? "text-foreground/70" : "text-muted-foreground/50 italic"
                  )}>
                    {e.predicted ?? "IDLE"}
                  </span>
                </div>

                {/* Arrow divider */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className={cn(
                    "font-mono text-[10px]",
                    isRecent ? "text-red-400" : "text-red-500/70"
                  )}>→</span>
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

              {/* Stack source extra hint - Signature move indicator */}
              {e.source === "stack" && (
                <div className="mt-1.5 rounded border border-secondary/20 bg-secondary/5 px-1.5 py-0.5">
                  <span className="font-mono text-[7px] text-secondary/80 uppercase tracking-widest">
                    ⚡ Signature Replay Deployed (Stack)
                  </span>
                </div>
              )}
              
              {/* Queue prediction indicator */}
              {e.source === "queue" && e.predicted && (
                <div className="mt-1.5 rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5">
                  <span className="font-mono text-[7px] text-primary/80 uppercase tracking-widest">
                    📊 Pattern Predicted (Queue)
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
          <span className="h-1 w-1 rounded-full bg-primary" /> Queue (Pattern)
        </span>
        <span className="flex items-center gap-1 font-mono text-[7px] text-secondary/50 uppercase">
          <span className="h-1 w-1 rounded-full bg-secondary" /> Stack (Signature)
        </span>
      </div>
    </div>
  );
}
