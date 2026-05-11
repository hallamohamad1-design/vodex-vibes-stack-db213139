
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  character_name text not null default 'Hero',
  character_class text not null default 'warrior',
  avatar text not null default '⚔️',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'player'
  );
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;
  insert into public.profiles (id, username, character_name, character_class, avatar)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'character_name', initcap(final_username)),
    coalesce(new.raw_user_meta_data->>'character_class', 'warrior'),
    coalesce(new.raw_user_meta_data->>'avatar', '⚔️')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  world text not null,
  status text not null default 'pending', -- pending | active | finished | declined
  host_id uuid not null references public.profiles(id) on delete cascade,
  guest_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz,
  ends_at timestamptz,
  winner_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index rooms_host_idx on public.rooms(host_id);
create index rooms_guest_idx on public.rooms(guest_id);

alter table public.rooms enable row level security;

create policy "Players can view their rooms"
  on public.rooms for select to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);

create policy "Host can create rooms"
  on public.rooms for insert to authenticated
  with check (auth.uid() = host_id);

create policy "Players can update their rooms"
  on public.rooms for update to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);

-- Direct messages (used for pre-game chat to agree to play)
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index dm_pair_idx on public.direct_messages(from_id, to_id, created_at);
create index dm_pair_idx2 on public.direct_messages(to_id, from_id, created_at);

alter table public.direct_messages enable row level security;

create policy "Users can read their own DMs"
  on public.direct_messages for select to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

create policy "Users can send DMs as themselves"
  on public.direct_messages for insert to authenticated
  with check (auth.uid() = from_id);

-- Game actions (history stack/queue + enemy feed)
create table public.game_actions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, -- 'predicted' | 'counter' | 'attack' | 'defend' | 'special'
  label text not null,
  parent_id uuid references public.game_actions(id) on delete set null, -- for counter -> predicted link
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index game_actions_room_idx on public.game_actions(room_id, created_at);

alter table public.game_actions enable row level security;

create policy "Players can read actions in their rooms"
  on public.game_actions for select to authenticated
  using (exists (
    select 1 from public.rooms r
    where r.id = room_id and (r.host_id = auth.uid() or r.guest_id = auth.uid())
  ));

create policy "Players can insert their own actions in their rooms"
  on public.game_actions for insert to authenticated
  with check (
    auth.uid() = player_id and exists (
      select 1 from public.rooms r
      where r.id = room_id and (r.host_id = auth.uid() or r.guest_id = auth.uid())
    )
  );

-- Realtime
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.game_actions;
alter table public.rooms replica identity full;
alter table public.direct_messages replica identity full;
alter table public.game_actions replica identity full;
