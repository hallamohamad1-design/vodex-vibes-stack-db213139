import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ACTION_KINDS, WORLDS } from "@/lib/worlds";
import { toast } from "sonner";
import { Clock, Layers, ListOrdered, Eye } from "lucide-react";

export const Route = createFileRoute("/game/$roomId")({ component: GameRoom });

type Player = { id: string; username: string; character_name: string; character_class: string; avatar: string };
type Room = { id: string; world: string; status: string; host_id: string; guest_id: string; started_at: string | null; ends_at: string | null; winner_id: string | null };
type Action = { id: string; room_id: string; player_id: string; kind: string; label: string; parent_id: string | null; created_at: string };

function GameRoom() {
  const { roomId } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [opponent, setOpponent] = useState<Player | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { if (!loading && !user) router.navigate({ to: "/auth" }); }, [user, loading, router]);

  // Load room + opponent
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: r } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
      if (!r) { toast.error("Room not found"); router.navigate({ to: "/lobby" }); return; }
      const room = r as Room;
      setRoom(room);
      const oppId = room.host_id === user.id ? room.guest_id : room.host_id;
      const { data: opp } = await supabase.from("profiles").select("*").eq("id", oppId).maybeSingle();
      setOpponent(opp as Player);
    })();
    const ch = supabase.channel(`room-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (p) => setRoom(p.new as Room))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, roomId, router]);

  // Load + subscribe actions
  useEffect(() => {
    if (!user) return;
    supabase.from("game_actions").select("*").eq("room_id", roomId).order("created_at", { ascending: true })
      .then(({ data }) => setActions((data as Action[]) ?? []));
    const ch = supabase.channel(`actions-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_actions", filter: `room_id=eq.${roomId}` },
        (p) => setActions((prev) => [...prev, p.new as Action]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, roomId]);

  // Timer tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Auto-finish when timer expires
  useEffect(() => {
    if (!room || room.status !== "active" || !room.ends_at) return;
    const ms = new Date(room.ends_at).getTime() - now;
    if (ms <= 0) {
      // Decide a winner by action count (simple rule)
      const counts = new Map<string, number>();
      for (const a of actions) counts.set(a.player_id, (counts.get(a.player_id) ?? 0) + 1);
      const ids = [room.host_id, room.guest_id];
      const winner = ids[0] && ids[1]
        ? (counts.get(ids[0]) ?? 0) === (counts.get(ids[1]) ?? 0)
          ? null
          : (counts.get(ids[0]) ?? 0) > (counts.get(ids[1]) ?? 0) ? ids[0] : ids[1]
        : null;
      supabase.from("rooms").update({ status: "finished", winner_id: winner }).eq("id", room.id);
    }
  }, [now, room, actions]);

  const remainingMs = room?.ends_at ? Math.max(0, new Date(room.ends_at).getTime() - now) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");
  const totalMs = 3 * 60 * 1000;
  const pct = room?.ends_at ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;

  const worldMeta = WORLDS.find((w) => w.id === room?.world);

  // History split: my stack (LIFO most recent at top), shared queue (FIFO earliest first)
  const myActions = useMemo(() => actions.filter((a) => a.player_id === user?.id), [actions, user]);
  const myStack = useMemo(() => [...myActions].reverse(), [myActions]);
  const sharedQueue = actions;

  // Enemy feed: timestamps, predicted vs counter, last 6 events of THIS world (this room)
  const enemyFeed = useMemo(() => {
    const enemyActions = actions.filter((a) => a.player_id === opponent?.id);
    const enriched = enemyActions.map((a) => {
      let counter: Action | undefined;
      if (a.kind === "predicted") {
        counter = actions.find((c) => c.kind === "counter" && c.parent_id === a.id);
      }
      return { action: a, counter };
    });
    return enriched.slice(-6).reverse();
  }, [actions, opponent]);

  const performAction = async (kind: string, label: string, parent_id?: string | null) => {
    if (!user || !room) return;
    if (room.status !== "active") return toast.error("Round is not active");
    if (remainingMs <= 0) return toast.error("Round ended");
    const { error } = await supabase.from("game_actions").insert({
      room_id: room.id, player_id: user.id, kind, label, parent_id: parent_id ?? null,
    });
    if (error) toast.error(error.message);
  };

  const counterLastPrediction = async () => {
    if (!opponent) return;
    const lastPred = [...actions].reverse().find((a) => a.player_id === opponent.id && a.kind === "predicted");
    if (!lastPred) return toast.error("No prediction to counter");
    await performAction("counter", `Countered "${lastPred.label}"`, lastPred.id);
  };

  if (loading || !user || !profile || !room) {
    return <div className="min-h-screen"><Navbar /><p className="p-8 text-center text-muted-foreground">Loading duel…</p></div>;
  }

  const finished = room.status === "finished";
  const won = finished && room.winner_id === user.id;
  const draw = finished && room.winner_id === null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-primary text-glow">
              {worldMeta?.emoji} {worldMeta?.name}
            </h1>
            <p className="text-xs text-muted-foreground">{worldMeta?.description}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/70 px-4 py-2 text-center shadow-glow">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" /> Time</div>
            <div className="font-display text-3xl text-primary tabular-nums">{mm}:{ss}</div>
            <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PlayerCard label="You" name={profile.character_name} avatar={profile.avatar} klass={profile.character_class} count={myActions.length} />
          {opponent && <PlayerCard label="Opponent" name={opponent.character_name} avatar={opponent.avatar} klass={opponent.character_class} count={actions.filter((a) => a.player_id === opponent.id).length} />}
        </div>

        {/* Game over banner */}
        {finished && (
          <div className={`mt-4 rounded-lg border p-4 text-center font-display text-xl ${won ? "border-primary bg-primary/15 text-primary text-glow" : draw ? "border-muted bg-muted/30" : "border-destructive bg-destructive/15 text-destructive"}`}>
            {won ? "Victory!" : draw ? "A draw — both warriors stand." : "Defeat. The realm remembers."}
            <div className="mt-2"><Link to="/lobby"><Button size="sm">Back to lobby</Button></Link></div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 backdrop-blur">
            <h2 className="font-display text-lg">Take an action</h2>
            <p className="text-xs text-muted-foreground">Predicted moves can be countered by your rival.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTION_KINDS.filter((a) => a.id !== "counter").map((a) => (
                <Button
                  key={a.id}
                  variant={a.id === "predicted" ? "default" : "secondary"}
                  className={a.id === "predicted" ? "bg-accent text-accent-foreground" : ""}
                  disabled={room.status !== "active" || remainingMs <= 0}
                  onClick={() => performAction(a.id, `${a.emoji} ${a.label}`)}
                >
                  <span className="mr-1">{a.emoji}</span> {a.label}
                </Button>
              ))}
              <Button
                variant="destructive"
                disabled={room.status !== "active" || remainingMs <= 0}
                onClick={counterLastPrediction}
              >↩️ Counter last prediction</Button>
            </div>

            {/* Enemy feed */}
            <div className="mt-6">
              <h3 className="flex items-center gap-2 font-display text-base"><Eye className="h-4 w-4 text-accent" /> Enemy Feed</h3>
              <p className="text-[11px] text-muted-foreground">Latest moves from your rival in {worldMeta?.name} — predicted vs counter.</p>
              <ul className="mt-2 space-y-2">
                {enemyFeed.length === 0 && <li className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">No enemy actions yet.</li>}
                {enemyFeed.map(({ action, counter }) => {
                  const ts = new Date(action.created_at);
                  const isPred = action.kind === "predicted";
                  const isCounter = action.kind === "counter";
                  return (
                    <li key={action.id} className={`rounded-md border p-2 text-sm ${isPred ? "border-accent/60 bg-accent/10" : isCounter ? "border-destructive/60 bg-destructive/10" : "border-border/60 bg-background/40"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">{action.kind}</span>
                        <time className="text-[10px] tabular-nums text-muted-foreground">{ts.toLocaleTimeString()}</time>
                      </div>
                      <div className="mt-1">{action.label}</div>
                      {isPred && (
                        <div className="mt-1 text-xs">
                          {counter
                            ? <span className="text-destructive">⤳ countered by you: {counter.label}</span>
                            : <span className="text-accent">⤳ awaiting counter…</span>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* History: stack + queue */}
          <aside className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-card/60 p-3">
              <h3 className="flex items-center gap-2 font-display text-sm"><Layers className="h-4 w-4 text-primary" /> Your Stack (last in, first out)</h3>
              <ul className="mt-2 max-h-[200px] space-y-1 overflow-y-auto text-xs">
                {myStack.length === 0 && <li className="text-muted-foreground">No actions yet.</li>}
                {myStack.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded bg-background/50 px-2 py-1">
                    <span>{a.label}</span>
                    <time className="text-[10px] tabular-nums text-muted-foreground">{new Date(a.created_at).toLocaleTimeString()}</time>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/60 p-3">
              <h3 className="flex items-center gap-2 font-display text-sm"><ListOrdered className="h-4 w-4 text-accent" /> Round Queue (first in, first out)</h3>
              <ul className="mt-2 max-h-[260px] space-y-1 overflow-y-auto text-xs">
                {sharedQueue.length === 0 && <li className="text-muted-foreground">No history.</li>}
                {sharedQueue.map((a) => {
                  const mine = a.player_id === user.id;
                  return (
                    <li key={a.id} className={`flex items-center justify-between rounded px-2 py-1 ${mine ? "bg-primary/15" : "bg-secondary/60"}`}>
                      <span>{mine ? "You" : opponent?.character_name ?? "Rival"}: {a.label}</span>
                      <time className="text-[10px] tabular-nums text-muted-foreground">{new Date(a.created_at).toLocaleTimeString()}</time>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PlayerCard({ label, name, avatar, klass, count }: { label: string; name: string; avatar: string; klass: string; count: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 p-3 backdrop-blur">
      <span className="text-3xl">{avatar}</span>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-lg">{name}</div>
        <div className="text-xs text-muted-foreground">{klass}</div>
      </div>
      <div className="text-right">
        <div className="font-display text-2xl text-primary tabular-nums">{count}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">actions</div>
      </div>
    </div>
  );
}
