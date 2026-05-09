import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { PlayerController } from "@/game/PlayerController";
import { MirrorMage } from "@/game/MirrorMage";
import { supabase } from "@/integrations/supabase/client";
import type { CounterAction } from "@/game/types";

/** Vodex Realm — neon grid + cyan voids, the original world (improved). */
export function VodexWorld({ isMultiplayer, role, inviteId, peerName }: { isMultiplayer?: boolean; role?: string | null; inviteId?: string | null; peerName?: string | null }) {
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8));
  const remotePos = useRef(new THREE.Vector3(6, 1.5, -6));
  const [remoteAction, setRemoteAction] = useState<CounterAction>("ATTACK");
  const grid = useRef<THREE.GridHelper>(null);

  useEffect(() => {
    if (!isMultiplayer || !inviteId) return;

    const channel = supabase.channel(`game_${inviteId}`);
    channel.on("broadcast", { event: "player_state" }, (payload) => {
      if (payload.payload.pos) {
        remotePos.current.set(payload.payload.pos[0], payload.payload.pos[1], payload.payload.pos[2]);
      }
      if (payload.payload.action) {
        setRemoteAction(payload.payload.action as CounterAction);
      }
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isMultiplayer, inviteId]);

  // floating obelisks
  const pillars = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => ({
      x: Math.cos((i / 14) * Math.PI * 2) * (10 + (i % 3) * 4),
      z: Math.sin((i / 14) * Math.PI * 2) * (10 + (i % 3) * 4),
      h: 3 + (i % 4),
    })),
    []
  );

  useFrame((_, dt) => {
    if (grid.current) grid.current.rotation.y += dt * 0.05;
  });

  return (
    <>
      <fog attach="fog" args={["#04060f", 8, 55]} />
      <color attach="background" args={["#04060f"]} />

      <ambientLight intensity={0.25} />
      <hemisphereLight args={["#00f0ff", "#bf00ff", 0.4]} />
      <directionalLight position={[10, 20, 5]} intensity={0.6} color="#9be8ff" />

      <Stars radius={120} depth={60} count={2000} factor={3} fade speed={0.3} />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#080d20" roughness={0.85} metalness={0.3} />
      </mesh>

      {/* neon grid */}
      <gridHelper ref={grid} args={[120, 60, "#00f0ff", "#103040"]} position={[0, 0.01, 0]} />

      {/* circular boundary ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[28, 28.4, 96]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.7} />
      </mesh>

      {/* obelisks */}
      {pillars.map((p, i) => (
        <group key={i} position={[p.x, p.h / 2, p.z]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, p.h, 0.8]} />
            <meshStandardMaterial color="#0a1530" emissive="#00f0ff" emissiveIntensity={0.4} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, p.h / 2 + 0.2, 0]}>
            <octahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={2.5} />
          </mesh>
          <pointLight position={[0, p.h / 2 + 0.4, 0]} color="#00f0ff" intensity={1.2} distance={6} />
        </group>
      ))}

      <PlayerController
        worldId="vodex"
        bounds={28}
        onPlayerMoved={(p) => playerPos.current.copy(p)}
        isMultiplayer={isMultiplayer}
        inviteId={inviteId}
      />
      <MirrorMage 
        playerPos={isMultiplayer ? remotePos : playerPos} 
        worldId="vodex" 
        color={role === "host" ? "#00f0ff" : "#bf00ff"} 
        variant={isMultiplayer ? (role === "host" ? "soldier" : "mage") : "mage"}
        isRemote={isMultiplayer}
        remoteAction={isMultiplayer ? remoteAction : undefined}
        name={isMultiplayer ? peerName || "Operative" : undefined}
      />
    </>
  );
}
