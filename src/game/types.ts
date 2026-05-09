// Temporal Echo — shared types
export type ActionType =
  | "ATTACK" | "DODGE" | "BLOCK"
  | "MOVE"   | "JUMP"  | "SPRINT"
  | "SPECIAL" | "KILL" | "HEAL"
  // World-specific signature actions:
  | "HACK"   | "OVERLOAD"   // vodex
  | "GRENADE"| "SNIPE"      // battleground
  | "GLITCH" | "REWIND"     // virtual
  | "MINE"   | "BUILD";     // blockworld

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
  | "DODGE" | "PARRY" | "INTERCEPT" | "SPECIAL" | "ATTACK"
  | "REGRESS" | "MIMIC";

export interface EnemyEvent {
  id: number;
  predicted: ActionType | null;
  counter: CounterAction;
  source: "queue" | "stack";
  timestamp: number;
}

export interface PlayerProfile {
  user_id: string;
  username: string;
  avatar_url?: string;
  status: "online" | "offline" | "in-game";
  last_seen_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  created_at: string;
  sender_username?: string;
}

export interface GameInvite {
  id: string;
  sender_id: string;
  recipient_id: string;
  world: WorldId;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  sender_username?: string;
}
