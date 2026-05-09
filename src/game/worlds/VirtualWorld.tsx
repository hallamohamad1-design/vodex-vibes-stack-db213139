import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PlayerController } from "@/game/PlayerController";
import { MirrorMage } from "@/game/MirrorMage";

/** Virtual — pure cyberspace: floating data platforms, holo wireframes, scanlines. */
export function VirtualWorld({ isMultiplayer, role }: { isMultiplayer?: boolean; role?: string | null }) {
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8));
  const platformsRef = useRef<THREE.Group>(null);

  const platforms = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => {
      const angle = (i / 14) * Math.PI * 2;
      const radius = 8 + (i % 4) * 4;
      return {
        x: Math.cos(angle) * radius,
        y: 0.5 + (i % 5) * 1.5,
        z: Math.sin(angle) * radius,
        s: 1.4 + Math.random() * 0.8,
      };
    }),
    []
  );

  const holos = useMemo(
    () => Array.from({ length: 30 }).map(() => ({
      x: (Math.random() - 0.5) * 60,
      y: 1 + Math.random() * 18,
      z: (Math.random() - 0.5) * 60,
      s: 0.6 + Math.random() * 1.4,
    })),
    []
  );

  useFrame((_, dt) => {
    if (platformsRef.current) platformsRef.current.rotation.y += dt * 0.03;
  });

  return (
    <>
      <fog attach="fog" args={["#000814", 12, 65]} />
      <color attach="background" args={["#000814"]} />

      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#00ffd0", "#ff00aa", 0.5]} />
      <directionalLight position={[0, 25, 0]} intensity={0.8} color="#88ffff" />
      <Stars radius={150} depth={80} count={3000} factor={4} fade speed={0.5} />

      {/* glass floor with grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#001020" roughness={0.1} metalness={0.95} />
      </mesh>
      <gridHelper args={[140, 70, "#00ffd0", "#0a3040"]} position={[0, 0.01, 0]} />

      {/* concentric rings */}
      {[8, 16, 26].map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[r, r + 0.3, 96]} />
          <meshBasicMaterial color={i === 1 ? "#ff00aa" : "#00ffd0"} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* floating data platforms */}
      <group ref={platformsRef}>
        {platforms.map((p, i) => (
          <group key={i} position={[p.x, p.y, p.z]}>
            <mesh castShadow>
              <boxGeometry args={[p.s, 0.15, p.s]} />
              <meshStandardMaterial color="#001828" emissive="#00ffd0" emissiveIntensity={0.8} metalness={0.9} roughness={0.1} />
            </mesh>
            <pointLight position={[0, 0.3, 0]} color="#00ffd0" intensity={0.8} distance={5} />
          </group>
        ))}
      </group>

      {/* holo wireframes */}
      {holos.map((h, i) => (
        <mesh key={i} position={[h.x, h.y, h.z]}>
          <boxGeometry args={[h.s, h.s, h.s]} />
          <meshBasicMaterial color={i % 3 === 0 ? "#ff00aa" : "#00ffd0"} wireframe transparent opacity={0.5} />
        </mesh>
      ))}

      <PlayerController worldId="virtual" bounds={45} onPlayerMoved={(p) => playerPos.current.copy(p)} />
      <MirrorMage playerPos={playerPos} worldId="virtual" color="#ff00aa" variant="ghost" />
    </>
  );
}
