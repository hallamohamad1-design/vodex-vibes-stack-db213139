// Temporal Echo — shared types
export type ActionType =
  | "ATTACK" | "DODGE" | "BLOCK"
  | "MOVE"   | "JUMP"  | "SPRINT"
  | "SPECIAL" | "KILL" | "HEAL";

export interface Action {
  id: number;
  type: ActionType;
  damage: number;
  comboCount: number;
  wasSuccessful: boolean;
  importanceScore: number;
  timestamp: number;
  world: WorldId;
}

export type WorldId = "vodex" | "battleground" | "virtual" | "blockworld";

export type CounterAction =
  | "DODGE" | "PARRY" | "INTERCEPT" | "SPECIAL" | "ATTACK";
