import { Suspense, useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Link, useSearchParams } from "react-router-dom";
import { VodexWorld } from "@/game/worlds/VodexWorld";
import { BattlegroundWorld } from "@/game/worlds/BattlegroundWorld";
import { VirtualWorld } from "@/game/worlds/VirtualWorld";
import { BlockWorld } from "@/game/worlds/BlockWorld";
import { MemoryHUD } from "@/game/MemoryHUD";
import { EnemyActionFeed } from "@/game/EnemyActionFeed";
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
};export function GameScene({ worldId }: Props) {
  const [locked, setLocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
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
    });
    return () => {
      clearInterval(interval);
      unsubEvents();
      saveMemory(user.id, worldId);
      saveStats(user.id, worldId);
    };
  }, [user, worldId, hydrated]);

  // Round Timer Logic
  useEffect(() => {
    if (locked && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setLocked(false);
            toast.info("Round finished! Synchronization complete.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [locked]);

  // Multiplayer Logic
  useEffect(() => {
    if (!isMultiplayer || !user || !inviteId) return;

    const channel = supabase.channel(`game_${inviteId}`);
    
    channel.on("broadcast", { event: "player_state" }, (payload) => {
      // already handled in world components
    }).on("broadcast", { event: "chat" }, (payload) => {
      setGameMessages(prev => [...prev.slice(-10), payload.payload]);
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMultiplayer, inviteId, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (showChat) {
          sendGameChat();
        } else if (locked) {
          setShowChat(true);
        }
      }
      if (e.key === "Escape" && showChat) {
        setShowChat(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showChat, locked, chatInput]);

  const sendGameChat = () => {
    if (!chatInput.trim() || !inviteId) return;
    const msg = { user: user?.email?.split("@")[0] || "Operative", text: chatInput.trim() };
    supabase.channel(`game_${inviteId}`).send({
      type: "broadcast",
      event: "chat",
      payload: msg
    });
    setGameMessages(prev => [...prev.slice(-10), msg]);
    setChatInput("");
    setShowChat(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      {/* Timer Overlay */}
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
        <div className="panel px-4 py-1 bg-black/40 backdrop-blur-md border-primary/30 flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-widest text-primary/60 uppercase">Sync Remaining</span>
          <span className={`font-title text-2xl tracking-widest ${timeLeft < 30 ? "text-red-500 animate-pulse" : "text-primary text-glow-cyan"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        {isMultiplayer && (
          <div className="px-2 py-0.5 bg-secondary/20 border border-secondary/40 rounded text-[8px] font-mono text-secondary uppercase tracking-[2px]">
            Multiplayer Active · {role}
          </div>
        )}
      </div>

      {/* In-Game Chat Overlay */}
      {isMultiplayer && (
        <div className="absolute bottom-6 left-6 z-40 w-80 pointer-events-none">
          <div className="flex flex-col gap-1 mb-4">
            {gameMessages.map((m, i) => (
              <div key={i} className="animate-slide-in bg-black/40 backdrop-blur-sm border-l-2 border-primary/40 p-2 rounded-r">
                <span className="font-mono text-[10px] font-bold text-primary mr-2">{m.user}:</span>
                <span className="font-mono text-[11px] text-white/90">{m.text}</span>
              </div>
            ))}
          </div>
          {showChat && (
            <div className="pointer-events-auto flex gap-2">
              <input
                autoFocus
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Secure channel message..."
                className="flex-1 bg-black/60 border border-primary/40 rounded px-3 py-1.5 font-mono text-xs text-primary focus:border-primary outline-none"
              />
              <button onClick={sendGameChat} className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/40 px-3 py-1 rounded font-title text-[10px] tracking-widest">SEND</button>
            </div>
          )}
          {!showChat && locked && (
            <div className="font-mono text-[9px] text-muted-foreground animate-pulse">PRESS [ENTER] TO CHAT</div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 text-center">
        <h1 className={`font-title text-lg sm:text-2xl tracking-[0.4em] ${m.color}`}>
          {m.name}
        </h1>
        <p className="font-mono text-[10px] sm:text-xs text-muted-foreground">{m.hint}</p>
      </div>

      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <Link to="/leaderboard" className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-gold transition">
          ★ LEADERS
        </Link>
        <Link
          to={`/play/${m.next}`}
          className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-cyan transition"
        >
          ⇄ NEXT
        </Link>
        <Link
          to="/"
          className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-purple transition"
        >
          ⌂ HUB
        </Link>
      </div>

      {(!locked || timeLeft === 0) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="panel scanline relative p-6 sm:p-10 text-center max-w-md mx-4 animate-pop-in">
            <h2 className="font-title text-xl sm:text-2xl tracking-[0.3em] text-primary text-glow-cyan mb-2 uppercase">
              {timeLeft === 0 ? "Session Expired" : "Ready for Sync"}
            </h2>
            <p className="font-mono text-xs text-muted-foreground mb-4">
              {timeLeft === 0 
                ? "The neural link has been severed. Return to Hub to re-establish connection."
                : "Pointer-lock first-person controls. Press ESC to release."}
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
                  <li><span className="text-gold">Q</span> {m.sigs[0]}</li>
                  <li><span className="text-gold">E</span> {m.sigs[1]}</li>
                  <li><span className="text-red-400">R</span> {m.sigs[2]}</li>
                  <li><span className="text-muted-foreground">ESC</span> unlock</li>
                </ul>
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
