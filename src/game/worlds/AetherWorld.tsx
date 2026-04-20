import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PlayerController } from "@/game/PlayerController";
import { MirrorMage } from "@/game/MirrorMage";

/**
 * Aether Spire — replaces the old HUP world.
 * Vibe: warm violet/gold, floating shards, slow-rotating runic platforms.
 */
export function AetherWorld() {
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8));
  const shardsRef = useRef<THREE.Group>(null);

  const shards = useMemo(
    () => Array.from({ length: 40 }).map((_, i) => ({
      x: (Math.random() - 0.5) * 50,
      y: 2 + Math.random() * 14,
      z: (Math.random() - 0.5) * 50,
      s: 0.3 + Math.random() * 0.7,
      r: Math.random() * Math.PI,
    })),
    []
  );

  const platforms = useMemo(
    () => Array.from({ length: 6 }).map((_, i) => ({
      x: Math.cos((i / 6) * Math.PI * 2) * 14,
      z: Math.sin((i / 6) * Math.PI * 2) * 14,
      h: 0.8 + (i % 2) * 0.4,
    })),
    []
  );

  useFrame((_, dt) => {
    if (shardsRef.current) shardsRef.current.rotation.y += dt * 0.04;
  });

  return (
    <>
      <fog attach="fog" args={["#1a0a25", 10, 60]} />
      <color attach="background" args={["#0e0518"]} />

      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#ffd700", "#bf00ff", 0.5]} />
      <directionalLight position={[-12, 18, 8]} intensity={0.9} color="#ffd49b" />

      <Stars radius={140} depth={80} count={1500} factor={4} fade speed={0.2} />

      {/* warm floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial color="#1a0820" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* glowing rune circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[6, 6.3, 64]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[12, 12.2, 96]} />
        <meshBasicMaterial color="#bf00ff" transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[28, 28.4, 96]} />
        <meshBasicMaterial color="#ff3a6e" transparent opacity={0.6} />
      </mesh>

      {/* floating ritual platforms */}
      {platforms.map((p, i) => (
        <group key={i} position={[p.x, p.h, p.z]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.6, 1.8, 0.3, 8]} />
            <meshStandardMaterial color="#3a1550" emissive="#bf00ff" emissiveIntensity={0.6} metalness={0.6} roughness={0.4} />
          </mesh>
          <pointLight position={[0, 0.6, 0]} color="#ffd700" intensity={1.4} distance={8} />
        </group>
      ))}

      {/* drifting shards */}
      <group ref={shardsRef}>
        {shards.map((s, i) => (
          <mesh key={i} position={[s.x, s.y, s.z]} rotation={[s.r, s.r, 0]}>
            <octahedronGeometry args={[s.s, 0]} />
            <meshStandardMaterial
              color="#ffd700"
              emissive="#ff8c00"
              emissiveIntensity={1.8}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
      </group>

      <PlayerController
        worldId="aether"
        bounds={28}
        onPlayerMoved={(p) => playerPos.current.copy(p)}
      />
      <MirrorMage playerPos={playerPos} color="#ff3a6e" />
    </>
  );
}
