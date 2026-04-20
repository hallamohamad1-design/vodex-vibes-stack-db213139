import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Link } from "react-router-dom";
import { VodexWorld } from "@/game/worlds/VodexWorld";
import { AetherWorld } from "@/game/worlds/AetherWorld";
import { MemoryHUD } from "@/game/MemoryHUD";

interface Props { worldId: "vodex" | "aether"; }

const META = {
  vodex:  { name: "VODEX REALM",  hint: "Neon grid · cyan obelisks", color: "text-primary text-glow-cyan" },
  aether: { name: "AETHER SPIRE", hint: "Violet ritual · gold runes", color: "text-secondary text-glow-purple" },
};

export function GameScene({ worldId }: Props) {
  const [locked, setLocked] = useState(false);
  const m = META[worldId];

  return (
    <div className="fixed inset-0 bg-background">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.7, 8] }}
        onPointerDown={() => setLocked(true)}
      >
        <Suspense fallback={null}>
          {worldId === "vodex" ? <VodexWorld /> : <AetherWorld />}
        </Suspense>
      </Canvas>

      <MemoryHUD />

      {/* World tag (top center) */}
      <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 text-center">
        <h1 className={`font-title text-lg sm:text-2xl tracking-[0.4em] ${m.color}`}>
          {m.name}
        </h1>
        <p className="font-mono text-[10px] sm:text-xs text-muted-foreground">{m.hint}</p>
      </div>

      {/* Top-right nav */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <Link
          to={worldId === "vodex" ? "/play/aether" : "/play/vodex"}
          className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-cyan transition"
        >
          ⇄ {worldId === "vodex" ? "AETHER" : "VODEX"}
        </Link>
        <Link
          to="/"
          className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-purple transition"
        >
          ⌂ HUB
        </Link>
      </div>

      {/* Click-to-play overlay */}
      {!locked && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="panel scanline relative p-6 sm:p-10 text-center max-w-md mx-4 animate-pop-in">
            <h2 className="font-title text-xl sm:text-2xl tracking-[0.3em] text-primary text-glow-cyan mb-2">
              CLICK TO ENTER
            </h2>
            <p className="font-mono text-xs text-muted-foreground mb-4">
              Pointer-lock first-person controls. Press ESC to release.
            </p>
            <ul className="font-mono text-[11px] text-foreground/90 grid grid-cols-2 gap-x-4 gap-y-1 text-left">
              <li><span className="text-primary">WASD</span> move</li>
              <li><span className="text-primary">Mouse</span> look</li>
              <li><span className="text-primary">Space</span> jump</li>
              <li><span className="text-primary">Shift</span> sprint</li>
              <li><span className="text-accent">J</span> attack</li>
              <li><span className="text-accent">K</span> block</li>
              <li><span className="text-secondary">L</span> special</li>
              <li><span className="text-muted-foreground">ESC</span> unlock</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
