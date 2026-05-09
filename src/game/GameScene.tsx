import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Link } from "react-router-dom";
import { VodexWorld } from "@/game/worlds/VodexWorld";
import { BattlegroundWorld } from "@/game/worlds/BattlegroundWorld";
import { VirtualWorld } from "@/game/worlds/VirtualWorld";
import { BlockWorld } from "@/game/worlds/BlockWorld";
import { MemoryHUD } from "@/game/MemoryHUD";
import { EnemyActionFeed } from "@/game/EnemyActionFeed";
import { useAuth } from "@/hooks/useAuth";
import { getMageAI } from "@/game/MirrorMageAI";
import { loadMemory, saveMemory, saveStats, logEvent } from "@/game/memoryPersistence";
import type { WorldId } from "@/game/types";

interface Props { worldId: WorldId; }

const META: Record<WorldId, { name: string; hint: string; color: string; next: WorldId; sigs: [string, string, string] }> = {
  vodex:        { name: "VODEX REALM",   hint: "Neon grid · cyan obelisks",        color: "text-primary text-glow-cyan",  next: "battleground", sigs: ["HACK", "OVERLOAD", "KILL"] },
  battleground: { name: "BATTLEGROUND",  hint: "Tactical sands · ruined walls",    color: "text-orange text-glow-gold",   next: "virtual",      sigs: ["GRENADE", "SNIPE", "KILL"] },
  virtual:      { name: "VIRTUAL CORE",  hint: "Cyber data · holo wireframes",     color: "text-primary text-glow-cyan",  next: "blockworld",   sigs: ["GLITCH", "REWIND", "KILL"] },
  blockworld:   { name: "BLOCKWORLD",    hint: "Voxel terrain · blocky golem",     color: "text-green text-glow-gold",    next: "vodex",        sigs: ["MINE", "BUILD", "KILL"] },
};

export function GameScene({ worldId }: Props) {
  const [locked, setLocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const m = META[worldId];
  const { user } = useAuth();

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

  return (
    <div className="fixed inset-0 bg-background">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.7, 8] }}
        onPointerDown={() => setLocked(true)}
      >
        <Suspense fallback={null}>
          {worldId === "vodex"        && <VodexWorld />}
          {worldId === "battleground" && <BattlegroundWorld />}
          {worldId === "virtual"      && <VirtualWorld />}
          {worldId === "blockworld"   && <BlockWorld />}
        </Suspense>
      </Canvas>

      <MemoryHUD worldId={worldId} />
      <EnemyActionFeed worldId={worldId} />

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

      {!locked && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="panel scanline relative p-6 sm:p-10 text-center max-w-md mx-4 animate-pop-in">
            <h2 className="font-title text-xl sm:text-2xl tracking-[0.3em] text-primary text-glow-cyan mb-2">
              CLICK TO ENTER
            </h2>
            <p className="font-mono text-xs text-muted-foreground mb-4">
              Pointer-lock first-person controls. Press ESC to release.
            </p>
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
              ▶ START
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
