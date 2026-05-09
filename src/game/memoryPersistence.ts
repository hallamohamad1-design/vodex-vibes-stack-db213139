// Persists MirrorMage memory + player stats to Lovable Cloud.
import { supabase } from "@/integrations/supabase/client";
import { getMageAI } from "./MirrorMageAI";
import type { Action, EnemyEvent, WorldId } from "./types";

export async function loadMemory(userId: string, world: WorldId) {
  const ai = getMageAI(world);
  const { data } = await supabase
    .from("mage_memory")
    .select("queue, stack, history, total_actions")
    .eq("user_id", userId)
    .eq("world", world)
    .maybeSingle();
  if (data) {
    ai.hydrate({
      queue: (data.queue as unknown as Action[]) ?? [],
      stack: (data.stack as unknown as Action[]) ?? [],
      history: (data.history as unknown as Action[]) ?? [],
      total: data.total_actions ?? 0,
    });
  }
  return ai;
}

export async function saveMemory(userId: string, world: WorldId) {
  const ai = getMageAI(world);
  const s = ai.snapshot();
  await supabase.from("mage_memory").upsert(
    {
      user_id: userId,
      world,
      queue: s.queue as unknown as never,
      stack: s.stack as unknown as never,
      history: s.history as unknown as never,
      total_actions: s.totalActions,
    },
    { onConflict: "user_id,world" }
  );
}

export async function saveStats(userId: string, world: WorldId) {
  const s = getMageAI(world).snapshot();
  const score = s.kills * 100 + s.maxCombo * 10 + s.signatureMoves * 25;
  await supabase.from("player_stats").upsert(
    {
      user_id: userId,
      world,
      kills: s.kills,
      deaths: 0,
      max_combo: s.maxCombo,
      signature_moves: s.signatureMoves,
      score,
    },
    { onConflict: "user_id,world" }
  );
}

export async function logEvent(userId: string, world: WorldId, e: EnemyEvent) {
  await supabase.from("mage_events").insert({
    user_id: userId,
    world,
    predicted: e.predicted,
    counter: e.counter,
    source: e.source,
  });
}
