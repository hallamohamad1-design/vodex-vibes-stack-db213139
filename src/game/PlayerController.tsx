import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useKeyboard } from "@/game/useKeyboard";
import { mageAI } from "@/game/MirrorMageAI";
import type { ActionType, WorldId } from "@/game/types";

interface Props {
  worldId: WorldId;
  onPlayerMoved?: (pos: THREE.Vector3) => void;
  bounds?: number;
}

export function PlayerController({ worldId, onPlayerMoved, bounds = 28 }: Props) {
  const { camera } = useThree();
  const keys = useKeyboard();
  const velocity = useRef(new THREE.Vector3());
  const onGround = useRef(true);
  const sprintMoveTick = useRef(0);
  const lastAction = useRef<{ type: ActionType; t: number } | null>(null);
  const comboCount = useRef(0);
  const comboResetT = useRef(0);

  useEffect(() => {
    camera.position.set(0, 1.7, 8);
  }, [camera, worldId]);

  // record an action with cooldown to avoid spam
  const record = (type: ActionType, damage = 0, success = true) => {
    const now = performance.now();
    if (lastAction.current && lastAction.current.type === type && now - lastAction.current.t < 250) return;
    lastAction.current = { type, t: now };

    if (now - comboResetT.current < 1500) comboCount.current++;
    else comboCount.current = 1;
    comboResetT.current = now;

    mageAI.observe({
      type,
      damage,
      comboCount: comboCount.current,
      wasSuccessful: success,
      world: worldId,
    });
  };

  // attack/block/special are edge-triggered
  const prev = useRef({ attack: false, block: false, special: false, jump: false });

  useFrame((_, delta) => {
    const k = keys.current;

    // ── horizontal movement relative to camera yaw ──
    const speed = (k.sprint ? 9 : 5) * delta;
    const dir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).negate();

    if (k.forward) dir.add(forward);
    if (k.back) dir.sub(forward);
    if (k.left) dir.sub(right);
    if (k.right) dir.add(right);

    const moving = dir.lengthSq() > 0;
    if (moving) {
      dir.normalize().multiplyScalar(speed);
      camera.position.x += dir.x;
      camera.position.z += dir.z;
      // record MOVE periodically
      sprintMoveTick.current += delta;
      if (sprintMoveTick.current > (k.sprint ? 0.5 : 0.9)) {
        sprintMoveTick.current = 0;
        record(k.sprint ? "SPRINT" : "MOVE", 0, true);
      }
    }

    // ── gravity & jump ──
    velocity.current.y -= 18 * delta;
    if (k.jump && onGround.current && !prev.current.jump) {
      velocity.current.y = 7;
      onGround.current = false;
      record("JUMP", 0, true);
    }
    camera.position.y += velocity.current.y * delta;
    if (camera.position.y <= 1.7) {
      camera.position.y = 1.7;
      velocity.current.y = 0;
      onGround.current = true;
    }

    // ── bounds ──
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -bounds, bounds);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -bounds, bounds);

    // ── combat (edge-triggered) ──
    if (k.attack && !prev.current.attack)   record("ATTACK", 15 + Math.random() * 15, true);
    if (k.block  && !prev.current.block)    record("BLOCK",  0,                        true);
    if (k.special && !prev.current.special) record("SPECIAL", 30,                      true);

    prev.current.attack = k.attack;
    prev.current.block = k.block;
    prev.current.special = k.special;
    prev.current.jump = k.jump;

    onPlayerMoved?.(camera.position);
  });

  return <PointerLockControls />;
}
