import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { PlayerController } from "@/game/PlayerController";
import { MirrorMage } from "@/game/MirrorMage";

/** Battleground — PUBG-style: dusty open field, ruined walls, supply crates. */
export function BattlegroundWorld() {
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8));

  const crates = useMemo(
    () => Array.from({ length: 18 }).map((_, i) => ({
      x: (Math.random() - 0.5) * 50,
      z: (Math.random() - 0.5) * 50,
      r: Math.random() * Math.PI,
      s: 0.8 + Math.random() * 0.6,
    })),
    []
  );

  const walls = useMemo(
    () => Array.from({ length: 10 }).map((_, i) => ({
      x: Math.cos((i / 10) * Math.PI * 2) * (12 + (i % 3) * 5),
      z: Math.sin((i / 10) * Math.PI * 2) * (12 + (i % 3) * 5),
      r: (i / 10) * Math.PI * 2,
      w: 4 + (i % 3),
      h: 2 + (i % 2) * 0.8,
    })),
    []
  );

  const trees = useMemo(
    () => Array.from({ length: 12 }).map(() => ({
      x: (Math.random() - 0.5) * 55,
      z: (Math.random() - 0.5) * 55,
      h: 3 + Math.random() * 2,
    })),
    []
  );

  return (
    <>
      <fog attach="fog" args={["#a89668", 15, 70]} />
      <color attach="background" args={["#7a6a4a"]} />
      <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={3} mieCoefficient={0.005} mieDirectionalG={0.7} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[20, 30, 10]} intensity={1.4} color="#fff1c4" castShadow />

      {/* dusty ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#8a7548" roughness={1} />
      </mesh>

      {/* dirt patches */}
      {Array.from({ length: 25 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[(Math.random() - 0.5) * 60, 0.01, (Math.random() - 0.5) * 60]}>
          <circleGeometry args={[1 + Math.random() * 2, 16]} />
          <meshStandardMaterial color="#5e4a2a" roughness={1} />
        </mesh>
      ))}

      {/* ruined walls */}
      {walls.map((w, i) => (
        <mesh key={i} position={[w.x, w.h / 2, w.z]} rotation={[0, w.r, 0]} castShadow>
          <boxGeometry args={[w.w, w.h, 0.4]} />
          <meshStandardMaterial color="#9a8a70" roughness={0.95} />
        </mesh>
      ))}

      {/* supply crates */}
      {crates.map((c, i) => (
        <mesh key={i} position={[c.x, c.s / 2, c.z]} rotation={[0, c.r, 0]} castShadow>
          <boxGeometry args={[c.s, c.s, c.s]} />
          <meshStandardMaterial color="#6b4f2a" roughness={0.9} />
        </mesh>
      ))}

      {/* trees (cones) */}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, t.h, 8]} />
            <meshStandardMaterial color="#4a3520" roughness={1} />
          </mesh>
          <mesh position={[0, t.h + 0.8, 0]} castShadow>
            <coneGeometry args={[1.4, 2.5, 8]} />
            <meshStandardMaterial color="#3a5028" roughness={1} />
          </mesh>
        </group>
      ))}

      <PlayerController worldId="battleground" bounds={48} onPlayerMoved={(p) => playerPos.current.copy(p)} />
      <MirrorMage playerPos={playerPos} worldId="battleground" color="#c44a2a" variant="soldier" />
    </>
  );
}
