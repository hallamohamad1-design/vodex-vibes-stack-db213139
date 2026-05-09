
-- Mage memory persistence per user per world
CREATE TABLE public.mage_memory (
  user_id uuid NOT NULL,
  world text NOT NULL,
  queue jsonb NOT NULL DEFAULT '[]'::jsonb,
  stack jsonb NOT NULL DEFAULT '[]'::jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_actions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, world)
);
ALTER TABLE public.mage_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memory select" ON public.mage_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own memory insert" ON public.mage_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own memory update" ON public.mage_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own memory delete" ON public.mage_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Player stats / leaderboard source
CREATE TABLE public.player_stats (
  user_id uuid NOT NULL,
  world text NOT NULL,
  kills integer NOT NULL DEFAULT 0,
  deaths integer NOT NULL DEFAULT 0,
  max_combo integer NOT NULL DEFAULT 0,
  signature_moves integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, world)
);
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stats select" ON public.player_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own stats insert" ON public.player_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own stats update" ON public.player_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Regressive enemy events log
CREATE TABLE public.mage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  world text NOT NULL,
  predicted text,
  counter text NOT NULL,
  source text NOT NULL DEFAULT 'queue',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events select" ON public.mage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own events insert" ON public.mage_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX mage_events_user_world_idx ON public.mage_events (user_id, world, created_at DESC);

-- Public leaderboard view (joins username, hides user_id)
CREATE VIEW public.leaderboard_public WITH (security_invoker=on) AS
  SELECT p.username, s.world, s.score, s.kills, s.deaths, s.max_combo, s.signature_moves, s.updated_at
  FROM public.player_stats s
  JOIN public.profiles p ON p.user_id = s.user_id;

-- Allow authenticated users to read leaderboard rows from player_stats via a permissive SELECT through view:
-- The view uses security_invoker, so policies on player_stats apply. Add a public-read policy limited to safe columns is impossible at table level,
-- so add a separate policy allowing authenticated to read all stats (no PII; user_id is uuid only).
CREATE POLICY "leaderboard read all stats" ON public.player_stats FOR SELECT TO authenticated USING (true);

-- Trigger: keep updated_at fresh
CREATE TRIGGER mage_memory_updated BEFORE UPDATE ON public.mage_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER player_stats_updated BEFORE UPDATE ON public.player_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
