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

export type WorldId = "vodex" | "battleground" | "virtual" | "blockworld" | "minecraft";

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
  character_skin: CharacterSkin;
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

/** Character skins available per operative — cosmetic identifier only */
export type CharacterSkin =
  | "operative"   // default — gray armor
  | "cipher"      // cyan tint — hacker class
  | "specter"     // purple — ghost/assassin class
  | "sentinel"    // gold — heavy/defense class
  | "wraith"      // red — berserker class
  | "nova";       // green — support/tech class

export const CHARACTER_SKINS: { id: CharacterSkin; label: string; color: string; icon: string }[] = [
  { id: "operative", label: "OPERATIVE",  color: "text-foreground",  icon: "⬡" },
  { id: "cipher",    label: "CIPHER",     color: "text-primary",     icon: "◈" },
  { id: "specter",   label: "SPECTER",    color: "text-secondary",   icon: "◇" },
  { id: "sentinel",  label: "SENTINEL",   color: "text-gold",        icon: "◆" },
  { id: "wraith",    label: "WRAITH",     color: "text-red-400",     icon: "◉" },
  { id: "nova",      label: "NOVA",       color: "text-green-400",   icon: "✦" },
];

/** A single entry in the multiplayer game history log */
export interface GameHistoryEntry {
  id: string;
  session_id: string | null;
  player_id: string;
  player_username?: string;
  world: WorldId;
  action_type: ActionType;
  source: "queue" | "stack";
  is_signature: boolean;
  created_at: string;
  stack_order?: number;
  queue_order?: number;
}

/** Game session for multiplayer matches */
export interface GameSession {
  id: string;
  invite_id: string | null;
  world: WorldId;
  host_id: string;
  guest_id: string | null;
  status: "active" | "completed" | "expired";
  started_at: string;
  ended_at: string | null;
  round_duration_seconds: number;
  host_score: number;
  guest_score: number;
  winner_id: string | null;
  created_at: string;
}

/** Block in Minecraft/Blockworld */
export interface WorldBlock {
  id: string;
  session_id: string | null;
  player_id: string;
  world: WorldId;
  x: number;
  y: number;
  z: number;
  block_type: string;
  color: string;
  placed_at: string;
  is_removed: boolean;
  removed_at: string | null;
  removed_by: string | null;
}
