// Importance scoring — Echo_3.pdf §3.5 / Page 23
import type { Action } from "./types";

const SIGNATURE_TYPES = new Set([
  "HACK","OVERLOAD","GRENADE","SNIPE","GLITCH","REWIND","MINE","BUILD",
]);

export function calculateImportance(a: Action): number {
  let score = 5;
  if (a.type === "KILL") score += 4;
  if (a.type === "SPECIAL") score += 3;
  if (SIGNATURE_TYPES.has(a.type)) score += 3; // world-specific signature
  if (a.comboCount >= 3) score += 2;
  if (a.damage >= 25) score += 2;
  if (a.wasSuccessful) score += 1;
  if (a.type === "DODGE" && a.wasSuccessful) score += 1;
  if (a.type === "BLOCK" && a.wasSuccessful) score += 1;
  return Math.min(10, score);
}

export const IMPORTANCE_THRESHOLD = 6;
