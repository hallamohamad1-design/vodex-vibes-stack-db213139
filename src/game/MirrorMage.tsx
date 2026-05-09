import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
// import { Text } from "@react-three/drei";
import * as THREE from "three";
import { getMageAI } from "@/game/MirrorMageAI";
import type { CounterAction, WorldId } from "@/game/types";

export type MageVariant = "mage" | "soldier" | "ghost" | "golem";

interface Props {
  playerPos: React.MutableRefObject<THREE.Vector3>;
  worldId?: WorldId;
  color?: string;
  variant?: MageVariant;
  onAction?: (a: CounterAction) => void;
  isRemote?: boolean;
  remoteAction?: CounterAction;
  name?: string;
}

/**
 * Mirror Mage enemy. Every ~1.2s asks the per-world AI for a counter, then
 * performs a visible move. Regressive (REGRESS/MIMIC) counters flash bright.
 */
export function MirrorMage({ playerPos, worldId = "vodex", color = "#bf00ff", variant = "mage", onAction, isRemote, remoteAction, name }: Props) {
  const group = useRef<THREE.Group>(null);
  const orbit = useRef(0);
  const tick = useRef(0);
  const [currentAction, setCurrentAction] = useState<CounterAction>("ATTACK");
  const [regressing, setRegressing] = useState(false);
  const stateT = useRef(0);
  const ai = getMageAI(worldId);

  useEffect(() => {
    if (group.current) group.current.position.set(6, 1.5, -6);
  }, [worldId]);

  useFrame((state, delta) => {
    if (!group.current) return;
    tick.current += delta;
    stateT.current += delta;
    orbit.current += delta * 0.4;

    if (tick.current > 1.2 && !isRemote) {
      tick.current = 0;
      const counter = ai.decide();
      let isRegress = counter === "REGRESS" || counter === "MIMIC";
      if (Math.random() < 0.3) {
        const sig = ai.deploySignature();
        if (sig) isRegress = true;
      }
      setCurrentAction(counter);
      setRegressing(isRegress);
      if (isRegress) {
        setTimeout(() => setRegressing(false), 700);
      }
      stateT.current = 0;
      onAction?.(counter);
    }

    if (isRemote && remoteAction && remoteAction !== currentAction) {
      setCurrentAction(remoteAction);
      const isRegress = remoteAction === "REGRESS" || remoteAction === "MIMIC";
      setRegressing(isRegress);
      if (isRegress) setTimeout(() => setRegressing(false), 700);
    }

    const target = playerPos.current;
    const me = group.current.position;
    const toPlayer = new THREE.Vector3().subVectors(target, me);
    const dist = toPlayer.length();
    toPlayer.y = 0;
    toPlayer.normalize();

    let speed = 1.2;
    let bobAmp = 0.15;
    switch (currentAction) {
      case "INTERCEPT": speed = 3.0; break;
      case "ATTACK":    speed = 2.0; break;
      case "DODGE":     speed = 0.6; bobAmp = 0.4; break;
      case "PARRY":     speed = 0.4; break;
      case "SPECIAL":   speed = 1.6; bobAmp = 0.6; break;
      case "REGRESS":   speed = 2.6; bobAmp = 0.8; break;
      case "MIMIC":     speed = 1.8; bobAmp = 0.5; break;
    }

    if (dist > 3) me.addScaledVector(toPlayer, speed * delta);
    else if (currentAction === "DODGE") {
      const side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
      me.addScaledVector(side, 2.5 * delta);
    }

    me.y = 1.5 + Math.sin(orbit.current * 4) * bobAmp;
    me.x = THREE.MathUtils.clamp(me.x, -28, 28);
    me.z = THREE.MathUtils.clamp(me.z, -28, 28);

    const lookAt = new THREE.Vector3(target.x, me.y, target.z);
    group.current.lookAt(lookAt);
  });

  const bodyColor = regressing ? "#ff0040" :
    currentAction === "ATTACK" ? "#ff3a6e" :
    currentAction === "DODGE"  ? "#00f0ff" :
    currentAction === "PARRY"  ? "#ffd700" :
    currentAction === "SPECIAL" ? "#00ff88" :
    currentAction === "REGRESS" ? "#ff0040" :
    currentAction === "MIMIC"   ? "#ff66ff" :
    color;

  const glowIntensity = regressing ? 6 : 3;

  return (
    <group ref={group}>
      {name && (
        <Text
          position={[0, 1.8, 0]}
          fontSize={0.25}
          color={bodyColor}
          font="/fonts/Inter-Bold.woff" // Assuming Inter is available or fallback
          anchorX="center"
          anchorY="middle"
        >
          {name.toUpperCase()}
        </Text>
      )}
      {variant === "soldier" ? (
        <group>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.9, 1.1, 0.5]} />
            <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh castShadow position={[0, 0.85, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.85, 0.26]}>
            <planeGeometry args={[0.4, 0.12]} />
            <meshBasicMaterial color={bodyColor} />
          </mesh>
        </group>
      ) : variant === "ghost" ? (
        <group>
          <mesh>
            <icosahedronGeometry args={[0.95, 1]} />
            <meshBasicMaterial color={bodyColor} wireframe transparent opacity={0.9} />
          </mesh>
          <mesh>
            <icosahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color={bodyColor} emissive={bodyColor} emissiveIntensity={3} />
          </mesh>
        </group>
      ) : variant === "golem" ? (
        <group>
          <mesh castShadow position={[0, -0.4, 0]}>
            <boxGeometry args={[1.1, 0.9, 0.7]} />
            <meshStandardMaterial color={bodyColor} roughness={1} />
          </mesh>
          <mesh castShadow position={[0, 0.5, 0]}>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshStandardMaterial color={bodyColor} roughness={1} />
          </mesh>
          <mesh position={[-0.15, 0.6, 0.36]}>
            <boxGeometry args={[0.15, 0.15, 0.05]} />
            <meshBasicMaterial color="#ff0040" />
          </mesh>
          <mesh position={[0.15, 0.6, 0.36]}>
            <boxGeometry args={[0.15, 0.15, 0.05]} />
            <meshBasicMaterial color="#ff0040" />
          </mesh>
        </group>
      ) : (
        <>
          <mesh castShadow>
            <icosahedronGeometry args={[0.7, 1]} />
            <meshStandardMaterial
              color={bodyColor}
              emissive={bodyColor}
              emissiveIntensity={1.2 + (regressing ? 2 : 0)}
              roughness={0.2}
              metalness={0.6}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[regressing ? 1.6 : 1.2, 0.04, 12, 64]} />
            <meshBasicMaterial color={bodyColor} transparent opacity={0.7} />
          </mesh>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[Math.cos(i) * 1.4, Math.sin(i) * 0.4, Math.sin(i) * 1.4]}>
              <octahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial color={bodyColor} emissive={bodyColor} emissiveIntensity={2} />
            </mesh>
          ))}
        </>
      )}
      <pointLight color={bodyColor} intensity={glowIntensity} distance={regressing ? 22 : 14} />
    </group>
  );
}
