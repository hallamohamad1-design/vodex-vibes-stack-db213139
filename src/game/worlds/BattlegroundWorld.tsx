import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useState, useEffect } from "react";
import { PlayerController } from "@/game/PlayerController";
import { MirrorMage } from "@/game/MirrorMage";
import { supabase } from "@/integrations/supabase/client";
import type { CounterAction } from "@/game/types";

/** Battleground — tactical desert world with ruins and supplies. */
export function BattlegroundWorld({ isMultiplayer, role, inviteId, peerName }: { isMultiplayer?: boolean; role?: string | null; inviteId?: string | null; peerName?: string | null }) {
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 8));
  const remotePos = useRef(new THREE.Vector3(6, 1.5, -6));
  const [remoteAction, setRemoteAction] = useState<CounterAction>("ATTACK");

  useEffect(() => {
    if (!isMultiplayer || !inviteId) return;
    const channel = supabase.channel(`game_${inviteId}`);
    channel.on("broadcast", { event: "player_state" }, (payload) => {
      if (payload.payload.pos) remotePos.current.set(payload.payload.pos[0], payload.payload.pos[1], payload.payload.pos[2]);
      if (payload.payload.action) setRemoteAction(payload.payload.action as CounterAction);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isMultiplayer, inviteId]);

  const crates = useMemo(
    () => Array.from({ length: 12 }).map((_, i) => ({
      x: (i % 4) * 10 - 15,
      z: Math.floor(i / 4) * 10 - 15,
    })),
    []
  );

  return (
    <>
      <fog attach="fog" args={["#2a1e15", 5, 45]} />
      <color attach="background" args={["#1a1410"]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} color="#ffe4d6" castShadow />

      <Stars radius={100} depth={50} count={1000} factor={4} fade speed={0.1} />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#3d2b1f" roughness={1} />
      </mesh>

      {/* walls / ruins */}
      {[5, 15, 25].map((x) => (
        <group key={x} position={[x - 15, 1.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[4, 3, 0.5]} />
            <meshStandardMaterial color="#2a221a" />
          </mesh>
        </group>
      ))}

      {/* crates */}
      {crates.map((c, i) => (
        <mesh key={i} position={[c.x, 0.5, c.z]} castShadow>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial color="#4a3a2a" />
        </mesh>
      ))}

      <PlayerController 
        worldId="battleground" 
        bounds={28} 
        onPlayerMoved={(p) => playerPos.current.copy(p)} 
        isMultiplayer={isMultiplayer}
        inviteId={inviteId}
      />
      <MirrorMage 
        playerPos={isMultiplayer ? remotePos : playerPos} 
        worldId="battleground" 
        color={role === "host" ? "#ff8c00" : "#ff4500"} 
        variant={isMultiplayer ? (role === "host" ? "soldier" : "mage") : "soldier"} 
        isRemote={isMultiplayer}
        remoteAction={isMultiplayer ? remoteAction : undefined}
        name={isMultiplayer ? peerName || "Operative" : undefined}
      />
    </>
  );
}
