
-- Add online presence to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'offline';

-- Messages table for chat
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.profiles(user_id) NOT NULL,
  recipient_id uuid REFERENCES public.profiles(user_id), -- null for global chat
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read global messages" ON public.messages FOR SELECT TO authenticated USING (recipient_id IS NULL);
CREATE POLICY "users can read private messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Game invites table
CREATE TABLE IF NOT EXISTS public.game_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.profiles(user_id) NOT NULL,
  recipient_id uuid REFERENCES public.profiles(user_id) NOT NULL,
  world text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can see their invites" ON public.game_invites FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "users can send invites" ON public.game_invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "users can update their invites" ON public.game_invites FOR UPDATE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Realtime setup
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;
