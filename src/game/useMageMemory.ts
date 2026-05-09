import { useEffect, useState } from "react";
import { getMageAI, mageAI, type MemorySnapshot } from "./MirrorMageAI";
import type { WorldId } from "./types";

export function useMageMemory(world?: WorldId): MemorySnapshot {
  const ai = world ? getMageAI(world) : mageAI;
  const [snap, setSnap] = useState<MemorySnapshot>(() => ai.snapshot());
  useEffect(() => ai.subscribe(setSnap), [ai]);
  return snap;
}
