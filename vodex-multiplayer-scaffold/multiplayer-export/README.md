# Vodex Multiplayer Scaffold — Manual Copy Guide

Drop this scaffold into the `vodex-vibes-stack-db213139` repo to add multiplayer (auth, lobby chat, world-pick, 1v1 rooms with 3‑min rounds, stack/queue history, regressive enemy feed).

## 1. Database (Supabase)

Run the two SQL files in `supabase/migrations/` against your Supabase project (in order). They create:

- `profiles` (username, character_name, character_class, avatar) + auto-create trigger on signup
- `rooms` (host_id, guest_id, world, status pending|active|finished, started_at, ends_at, winner_id)
- `game_actions` (room_id, player_id, kind, label, payload jsonb, parent_id) — used as both **stack** (LIFO undo via `parent_id`) and **queue** (FIFO history via `created_at`)
- `direct_messages` (lobby chat between registered players)
- RLS policies so only room participants can read/write actions & messages
- Realtime publication on `rooms`, `game_actions`, `direct_messages`

## 2. Files to copy

| Source | Destination in your repo |
|---|---|
| `src/integrations/supabase/client.ts` | same path (replace) |
| `src/integrations/supabase/client.server.ts` | same path |
| `src/integrations/supabase/auth-middleware.ts` | same path |
| `src/lib/auth.tsx` | same path — `<AuthProvider>` + `useAuth()` |
| `src/lib/worlds.ts` | same path — world dropdown options + theming |
| `src/components/Navbar.tsx` | same path |
| `src/routes/auth.tsx` | `/auth` — email+password & Google |
| `src/routes/lobby.tsx` | `/lobby` — online players, DM chat, world picker, invite |
| `src/routes/game.$roomId.tsx` | `/game/$roomId` — 3‑min timer, stack/queue history, enemy feed |
| `src/routes/__root.tsx` | wrap router with `<AuthProvider>` + `<Navbar/>` |
| `src/routes/index.tsx` | landing CTA → `/auth` or `/lobby` |
| `src/styles.css` | merge the `:root` design tokens at the top |

## 3. Wire-up checklist

1. `bun add @supabase/supabase-js@^2 @tanstack/react-query` (already in your stack if SSR-enabled).
2. Set env vars (already provided by Lovable Cloud — copy to Vercel):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
3. Enable **Email** auth + **Google** provider in Supabase dashboard.
4. In your existing game loop, every player action should call:
   ```ts
   await supabase.from("game_actions").insert({
     room_id, player_id: user.id,
     kind: "predict" | "counter" | "move" | "attack",
     label: "Fireball → Goblin",
     payload: { target, world, dmg }
   });
   ```
   - To **undo** (stack pop): delete the latest row where `player_id = me`.
   - To **redo / queue replay**: select ordered by `created_at asc`.
5. The regressive enemy feed in `game.$roomId.tsx` already filters last N actions where `kind in ('predict','counter')` for the chosen world and renders timestamps + predicted vs counter pairing via `parent_id`.

## 4. Round timer

`rooms.ends_at = started_at + interval '3 minutes'`. The client computes remaining time from `ends_at`; when it hits zero, both players' clients write a `kind='round_end'` action and the host updates `rooms.status='finished'`.

## 5. Theming

`src/styles.css` defines neon/dark game tokens (`--primary`, `--accent`, `--enemy`, gradients, shadows). All components use `bg-primary text-primary-foreground` etc. — restyle by editing tokens only, no component edits needed.

---
Generated from the working Lovable scaffold. Open any file in your editor to see implementation.
