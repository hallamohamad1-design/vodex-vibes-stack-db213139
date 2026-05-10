/**
 * GameHistoryPanel — Live multiplayer action log.
 *
 * Displays the last N actions from all players in the current session,
 * sourced from both the Circular Queue (short-term patterns) and
 * the Signature Stack (long-term high-importance moves).
 *
 * In multiplayer this panel receives events via Supabase Broadcast
 * (channel: game_{inviteId}) and also logs each local action to
 * the `game_history` table.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { GameHistoryEntry, WorldId } from "@/game/types";

interface Props {
  worldId: WorldId;
  inviteId: string | null;
  isMultiplayer: boolean;
}

const sourceStyle = {
  queue: { label: "Q", classes: "bg-primary/20 text-primary border-primary/30", title: "Circular Queue" },
  stack: { label: "S", classes: "bg-secondary/20 text-secondary border-secondary/30", title: "Signature Stack" },
} as const;

const actionColors: Record<string, string> = {
  ATTACK:   "text-red-400",
  KILL:     "text-yellow-400",
  SPECIAL:  "text-secondary",
  DODGE:    "text-primary",
  BLOCK:    "text-muted-foreground",
  HACK:     "text-primary",
  OVERLOAD: "text-secondary",
  GRENADE:  "text-orange-400",
  SNIPE:    "text-yellow-300",
  GLITCH:   "text-secondary",
  REWIND:   "text-primary",
  MINE:     "text-orange-400",
  BUILD:    "text-green-400",
  SPRINT:   "text-primary/70",
  JUMP:     "text-primary/70",
  MOVE:     "text-muted-foreground",
  HEAL:     "text-green-400",
};

function fmtTime(isoOrMs: string): string {
  try {
    const d = new Date(isoOrMs);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  } catch {
    return "--:--:--";
  }
}

const MAX_ENTRIES = 12;

export function GameHistoryPanel({ worldId, inviteId, isMultiplayer }: Props) {
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Fetch initial history for this session
  useEffect(() => {
    if (!inviteId) return;
    supabase
      .from("game_history")
      .select("*")
      .eq("session_id", inviteId)
      .eq("world", worldId)
      .order("created_at", { ascending: true })
      .limit(MAX_ENTRIES)
      .then(({ data }) => {
        if (data) setEntries(data as GameHistoryEntry[]);
      });
  }, [inviteId, worldId]);

  // Subscribe to realtime INSERT events for this session's game_history
  useEffect(() => {
    if (!inviteId) return;
    const channel = supabase
      .channel(`game_history_${inviteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_history",
          filter: `session_id=eq.${inviteId}`,
        },
        (payload) => {
          const entry = payload.new as GameHistoryEntry;
          setEntries((prev) => [...prev.slice(-(MAX_ENTRIES - 1)), entry]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inviteId]);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  if (!isMultiplayer) return null;

  return (
    <div className="pointer-events-auto absolute left-3 bottom-32 z-20 w-72 flex flex-col">
      {/* Header bar (click to collapse) */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between rounded-t-lg border border-primary/20 bg-black/70 px-3 py-2 backdrop-blur-md transition hover:border-primary/40"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span className="font-title text-[10px] tracking-[0.3em] text-primary">
            GAME HISTORY
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Queue / Stack legend */}
          <span className="font-mono text-[7px] text-primary/50 uppercase">Q=Queue</span>
          <span className="font-mono text-[7px] text-secondary/50 uppercase">S=Stack</span>
          <span className="font-mono text-[8px] text-muted-foreground/60">
            {collapsed ? "▸" : "▾"}
          </span>
        </div>
      </button>

      {/* Entry list */}
      {!collapsed && (
        <div className="max-h-64 overflow-y-auto rounded-b-lg border border-t-0 border-primary/20 bg-black/60 backdrop-blur-md custom-scrollbar">
          {entries.length === 0 ? (
            <p className="px-3 py-4 text-center font-mono text-[9px] italic text-muted-foreground/50">
              Awaiting neural link activity…
            </p>
          ) : (
            <div className="flex flex-col gap-0.5 p-1.5">
              {entries.map((entry, idx) => {
                const s = sourceStyle[entry.source] ?? sourceStyle.queue;
                return (
                  <div
                    key={entry.id ?? idx}
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1 font-mono text-[9px] transition",
                      entry.is_signature
                        ? "border border-secondary/20 bg-secondary/5"
                        : "bg-white/[0.03]"
                    )}
                  >
                    {/* Source badge */}
                    <span
                      className={cn(
                        "flex-none rounded border px-1 py-0.5 text-[8px] font-bold",
                        s.classes
                      )}
                      title={s.title}
                    >
                      {s.label}
                    </span>

                    {/* Player name */}
                    <span className="truncate text-[8px] text-muted-foreground/70 flex-none max-w-[5rem]">
                      {entry.player_username ?? entry.player_id.slice(0, 6)}
                    </span>

                    {/* Action */}
                    <span className={cn("flex-1 truncate font-bold", actionColors[entry.action_type] ?? "text-foreground")}>
                      {entry.action_type}
                      {entry.is_signature && (
                        <span className="ml-1 text-secondary text-[7px]">★SIG</span>
                      )}
                    </span>

                    {/* Timestamp */}
                    <span className="flex-none text-[7px] tabular-nums text-muted-foreground/40">
                      {fmtTime(entry.created_at)}
                    </span>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          )}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
