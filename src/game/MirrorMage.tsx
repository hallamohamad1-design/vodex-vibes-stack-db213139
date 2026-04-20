import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { mageAI } from "@/game/MirrorMageAI";
import type { CounterAction } from "@/game/types";

interface Props {
  playerPos: React.MutableRefObject<THREE.Vector3>;
  color?: string;
  onAction?: (a: CounterAction) => void;
}

/**
 * Mirror Mage enemy. Every ~1.2s it asks the AI engine to decide a counter
 * based on the queue's predicted player action, then performs a visible move.
 */
export function MirrorMage({ playerPos, color = "#bf00ff", onAction }: Props) {
  const group = useRef<THREE.Group>(null);
  const orbit = useRef(0);
  const tick = useRef(0);
  const [currentAction, setCurrentAction] = useState<CounterAction>("ATTACK");
  const stateT = useRef(0);

  useEffect(() => {
    if (group.current) group.current.position.set(6, 1.5, -6);
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    tick.current += delta;
    stateT.current += delta;
    orbit.current += delta * 0.4;

    // Decide a new counter every 1.2s
    if (tick.current > 1.2) {
      tick.current = 0;
      const counter = mageAI.decide();
      // Occasionally deploy a stored signature move from the stack
      if (Math.random() < 0.25) mageAI.deploySignature();
      setCurrentAction(counter);
      stateT.current = 0;
      onAction?.(counter);
    }

    const target = playerPos.current;
    const me = group.current.position;
    const toPlayer = new THREE.Vector3().subVectors(target, me);
    const dist = toPlayer.length();
    toPlayer.y = 0;
    toPlayer.normalize();

    // Behavior per counter
    let speed = 1.2;
    let bobAmp = 0.15;
    switch (currentAction) {
      case "INTERCEPT": speed = 3.0; break;
      case "ATTACK":    speed = 2.0; break;
      case "DODGE":     speed = 0.6; bobAmp = 0.4; break;
      case "PARRY":     speed = 0.4; break;
      case "SPECIAL":   speed = 1.6; bobAmp = 0.6; break;
    }

    if (dist > 3) me.addScaledVector(toPlayer, speed * delta);
    else if (currentAction === "DODGE") {
      const side = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
      me.addScaledVector(side, 2.5 * delta);
    }

    // hover / orbit motion
    me.y = 1.5 + Math.sin(orbit.current * 4) * bobAmp;
    me.x = THREE.MathUtils.clamp(me.x, -28, 28);
    me.z = THREE.MathUtils.clamp(me.z, -28, 28);

    // face the player
    const lookAt = new THREE.Vector3(target.x, me.y, target.z);
    group.current.lookAt(lookAt);
  });

  // Color shift based on current action
  const bodyColor =
    currentAction === "ATTACK" ? "#ff3a6e" :
    currentAction === "DODGE"  ? "#00f0ff" :
    currentAction === "PARRY"  ? "#ffd700" :
    currentAction === "SPECIAL" ? "#00ff88" :
    color;

  return (
    <group ref={group}>
      {/* mage body */}
      <mesh castShadow>
        <icosahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={bodyColor}
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
      {/* halo */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[1.2, 0.04, 12, 64]} />
        <meshBasicMaterial color={bodyColor} transparent opacity={0.7} />
      </mesh>
      {/* point light */}
      <pointLight color={bodyColor} intensity={3} distance={14} />
      {/* trailing shards */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[Math.cos(i) * 1.4, Math.sin(i) * 0.4, Math.sin(i) * 1.4]}>
          <octahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color={bodyColor} emissive={bodyColor} emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
}
