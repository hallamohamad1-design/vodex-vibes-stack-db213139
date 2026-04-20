// Decision Tree — Echo_3.pdf §5
import type { ActionType, CounterAction } from "./types";

export function decideCounter(predicted: ActionType | null): CounterAction {
  if (!predicted) return "ATTACK";
  switch (predicted) {
    case "ATTACK":  return "DODGE";
    case "DODGE":   return "INTERCEPT";
    case "BLOCK":   return "SPECIAL";
    case "SPECIAL": return "PARRY";
    case "MOVE":    return "INTERCEPT";
    case "JUMP":    return "INTERCEPT";
    case "SPRINT":  return "INTERCEPT";
    case "HEAL":    return "ATTACK";
    case "KILL":    return "DODGE";
    default:        return "ATTACK";
  }
}
