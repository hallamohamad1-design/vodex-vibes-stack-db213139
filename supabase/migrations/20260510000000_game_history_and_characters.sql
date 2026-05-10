
-- Add character skin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS character_skin text DEFAULT 'operative';

-- Game history table for multiplayer round actions
CREATE TABLE IF NOT EXISTS public.game_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.game_invites(id), -- ties to the multiplayer invite/session
  player_id uuid REFERENCES public.profiles(user_id) NOT NULL,
  world text NOT NULL,
  action_type text NOT NULL,          -- the ActionType enum value
  source text NOT NULL DEFAULT 'queue', -- 'queue' | 'stack' (which data structure triggered it)
  is_signature boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read history for a session they're part of
CREATE POLICY "session participants can read history"
  ON public.game_history FOR SELECT TO authenticated
  USING (
    auth.uid() = player_id
    OR session_id IN (
      SELECT id FROM public.game_invites
      WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
    )
  );

-- Players can insert their own actions
CREATE POLICY "players can log their own actions"
  ON public.game_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- Enable realtime for live history feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_history;
