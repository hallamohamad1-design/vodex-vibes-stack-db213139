// Shared keyboard / mouse input + world player state.
// Movement: WASD + Space (jump) + Shift (sprint) + mouse look (PointerLock)
// Combat: J = ATTACK, K = BLOCK, L = SPECIAL
// World signatures: Q / E / R (mapped per-world by PlayerController)
import { useEffect, useRef } from "react";

export type KeyState = {
  forward: boolean; back: boolean; left: boolean; right: boolean;
  jump: boolean; sprint: boolean;
  attack: boolean; dodge: boolean; block: boolean; special: boolean;
  sig1: boolean; sig2: boolean; sig3: boolean;
};

export function useKeyboard() {
  const keys = useRef<KeyState>({
    forward: false, back: false, left: false, right: false,
    jump: false, sprint: false,
    attack: false, dodge: false, block: false, special: false,
    sig1: false, sig2: false, sig3: false,
  });

  useEffect(() => {
    const map: Record<string, keyof KeyState> = {
      KeyW: "forward", ArrowUp: "forward",
      KeyS: "back", ArrowDown: "back",
      KeyA: "left", ArrowLeft: "left",
      KeyD: "right", ArrowRight: "right",
      Space: "jump",
      ShiftLeft: "sprint", ShiftRight: "sprint",
      KeyJ: "attack",
      KeyU: "dodge",
      KeyK: "block",
      KeyL: "special",
      KeyQ: "sig1",
      KeyE: "sig2",
      KeyR: "sig3",
    };
    const down = (e: KeyboardEvent) => {
      const k = map[e.code]; if (!k) return;
      keys.current[k] = true;
      if (e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.code]; if (!k) return;
      keys.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return keys;
}
