// Decision Tree — Echo_3.pdf §5 + new world-specific counters
import type { ActionType, CounterAction } from "./types";

export function decideCounter(predicted: ActionType | null): CounterAction {
  if (!predicted) return "ATTACK";
  switch (predicted) {
    case "ATTACK":   return "DODGE";
    case "DODGE":    return "INTERCEPT";
    case "BLOCK":    return "SPECIAL";
    case "SPECIAL":  return "PARRY";
    case "MOVE":     return "INTERCEPT";
    case "JUMP":     return "INTERCEPT";
    case "SPRINT":   return "INTERCEPT";
    case "HEAL":     return "ATTACK";
    case "KILL":     return "DODGE";
    // Regressive counters: enemy mirrors / undoes the player's signature
    case "HACK":     return "REGRESS";
    case "OVERLOAD": return "PARRY";
    case "GRENADE":  return "DODGE";
    case "SNIPE":    return "INTERCEPT";
    case "GLITCH":   return "REGRESS";
    case "REWIND":   return "MIMIC";
    case "MINE":     return "INTERCEPT";
    case "BUILD":    return "REGRESS";
    default:         return "ATTACK";
  }
}
