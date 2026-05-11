import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WORLDS } from "@/lib/worlds";
import { toast } from "sonner";
import { Send, Swords, Inbox } from "lucide-react";

export const Route = createFileRoute("/lobby")({ component: Lobby });

type Player = { id: string; username: string; character_name: string; character_class: string; avatar: string };
type DM = { id: string; from_id: string; to_id: string; content: string; created_at: string };
type Room = { id: string; world: string; status: string; host_id: string; guest_id: string };

function Lobby() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [draft, setDraft] = useState("");
  const [world, setWorld] = useState(WORLDS[0].id);
  const [invitations, setInvitations] = useState<(Room & { host: Player })[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) router.navigate({ to: "/auth" }); }, [user, loading, router]);

  // Load players
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").neq("id", user.id).then(({ data }) => {
      setPlayers((data as Player[]) ?? []);
    });
  }, [user]);

  // Load invitations directed at me + redirect when one is accepted
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
        .in("status", ["pending", "active"])
        .order("created_at", { ascending: false });
      const rooms = (data as Room[]) ?? [];
      const active = rooms.find((r) => r.status === "active");
      if (active) { router.navigate({ to: "/game/$roomId", params: { roomId: active.id } }); return; }
      const pendingIn = rooms.filter((r) => r.status === "pending" && r.guest_id === user.id);
      const hostIds = pendingIn.map((r) => r.host_id);
      if (hostIds.length === 0) { setInvitations([]); return; }
      const { data: hosts } = await supabase.from("profiles").select("*").in("id", hostIds);
      const hostMap = new Map((hosts as Player[] ?? []).map((p) => [p.id, p]));
      setInvitations(pendingIn.map((r) => ({ ...r, host: hostMap.get(r.host_id)! })).filter((r) => r.host));
    };
    load();
    const ch = supabase.channel(`rooms-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, router]);

  // Load + subscribe DMs with selected
  useEffect(() => {
    if (!user || !selected) { setMessages([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(from_id.eq.${user.id},to_id.eq.${selected.id}),and(from_id.eq.${selected.id},to_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!cancelled) setMessages((data as DM[]) ?? []);
    };
    load();
    const ch = supabase.channel(`dm-${user.id}-${selected.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as DM;
        if ((m.from_id === user.id && m.to_id === selected.id) || (m.from_id === selected.id && m.to_id === user.id)) {
          setMessages((prev) => [...prev, m]);
        }
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user, selected]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!user || !selected || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const { error } = await supabase.from("direct_messages").insert({ from_id: user.id, to_id: selected.id, content });
    if (error) toast.error(error.message);
  };

  const invite = async () => {
    if (!user || !selected) return toast.error("Select a player to challenge");
    const { data, error } = await supabase
      .from("rooms")
      .insert({ host_id: user.id, guest_id: selected.id, world, status: "pending" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    await supabase.from("direct_messages").insert({
      from_id: user.id, to_id: selected.id,
      content: `⚔️ I challenge you to a duel in ${WORLDS.find((w) => w.id === world)?.name}! Accept in your invitations panel.`,
    });
    toast.success("Challenge sent");
    void data;
  };

  const accept = async (room: Room) => {
    if (!user) return;
    const ends = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("rooms")
      .update({ status: "active", started_at: new Date().toISOString(), ends_at: ends })
      .eq("id", room.id);
    if (error) return toast.error(error.message);
    router.navigate({ to: "/game/$roomId", params: { roomId: room.id } });
  };

  const decline = async (room: Room) => {
    await supabase.from("rooms").update({ status: "declined" }).eq("id", room.id);
  };

  if (loading || !user || !profile) return <div className="min-h-screen"><Navbar /><p className="p-8 text-center text-muted-foreground">Loading…</p></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-display text-3xl text-primary text-glow">The Lobby</h1>
        <p className="text-sm text-muted-foreground">Pick a rival, parley to agree on a duel, then choose a world.</p>

        {invitations.length > 0 && (
          <div className="mt-4 rounded-lg border border-accent/50 bg-accent/10 p-4">
            <h2 className="flex items-center gap-2 font-display text-lg"><Inbox className="h-4 w-4" /> Incoming Challenges</h2>
            <ul className="mt-2 space-y-2">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between rounded-md bg-background/40 p-2">
                  <span className="text-sm">
                    <span className="text-lg">{inv.host.avatar}</span> <strong>{inv.host.character_name}</strong> challenges you in <em>{WORLDS.find((w) => w.id === inv.world)?.name}</em>
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => accept(inv)}>Accept</Button>
                    <Button size="sm" variant="ghost" onClick={() => decline(inv)}>Decline</Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
          {/* Player list */}
          <aside className="rounded-lg border border-border/60 bg-card/60 p-3 backdrop-blur">
            <h2 className="mb-2 px-1 font-display text-sm uppercase tracking-wider text-muted-foreground">Players</h2>
            <ul className="space-y-1">
              {players.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">No other players yet. Invite a friend to sign up!</li>}
              {players.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelected(p)}
                    className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors ${selected?.id === p.id ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-background/50"}`}
                  >
                    <span className="text-2xl">{p.avatar}</span>
                    <div className="leading-tight">
                      <div className="text-sm font-semibold">{p.character_name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.character_class} · @{p.username}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Chat + invite */}
          <section className="flex flex-col rounded-lg border border-border/60 bg-card/60 backdrop-blur">
            {selected ? (
              <>
                <div className="flex items-center justify-between border-b border-border/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selected.avatar}</span>
                    <div>
                      <div className="font-display">{selected.character_name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{selected.character_class}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={world} onValueChange={setWorld}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WORLDS.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.emoji} {w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={invite} className="bg-gold text-primary-foreground">
                      <Swords className="mr-1 h-4 w-4" /> Challenge
                    </Button>
                  </div>
                </div>
                <div className="h-[420px] space-y-2 overflow-y-auto p-3">
                  {messages.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No messages yet — say hello!</p>}
                  {messages.map((m) => {
                    const mine = m.from_id === user.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                          {m.content}
                          <div className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2 border-t border-border/60 p-3">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    placeholder="Negotiate the terms of the duel…"
                  />
                  <Button onClick={send}><Send className="h-4 w-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex h-[520px] items-center justify-center text-center text-sm text-muted-foreground">
                <div>
                  <p>Select a player to chat with.</p>
                  <p className="mt-2">Then pick a world and challenge them.</p>
                  <Link to="/" className="mt-4 inline-block text-xs text-primary hover:underline">← Home</Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
