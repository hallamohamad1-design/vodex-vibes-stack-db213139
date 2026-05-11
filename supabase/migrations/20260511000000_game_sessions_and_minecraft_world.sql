
-- Game Sessions table for multiplayer matches with round time tracking
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES public.game_invites(id) ON DELETE CASCADE,
  world text NOT NULL,
  host_id uuid REFERENCES public.profiles(user_id) NOT NULL,
  guest_id uuid REFERENCES public.profiles(user_id),
  status text NOT NULL DEFAULT 'active', -- active, completed, expired
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  round_duration_seconds int NOT NULL DEFAULT 180, -- 3 minutes default
  host_score int DEFAULT 0,
  guest_score int DEFAULT 0,
  winner_id uuid REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Players can read sessions they're part of
CREATE POLICY "session participants can read sessions"
  ON public.game_sessions FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Hosts can create sessions
CREATE POLICY "hosts can create sessions"
  ON public.game_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Players can update their sessions
CREATE POLICY "session participants can update sessions"
  ON public.game_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Enable realtime for live session updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

-- Add session_id foreign key to game_history if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'game_history_session_id_fkey' 
    AND table_name = 'game_history'
  ) THEN
    ALTER TABLE public.game_history 
    ADD CONSTRAINT game_history_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Blocks table for Minecraft world (BlockWorld)
CREATE TABLE IF NOT EXISTS public.world_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.profiles(user_id) NOT NULL,
  world text NOT NULL DEFAULT 'blockworld',
  x int NOT NULL,
  y int NOT NULL,
  z int NOT NULL,
  block_type text NOT NULL DEFAULT 'grass',
  color text NOT NULL DEFAULT '#4caf50',
  placed_at timestamptz NOT NULL DEFAULT now(),
  is_removed boolean DEFAULT false,
  removed_at timestamptz,
  removed_by uuid REFERENCES public.profiles(user_id),
  UNIQUE(session_id, x, y, z)
);

ALTER TABLE public.world_blocks ENABLE ROW LEVEL SECURITY;

-- Players can read blocks in their sessions
CREATE POLICY "session participants can read blocks"
  ON public.world_blocks FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.game_sessions
      WHERE host_id = auth.uid() OR guest_id = auth.uid()
    )
  );

-- Players can place blocks
CREATE POLICY "players can place blocks"
  ON public.world_blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- Players can remove their own blocks
CREATE POLICY "players can remove blocks"
  ON public.world_blocks FOR UPDATE TO authenticated
  USING (auth.uid() = player_id);

-- Enable realtime for block sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_blocks;

-- Add stack_order to game_history to track Stack position for undo
ALTER TABLE public.game_history ADD COLUMN IF NOT EXISTS stack_order int;

-- Add queue_order to game_history to track Queue position
ALTER TABLE public.game_history ADD COLUMN IF NOT EXISTS queue_order int;

-- Create index for faster history queries
CREATE INDEX IF NOT EXISTS idx_game_history_session_world 
  ON public.game_history(session_id, world, created_at DESC);

-- Function to automatically expire sessions after round duration
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.game_sessions
  SET status = 'expired', ended_at = now()
  WHERE status = 'active'
  AND started_at + (round_duration_seconds || ' seconds')::interval < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to expire sessions periodically (on any game_history insert)
CREATE OR REPLACE FUNCTION trigger_expire_sessions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM expire_old_sessions();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expire_sessions ON public.game_history;
CREATE TRIGGER trg_expire_sessions
  AFTER INSERT ON public.game_history
  EXECUTE FUNCTION trigger_expire_sessions();
