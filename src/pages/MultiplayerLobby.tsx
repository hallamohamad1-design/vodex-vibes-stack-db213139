import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ParticleBackground } from "@/components/ParticleBackground";
import type { PlayerProfile, Message, GameInvite, WorldId, CharacterSkin, GameHistoryEntry } from "@/game/types";
import { CHARACTER_SKINS } from "@/game/types";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const WORLD_OPTIONS: { value: WorldId; label: string; icon: string }[] = [
  { value: "vodex",        label: "VODEX REALM",   icon: "◈" },
  { value: "battleground", label: "BATTLEGROUND",  icon: "⚔" },
  { value: "virtual",      label: "VIRTUAL CORE",  icon: "⬡" },
  { value: "blockworld",   label: "BLOCKWORLD",    icon: "◼" },
];

function skinInfo(skin: CharacterSkin) {
  return CHARACTER_SKINS.find((s) => s.id === skin) ?? CHARACTER_SKINS[0];
}

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
  } catch { return "--:--"; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MultiplayerLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [players,       setPlayers]       = useState<PlayerProfile[]>([]);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [invites,       setInvites]       = useState<GameInvite[]>([]);
  const [recentHistory, setRecentHistory] = useState<GameHistoryEntry[]>([]);
  const [newMessage,    setNewMessage]    = useState("");
  const [selectedWorld, setSelectedWorld] = useState<WorldId>("vodex");
  const [mySkin,        setMySkin]        = useState<CharacterSkin>("operative");
  const [showSkinPicker, setShowSkinPicker] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Load own skin + fetch initial data ──────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // 1. Own profile (skin + username)
      const { data: own } = await supabase
        .from("profiles")
        .select("username, character_skin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (own?.character_skin) setMySkin(own.character_skin as CharacterSkin);
      if (!own) toast.error("Echo Identity not found — try logging out and back in.");

      // 2. Online players (seen in last 5 min)
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user.id)
        .gt("last_seen_at", fiveMinsAgo);
      if (profiles) setPlayers(profiles as PlayerProfile[]);

      // 3. Global chat (last 50)
      const { data: msgData } = await supabase
        .from("messages")
        .select("*, profiles!messages_sender_id_fkey(username)")
        .is("recipient_id", null)
        .order("created_at", { ascending: true })
        .limit(50);
      if (msgData) {
        setMessages(
          msgData.map((m) => ({
            ...m,
            sender_username: (m.profiles as any)?.username,
          })) as Message[]
        );
      }

      // 4. Pending invites
      const { data: inviteData } = await supabase
        .from("game_invites")
        .select("*, profiles!game_invites_sender_id_fkey(username)")
        .eq("recipient_id", user.id)
        .eq("status", "pending");
      if (inviteData) {
        setInvites(
          inviteData.map((i) => ({
            ...i,
            sender_username: (i.profiles as any)?.username,
          })) as GameInvite[]
        );
      }

      // 5. Recent game history (last 20 entries across all worlds)
      const { data: histData } = await supabase
        .from("game_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (histData) setRecentHistory((histData as GameHistoryEntry[]).reverse());
    };

    fetchData();

    // ── Realtime subscriptions ───────────────────────────────────────────
    const msgChannel = supabase
      .channel("global_chat")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "recipient_id=is.null" },
        async (payload) => {
          const { data: sender } = await supabase
            .from("profiles").select("username")
            .eq("user_id", payload.new.sender_id).single();
          setMessages((prev) => [
            ...prev,
            { ...payload.new, sender_username: sender?.username } as Message,
          ]);
        })
      .subscribe();

    const inviteChannel = supabase
      .channel("invites")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "game_invites", filter: `recipient_id=eq.${user.id}` },
        async (payload) => {
          const { data: sender } = await supabase
            .from("profiles").select("username")
            .eq("user_id", payload.new.sender_id).single();
          setInvites((prev) => [
            ...prev,
            { ...payload.new, sender_username: sender?.username } as GameInvite,
          ]);
          toast.info(`⚔ Challenge from ${sender?.username ?? "Operative"}!`);
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_invites", filter: `sender_id=eq.${user.id}` },
        async (payload) => {
          if (payload.new.status === "accepted") {
            toast.success("🚀 Challenge accepted! Launching session…");
            const { data: recipient } = await supabase
              .from("profiles").select("username")
              .eq("user_id", payload.new.recipient_id).single();
            navigate(
              `/play/${payload.new.world}?multiplayer=true&role=host&inviteId=${payload.new.id}&peerName=${recipient?.username ?? "Guest"}`
            );
          } else if (payload.new.status === "rejected") {
            toast.error("Challenge declined by operative.");
          }
        })
      .subscribe();

    const historyChannel = supabase
      .channel("lobby_history_feed")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "game_history" },
        (payload) => {
          setRecentHistory((prev) => [...prev.slice(-19), payload.new as GameHistoryEntry]);
        })
      .subscribe();

    // Heartbeat for presence
    const heartbeat = setInterval(() => {
      supabase.from("profiles")
        .update({ last_seen_at: new Date().toISOString(), status: "online" })
        .eq("user_id", user.id)
        .then();
    }, 30_000);

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(inviteChannel);
      supabase.removeChannel(historyChannel);
      clearInterval(heartbeat);
    };
  }, [user, navigate]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (error) toast.error(`Send failed: ${error.message}`);
    else setNewMessage("");
  };

  const sendInvite = async (recipientId: string) => {
    if (!user) return;
    const { error } = await supabase.from("game_invites").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      world: selectedWorld,
    });
    if (error) toast.error("Failed to send challenge");
    else toast.success("⚔ Challenge sent!");
  };

  const acceptInvite = async (invite: GameInvite) => {
    const { error } = await supabase
      .from("game_invites").update({ status: "accepted" }).eq("id", invite.id);
    if (error) toast.error("Failed to accept challenge");
    else {
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      navigate(
        `/play/${invite.world}?multiplayer=true&role=guest&inviteId=${invite.id}&peerName=${invite.sender_username}`
      );
    }
  };

  const declineInvite = async (invite: GameInvite) => {
    const { error } = await supabase
      .from("game_invites").update({ status: "rejected" }).eq("id", invite.id);
    if (error) toast.error("Failed to decline");
    else {
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      toast.info("Challenge declined.");
    }
  };

  const saveSkin = async (skin: CharacterSkin) => {
    setMySkin(skin);
    setShowSkinPicker(false);
    if (!user) return;
    await supabase.from("profiles")
      .update({ character_skin: skin })
      .eq("user_id", user.id);
    toast.success(`Operative skin set: ${skinInfo(skin).label}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#060810]">
      <ParticleBackground />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 p-4 flex flex-wrap justify-between items-center gap-3 border-b border-primary/20 backdrop-blur-md bg-black/30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="font-mono text-xs text-primary/70 hover:text-primary transition"
          >
            ← HUB
          </button>
          <div className="flex flex-col">
            <h1 className="font-title text-xl tracking-[0.2em] text-primary text-glow-cyan">
              MULTIPLAYER LOBBY
            </h1>
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground/60 uppercase">
              Registration required · Queue &amp; Stack powered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* My character skin */}
          <div className="relative">
            <button
              onClick={() => setShowSkinPicker((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/20 bg-black/40 hover:border-primary/50 transition"
            >
              <span className={cn("font-title text-lg", skinInfo(mySkin).color)}>
                {skinInfo(mySkin).icon}
              </span>
              <div className="flex flex-col items-start">
                <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">My Class</span>
                <span className={cn("font-mono text-[10px] font-bold", skinInfo(mySkin).color)}>
                  {skinInfo(mySkin).label}
                </span>
              </div>
              <span className="text-muted-foreground text-xs">▾</span>
            </button>

            {/* Skin picker dropdown */}
            {showSkinPicker && (
              <div className="absolute top-full right-0 mt-1 z-50 rounded-lg border border-primary/30 bg-[#070b18] backdrop-blur-xl shadow-[0_0_30px_rgba(0,240,255,0.1)] p-2 w-56">
                <p className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest mb-2 px-1">
                  Select Operative Class
                </p>
                {CHARACTER_SKINS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => saveSkin(s.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-2 py-1.5 rounded-md font-mono text-[11px] transition hover:bg-white/5",
                      mySkin === s.id
                        ? "border border-primary/30 bg-primary/5"
                        : "border border-transparent"
                    )}
                  >
                    <span className={cn("text-xl", s.color)}>{s.icon}</span>
                    <span className={s.color}>{s.label}</span>
                    {mySkin === s.id && (
                      <span className="ml-auto text-primary text-[8px]">✓ ACTIVE</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* World selector */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-widest">
              Challenge World
            </span>
            <div className="flex gap-1">
              {WORLD_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  onClick={() => setSelectedWorld(w.value)}
                  title={w.label}
                  className={cn(
                    "px-2 py-1.5 rounded border font-title text-[9px] tracking-widest transition",
                    selectedWorld === w.value
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-white/10 bg-black/30 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {w.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">

        {/* ── Column 1: Operatives Online ─────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-3 panel border-primary/20 bg-black/40 backdrop-blur-sm p-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-primary/10 pb-2">
            <h3 className="font-title text-[11px] tracking-widest text-primary">OPERATIVES ONLINE</h3>
            <span className="font-mono text-[8px] text-primary/50">{players.length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {players.length === 0 && (
              <p className="text-muted-foreground text-xs italic text-center py-6">
                No other operatives detected…
              </p>
            )}
            {players.map((p) => {
              const si = skinInfo(p.character_skin ?? "operative");
              return (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-white/5 group hover:border-primary/30 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("text-lg", si.color)} title={si.label}>{si.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-mono text-foreground">{p.username}</span>
                      <span className={cn("text-[8px] font-mono uppercase tracking-tighter", si.color)}>
                        {si.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        p.status === "online" ? "bg-green-500" :
                        p.status === "in-game" ? "bg-yellow-500" : "bg-muted-foreground"
                      )}
                      title={p.status}
                    />
                    <button
                      onClick={() => sendInvite(p.user_id)}
                      className="px-2 py-1 bg-primary/20 hover:bg-primary/40 text-primary text-[9px] font-bold rounded border border-primary/30 transition opacity-0 group-hover:opacity-100"
                    >
                      CHALLENGE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* System status */}
          <div className="mt-auto pt-2 border-t border-white/5 space-y-1">
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-muted-foreground">LATENCY</span>
              <span className="text-green-500">~24ms</span>
            </div>
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-muted-foreground">ENCRYPTION</span>
              <span className="text-primary">AES-256</span>
            </div>
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-muted-foreground">WORLD</span>
              <span className="text-primary uppercase">{selectedWorld}</span>
            </div>
          </div>
        </div>

        {/* ── Column 2: Global Chat ────────────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col gap-3 panel border-secondary/20 bg-black/40 backdrop-blur-sm p-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-secondary/10 pb-2">
            <h3 className="font-title text-[11px] tracking-widest text-secondary">GLOBAL COMMS</h3>
            <span className="font-mono text-[8px] text-secondary/50">Chat to arrange a match</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold text-secondary">{msg.sender_username ?? "Operative"}</span>
                  <span className="text-[8px] text-muted-foreground/60 tabular-nums">
                    [{fmtTime(msg.created_at)}]
                  </span>
                </div>
                <p className="text-sm text-foreground/90 font-body bg-white/5 px-3 py-1.5 rounded-md border-l-2 border-secondary/40">
                  {msg.content}
                </p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t border-white/10">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type to arrange a match…"
              className="flex-1 bg-black/50 border border-white/10 rounded-l-md px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-secondary outline-none transition"
            />
            <button
              type="submit"
              className="bg-secondary/20 hover:bg-secondary/40 text-secondary px-4 py-2 rounded-r-md font-bold text-xs border border-secondary/30 border-l-0 transition"
            >
              SEND
            </button>
          </form>
        </div>

        {/* ── Column 3: Challenges + History ───────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* Incoming Challenges */}
          <div className="flex-none panel border-yellow-500/20 bg-black/40 backdrop-blur-sm p-4">
            <h3 className="font-title text-[11px] tracking-widest text-yellow-400 border-b border-yellow-500/10 pb-2 mb-3">
              INCOMING CHALLENGES
            </h3>
            <div className="space-y-3 max-h-52 overflow-y-auto custom-scrollbar">
              {invites.length === 0 && (
                <p className="text-muted-foreground text-xs italic text-center py-4">
                  No pending challenges…
                </p>
              )}
              {invites.map((inv) => (
                <div key={inv.id} className="p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-yellow-400 font-bold">{inv.sender_username}</span>
                      <span className="font-mono text-[8px] text-muted-foreground/60 uppercase">
                        challenged you to {inv.world}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground/60">
                      {fmtTime(inv.created_at)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptInvite(inv)}
                      className="flex-1 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 text-[10px] font-bold rounded border border-yellow-500/40 transition"
                    >
                      ✓ ACCEPT
                    </button>
                    <button
                      onClick={() => declineInvite(inv)}
                      className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded border border-red-500/20 transition"
                    >
                      ✕ DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game History Feed */}
          <div className="flex-1 panel border-primary/10 bg-black/40 backdrop-blur-sm p-4 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-primary/10 pb-2 mb-2">
              <h3 className="font-title text-[11px] tracking-widest text-primary">GAME HISTORY</h3>
              <span className="font-mono text-[8px] text-muted-foreground/50">Stack + Queue actions</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
              {recentHistory.length === 0 && (
                <p className="font-mono text-[9px] italic text-muted-foreground/50 text-center py-4">
                  No session history yet…
                </p>
              )}
              {recentHistory.map((entry, idx) => (
                <div
                  key={entry.id ?? idx}
                  className="flex items-center gap-2 px-2 py-1 rounded font-mono text-[9px] hover:bg-white/5 transition"
                >
                  {/* Source badge */}
                  <span
                    className={cn(
                      "flex-none rounded border px-1 py-0.5 text-[7px] font-bold uppercase",
                      entry.source === "stack"
                        ? "border-secondary/40 bg-secondary/10 text-secondary"
                        : "border-primary/40 bg-primary/10 text-primary"
                    )}
                  >
                    {entry.source === "stack" ? "S" : "Q"}
                  </span>
                  {/* Player */}
                  <span className="text-muted-foreground/60 truncate flex-none max-w-[4rem]">
                    {entry.player_username ?? entry.player_id.slice(0, 5) + "…"}
                  </span>
                  {/* Action */}
                  <span
                    className={cn(
                      "flex-1 truncate font-bold",
                      entry.is_signature ? "text-secondary" : "text-foreground/80"
                    )}
                  >
                    {entry.action_type}
                    {entry.is_signature && <span className="text-[7px] text-secondary ml-1">★</span>}
                  </span>
                  {/* World */}
                  <span className="flex-none text-[7px] text-muted-foreground/40 uppercase">
                    {entry.world.slice(0, 3)}
                  </span>
                  {/* Time */}
                  <span className="flex-none text-[7px] tabular-nums text-muted-foreground/30">
                    {fmtTime(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 240, 255, 0.3); }
      `}</style>
    </div>
  );
}
