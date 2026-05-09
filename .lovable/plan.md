## Goal
Make Mirror Mage memory persistent per-world, add a competitive leaderboard, expand each world's action set, and surface the enemy's "regressive" (counter/adaptation) actions to the player in real time.

## 1. Database (Lovable Cloud)

New tables (RLS: each user reads/writes only their own rows; leaderboard view public-read):

```text
mage_memory
  user_id uuid, world text, queue jsonb, stack jsonb, history jsonb,
  total_actions int, updated_at timestamptz
  PK (user_id, world)

player_stats
  user_id, world, kills int, deaths int, max_combo int,
  signature_moves int, score int, updated_at
  PK (user_id, world)

mage_events           -- regressive actions log (last N per session)
  id, user_id, world, predicted text, counter text,
  source text ('queue'|'stack'), created_at
```

`leaderboard_public` view (security_invoker) joins `player_stats` + `profiles.username` exposing only username/world/score/kills/max_combo.

## 2. Persistence layer

- `src/game/memoryPersistence.ts`
  - `loadMemory(userId, world)` → hydrates `MirrorMageAI` instance for a world
  - `saveMemory(userId, world, snapshot)` debounced (every 5s + on unmount)
- Refactor `mageAI` singleton → **per-world instances** in a `Map<WorldId, MirrorMageAI>` (currently shared, which conflicts with per-world persistence)
- `useMageMemory(worldId)` reads the right instance
- `MemoryHUD` accepts `worldId` prop

## 3. New actions per character/world

Extend `ActionType` with world-specific moves:
- vodex: `HACK`, `OVERLOAD`
- battleground: `GRENADE`, `SNIPE`
- virtual: `GLITCH`, `REWIND`
- blockworld: `MINE`, `BUILD`

Wire keys (`Q`/`E`/`R`) in `useKeyboard` + `PlayerController` per-world bindings, importance scoring updates, decision tree counters for new types.

## 4. Regressive enemy actions (visible)

The mage already "decides" a counter; make it act and visible:
- Add `EnemyActionFeed` HUD panel: scrolling list of last 8 events
  `PREDICTED ATTACK → COUNTER DODGE (from queue)`
- `MirrorMageAI.decide()` already returns counter — push each into a new `events` ring buffer + persist to `mage_events`
- `MirrorMage.tsx` triggers a brief glow/animation matching the counter type
- Add visible enemy "REGRESSION" badge when mage deploys a stack signature (LIFO replay of player's own move against them)

## 5. Leaderboard page

- Route `/leaderboard` (protected)
- Fetch `leaderboard_public` view, group by world, top 20 per world, tabs per world
- Update on score change after each KILL action
- Link from Index hub

## 6. Score system

`score = kills*100 + max_combo*10 + signature_moves*25 - deaths*50`
Updated client-side after each relevant `observe()` call via `updatePlayerStats()`.

## Files to create
- supabase migration (tables + RLS + view + trigger)
- `src/game/memoryPersistence.ts`
- `src/game/EnemyActionFeed.tsx`
- `src/pages/Leaderboard.tsx`

## Files to edit
- `src/game/types.ts` (new ActionTypes, EnemyEvent)
- `src/game/MirrorMageAI.ts` (per-world instances, events buffer, persistence hooks)
- `src/game/DecisionTree.ts` (counters for new actions)
- `src/game/importance.ts` (new types)
- `src/game/useMageMemory.ts` (worldId param)
- `src/game/MemoryHUD.tsx` (worldId prop)
- `src/game/useKeyboard.ts` (Q/E/R)
- `src/game/PlayerController.tsx` (per-world special actions)
- `src/game/MirrorMage.tsx` (regressive action visuals)
- `src/game/GameScene.tsx` (mount EnemyActionFeed, pass worldId)
- `src/pages/Index.tsx` (leaderboard link)
- `src/App.tsx` (route)

Approve to proceed — this is a large change spanning DB, game logic, and UI.
