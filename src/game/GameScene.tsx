import { Suspense, useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Link, useSearchParams } from "react-router-dom";
import { VodexWorld } from "@/game/worlds/VodexWorld";
import { BattlegroundWorld } from "@/game/worlds/BattlegroundWorld";
import { VirtualWorld } from "@/game/worlds/VirtualWorld";
import { BlockWorld } from "@/game/worlds/BlockWorld";
import { MemoryHUD } from "@/game/MemoryHUD";
import { EnemyActionFeed } from "@/game/EnemyActionFeed";
import { GameHistoryPanel } from "@/game/GameHistoryPanel";
import { useAuth } from "@/hooks/useAuth";
import { getMageAI } from "@/game/MirrorMageAI";
import { loadMemory, saveMemory, saveStats, logEvent } from "@/game/memoryPersistence";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WorldId } from "@/game/types";

interface Props { worldId: WorldId; }

const META: Record<WorldId, { name: string; hint: string; color: string; next: WorldId; sigs: [string, string, string] }> = {
  vodex:        { name: "VODEX REALM",   hint: "Neon grid · cyan obelisks",        color: "text-primary text-glow-cyan",  next: "battleground", sigs: ["HACK", "OVERLOAD", "KILL"] },
  battleground: { name: "BATTLEGROUND",  hint: "Tactical sands · ruined walls",    color: "text-orange text-glow-gold",   next: "virtual",      sigs: ["GRENADE", "SNIPE", "KILL"] },
  virtual:      { name: "VIRTUAL CORE",  hint: "Cyber data · holo wireframes",     color: "text-primary text-glow-cyan",  next: "blockworld",   sigs: ["GLITCH", "REWIND", "KILL"] },
  blockworld:   { name: "BLOCKWORLD",    hint: "Voxel terrain · blocky golem",     color: "text-green text-glow-gold",    next: "vodex",        sigs: ["MINE", "BUILD", "KILL"] },
};

// Persist a single action to the game_history table and broadcast it
async function logHistoryAction(
  userId: string,
  username: string,
  worldId: WorldId,
  inviteId: string,
  actionType: string,
  source: "queue" | "stack",
  isSignature: boolean
) {
  const { data, error } = await supabase.from("game_history").insert({
    session_id: inviteId,
    player_id: userId,
    world: worldId,
    action_type: actionType,
    source,
    is_signature: isSignature,
  }).select().single();

  if (!error && data) {
    // Broadcast to all session participants with player_username enriched
    supabase.channel(`game_history_${inviteId}`).send({
      type: "broadcast",
      event: "history_entry",
      payload: { ...data, player_username: username },
    });
  }
}

export function GameScene({ worldId }: Props) {
  const [locked, setLocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [username, setUsername] = useState("Operative");
  const [searchParams] = useSearchParams();
  const isMultiplayer = searchParams.get("multiplayer") === "true";
  const role = searchParams.get("role");
  const inviteId = searchParams.get("inviteId");
  const peerName = searchParams.get("peerName");
  const m = META[worldId];
  const { user } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [gameMessages, setGameMessages] = useState<{user: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);

  // Load username from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.username) setUsername(data.username);
    });
  }, [user]);

  // Load memory once per world/user
  useEffect(() => {
    if (!user) { setHydrated(true); return; }
    let cancelled = false;
    loadMemory(user.id, worldId).then(() => { if (!cancelled) setHydrated(true); });
    return () => { cancelled = true; };
  }, [user, worldId]);

  // Persist memory + stats every 5s and on unmount; log enemy events live
  useEffect(() => {
    if (!user || !hydrated) return;
    const interval = setInterval(() => {
      saveMemory(user.id, worldId);
      saveStats(user.id, worldId);
    }, 5000);
    const unsubEvents = getMageAI(worldId).subscribeEvents((e) => {
      logEvent(user.id, worldId, e).catch(() => {});

      // Log AI counter actions to game_history in multiplayer mode
      if (isMultiplayer && inviteId && e.counter) {
        logHistoryAction(
          user.id,
          username,
          worldId,
          inviteId,
          e.counter,
          e.source,
          e.source === "stack"
        );
      }
    });
    return () => {
      clearInterval(interval);
      unsubEvents();
      saveMemory(user.id, worldId);
      saveStats(user.id, worldId);
    };
  }, [user, worldId, hydrated, isMultiplayer, inviteId, username]);

  // Round Timer Logic — only ticks when locked AND time > 0
  useEffect(() => {
    if (locked && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setLocked(false);
            toast.info("⏱ Round over! Neural sync complete. 3:00 elapsed.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [locked]);

  // Multiplayer chat sync
  useEffect(() => {
    if (!isMultiplayer || !user || !inviteId) return;
    const channel = supabase.channel(`game_${inviteId}`);
    channel
      .on("broadcast", { event: "player_state" }, () => { /* handled in world components */ })
      .on("broadcast", { event: "chat" }, (payload) => {
        setGameMessages(prev => [...prev.slice(-10), payload.payload]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isMultiplayer, inviteId, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (showChat) sendGameChat();
        else if (locked) setShowChat(true);
      }
      if (e.key === "Escape" && showChat) setShowChat(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showChat, locked, chatInput]);

  const sendGameChat = () => {
    if (!chatInput.trim() || !inviteId) return;
    const msg = { user: username, text: chatInput.trim() };
    supabase.channel(`game_${inviteId}`).send({
      type: "broadcast",
      event: "chat",
      payload: msg,
    });
    setGameMessages(prev => [...prev.slice(-10), msg]);
    setChatInput("");
    setShowChat(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timerUrgent = timeLeft < 30 && timeLeft > 0;
  const timerWarning = timeLeft < 60 && timeLeft >= 30;

  return (
    <div className="fixed inset-0 bg-background">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.7, 8] }}
        onPointerDown={() => { if (timeLeft > 0 && !showChat) setLocked(true); }}
      >
        <Suspense fallback={null}>
          {worldId === "vodex"        && <VodexWorld isMultiplayer={isMultiplayer} role={role} inviteId={inviteId} peerName={peerName} />}
          {worldId === "battleground" && <BattlegroundWorld isMultiplayer={isMultiplayer} role={role} inviteId={inviteId} peerName={peerName} />}
          {worldId === "virtual"      && <VirtualWorld isMultiplayer={isMultiplayer} role={role} inviteId={inviteId} peerName={peerName} />}
          {worldId === "blockworld"   && <BlockWorld isMultiplayer={isMultiplayer} role={role} inviteId={inviteId} peerName={peerName} />}
        </Suspense>
      </Canvas>

      <MemoryHUD worldId={worldId} />
      <EnemyActionFeed worldId={worldId} />

      {/* Game History Panel — only in multiplayer */}
      <GameHistoryPanel
        worldId={worldId}
        inviteId={inviteId}
        isMultiplayer={isMultiplayer}
      />

      {/* ── Timer Overlay ── */}
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
        <div
          className={`panel px-5 py-1.5 backdrop-blur-md flex items-center gap-3 transition-all ${
            timerUrgent
              ? "border-red-500/60 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              : timerWarning
              ? "border-yellow-500/40 bg-black/50"
              : "border-primary/30 bg-black/40"
          }`}
        >
          <span className="font-mono text-[9px] tracking-widest text-primary/60 uppercase">
            Sync Remaining
          </span>
          <span
            className={`font-title text-2xl tracking-widest tabular-nums ${
              timerUrgent
                ? "text-red-500 animate-pulse"
                : timerWarning
                ? "text-yellow-400"
                : "text-primary text-glow-cyan"
            }`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
        {isMultiplayer && (
          <div className="px-2 py-0.5 bg-secondary/20 border border-secondary/40 rounded text-[8px] font-mono text-secondary uppercase tracking-[2px]">
            Multiplayer · {role === "host" ? "🏠 HOST" : "👤 GUEST"} · vs {peerName}
          </div>
        )}
      </div>

      {/* ── In-Game Chat Overlay ── */}
      {isMultiplayer && (
        <div className="absolute bottom-6 left-6 z-40 w-80 pointer-events-none">
          <div className="flex flex-col gap-1 mb-3">
            {gameMessages.map((msg, i) => (
              <div
                key={i}
                className="animate-slide-in bg-black/50 backdrop-blur-sm border-l-2 border-primary/50 px-2 py-1.5 rounded-r"
              >
                <span className="font-mono text-[10px] font-bold text-primary mr-2">{msg.user}:</span>
                <span className="font-mono text-[11px] text-white/90">{msg.text}</span>
              </div>
            ))}
          </div>
          {showChat ? (
            <div className="pointer-events-auto flex gap-2">
              <input
                autoFocus
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Secure channel…"
                className="flex-1 bg-black/70 border border-primary/50 rounded-l px-3 py-1.5 font-mono text-xs text-primary focus:border-primary outline-none"
              />
              <button
                onClick={sendGameChat}
                className="pointer-events-auto bg-primary/20 hover:bg-primary/40 text-primary border border-primary/40 border-l-0 px-3 py-1 rounded-r font-title text-[10px] tracking-widest transition"
              >
                SEND
              </button>
            </div>
          ) : (
            locked && (
              <div className="font-mono text-[9px] text-muted-foreground/50 animate-pulse">
                [ENTER] to open secure channel
              </div>
            )
          )}
        </div>
      )}

      {/* ── World title ── */}
      <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 text-center">
        <h1 className={`font-title text-lg sm:text-2xl tracking-[0.4em] ${m.color}`}>{m.name}</h1>
        <p className="font-mono text-[10px] sm:text-xs text-muted-foreground">{m.hint}</p>
      </div>

      {/* ── Nav buttons ── */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <Link to="/leaderboard" className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-gold transition">
          ★ LEADERS
        </Link>
        <Link to={`/play/${m.next}`} className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-cyan transition">
          ⇄ NEXT
        </Link>
        <Link to="/" className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-purple transition">
          ⌂ HUB
        </Link>
      </div>

      {/* ── Start / Expired overlay ── */}
      {(!locked || timeLeft === 0) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="panel scanline relative p-6 sm:p-10 text-center max-w-md mx-4 animate-pop-in">
            <h2 className="font-title text-xl sm:text-2xl tracking-[0.3em] text-primary text-glow-cyan mb-2 uppercase">
              {timeLeft === 0 ? "Session Expired" : "Ready for Sync"}
            </h2>
            <p className="font-mono text-xs text-muted-foreground mb-4">
              {timeLeft === 0
                ? "The neural link has been severed. Return to Hub."
                : "Click to enter pointer-lock. Press ESC to release."}
            </p>

            {timeLeft > 0 ? (
              <>
                <ul className="font-mono text-[11px] text-foreground/90 grid grid-cols-2 gap-x-4 gap-y-1 text-left mb-6">
                  <li><span className="text-primary">WASD</span> move</li>
                  <li><span className="text-primary">Mouse</span> look</li>
                  <li><span className="text-primary">Space</span> jump</li>
                  <li><span className="text-primary">Shift</span> sprint</li>
                  <li><span className="text-accent">J</span> attack</li>
                  <li><span className="text-accent">K</span> block</li>
                  <li><span className="text-secondary">L</span> special</li>
                  <li><span className="text-yellow-400">Q</span> {m.sigs[0]}</li>
                  <li><span className="text-yellow-400">E</span> {m.sigs[1]}</li>
                  <li><span className="text-red-400">R</span> {m.sigs[2]}</li>
                  <li><span className="text-muted-foreground">ESC</span> unlock</li>
                  {isMultiplayer && <li><span className="text-primary">↩</span> chat</li>}
                </ul>

                {isMultiplayer && (
                  <div className="mb-4 rounded-md border border-secondary/30 bg-secondary/5 p-3 text-left">
                    <p className="font-mono text-[10px] text-secondary uppercase tracking-widest mb-1">
                      Multiplayer Session Active
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground">
                      Role: <span className="text-secondary">{role?.toUpperCase()}</span> · vs{" "}
                      <span className="text-primary">{peerName}</span> · Limit: <span className="text-yellow-400">3:00</span>
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setLocked(true)}
                  className="relative w-full py-3 font-title text-[13px] tracking-[3px] font-bold uppercase rounded-md text-background overflow-hidden transition hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_0_20px_rgba(0,240,255,0.45)] hover:shadow-[0_0_40px_rgba(0,240,255,0.7),0_0_80px_rgba(0,240,255,0.3)]"
                  style={{ background: "linear-gradient(135deg, #00b8cc, #00f0ff)" }}
                >
                  ▶ START SYNC
                </button>
              </>
            ) : (
              <Link
                to="/lobby"
                className="relative block w-full py-3 font-title text-[13px] tracking-[3px] font-bold uppercase rounded-md text-center text-foreground overflow-hidden transition hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_0_20px_rgba(191,0,255,0.45)]"
                style={{ background: "linear-gradient(135deg, #7b00cc, #bf00ff)" }}
              >
                ↩ BACK TO LOBBY
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
