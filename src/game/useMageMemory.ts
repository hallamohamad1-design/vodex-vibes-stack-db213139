import { useEffect, useState } from "react";
import { mageAI, type MemorySnapshot } from "./MirrorMageAI";

export function useMageMemory(): MemorySnapshot {
  const [snap, setSnap] = useState<MemorySnapshot>(() => mageAI.snapshot());
  useEffect(() => mageAI.subscribe(setSnap), []);
  return snap;
}
