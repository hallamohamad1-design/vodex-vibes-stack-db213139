import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ParticleBackground } from "@/components/ParticleBackground";
import type { PlayerProfile, Message, GameInvite, WorldId } from "@/game/types";

export default function MultiplayerLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedWorld, setSelectedWorld] = useState<WorldId>("vodex");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch initial data
    const fetchData = async () => {
      // Fetch online players (last seen in last 5 mins)
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user.id)
        .gt("last_seen_at", fiveMinsAgo);
      if (profiles) setPlayers(profiles as any);

      // Fetch global messages
      const { data: msgData } = await supabase
        .from("messages")
        .select("*, profiles!messages_sender_id_fkey(username)")
        .is("recipient_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (msgData) {
        setMessages(msgData.map(m => ({ ...m, sender_username: (m.profiles as any)?.username })) as any);
      }

      // Fetch pending invites
      const { data: inviteData } = await supabase
        .from("game_invites")
        .select("*, profiles!game_invites_sender_id_fkey(username)")
        .eq("recipient_id", user.id)
        .eq("status", "pending");
      if (inviteData) {
        setInvites(inviteData.map(i => ({ ...i, sender_username: (i.profiles as any)?.username })) as any);
      }
    };

    fetchData();

    // 2. Realtime subscriptions
    const msgChannel = supabase
      .channel("global_chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "recipient_id=is.null" }, async (payload) => {
        const { data: sender } = await supabase.from("profiles").select("username").eq("user_id", payload.new.sender_id).single();
        setMessages(prev => [...prev, { ...payload.new, sender_username: sender?.username } as any]);
      })
      .subscribe();

    const inviteChannel = supabase
      .channel("invites")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_invites", filter: `recipient_id=eq.${user.id}` }, async (payload) => {
        const { data: sender } = await supabase.from("profiles").select("username").eq("user_id", payload.new.sender_id).single();
        setInvites(prev => [...prev, { ...payload.new, sender_username: sender?.username } as any]);
        toast.info(`Game invitation from ${sender?.username}!`);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_invites", filter: `sender_id=eq.${user.id}` }, async (payload) => {
        if (payload.new.status === "accepted") {
          toast.success("Invitation accepted! Starting game...");
          // For host, we need to know who accepted.
          const { data: recipient } = await supabase.from("profiles").select("username").eq("user_id", payload.new.recipient_id).single();
          navigate(`/play/${payload.new.world}?multiplayer=true&role=host&inviteId=${payload.new.id}&peerName=${recipient?.username || "Guest"}`);
        }
      })
      .subscribe();

    // 3. Heartbeat for presence
    const heartbeat = setInterval(() => {
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString(), status: "online" }).eq("user_id", user.id).then();
    }, 30000);

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(inviteChannel);
      clearInterval(heartbeat);
    };
  }, [user, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (error) toast.error("Failed to send message");
    else setNewMessage("");
  };

  const sendInvite = async (recipientId: string) => {
    if (!user) return;
    const { error } = await supabase.from("game_invites").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      world: selectedWorld,
    });

    if (error) toast.error("Failed to send invite");
    else toast.success("Invitation sent!");
  };

  const acceptInvite = async (invite: GameInvite) => {
    const { error } = await supabase.from("game_invites").update({ status: "accepted" }).eq("id", invite.id);
    if (error) toast.error("Failed to accept invite");
    else {
      navigate(`/play/${invite.world}?multiplayer=true&role=guest&inviteId=${invite.id}&peerName=${invite.sender_username}`);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#060810]">
      <ParticleBackground />
      
      {/* Header */}
      <div className="relative z-10 p-6 flex justify-between items-center border-b border-primary/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="text-primary hover:text-white transition">← BACK</button>
          <h1 className="font-title text-2xl tracking-[0.2em] text-primary text-glow-cyan">MULTIPLAYER LOBBY</h1>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedWorld} 
            onChange={(e) => setSelectedWorld(e.target.value as WorldId)}
            className="bg-black/50 border border-primary/30 text-primary font-mono text-xs p-2 rounded outline-none focus:border-primary"
          >
            <option value="vodex">VODEX REALM</option>
            <option value="battleground">BATTLEGROUND</option>
            <option value="virtual">VIRTUAL CORE</option>
            <option value="blockworld">BLOCKWORLD</option>
          </select>
        </div>
      </div>

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden">
        {/* Players List */}
        <div className="lg:col-span-1 flex flex-col gap-4 panel border-primary/20 bg-black/40 backdrop-blur-sm p-4 overflow-hidden">
          <h3 className="font-title text-sm tracking-widest text-primary border-b border-primary/10 pb-2">OPERATIVES ONLINE</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {players.length === 0 && <p className="text-muted-foreground text-xs italic">No other operatives detected...</p>}
            {players.map(p => (
              <div key={p.user_id} className="flex items-center justify-between p-2 rounded bg-primary/5 border border-white/5 group hover:border-primary/30 transition">
                <div className="flex flex-col">
                  <span className="text-sm font-mono text-foreground">{p.username}</span>
                  <span className="text-[10px] text-primary/60 uppercase tracking-tighter">{p.status}</span>
                </div>
                <button 
                  onClick={() => sendInvite(p.user_id)}
                  className="px-2 py-1 bg-primary/20 hover:bg-primary/40 text-primary text-[10px] font-bold rounded border border-primary/30 transition opacity-0 group-hover:opacity-100"
                >
                  CHALLENGE
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Global Chat */}
        <div className="lg:col-span-2 flex flex-col gap-4 panel border-secondary/20 bg-black/40 backdrop-blur-sm p-4 overflow-hidden">
          <h3 className="font-title text-sm tracking-widest text-secondary border-b border-secondary/10 pb-2">GLOBAL COMMS</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {messages.map(m => (
              <div key={m.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold text-secondary">{m.sender_username}</span>
                  <span className="text-[8px] text-muted-foreground">[{new Date(m.created_at).toLocaleTimeString()}]</span>
                </div>
                <p className="text-sm text-foreground/90 font-body bg-white/5 p-2 rounded-md border-l-2 border-secondary/40">{m.content}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t border-white/10">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-sm focus:border-secondary outline-none transition"
            />
            <button type="submit" className="bg-secondary/20 hover:bg-secondary/40 text-secondary px-4 py-2 rounded font-bold text-xs border border-secondary/30 transition">SEND</button>
          </form>
        </div>

        {/* Invites & Settings */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex-1 panel border-gold/20 bg-black/40 backdrop-blur-sm p-4 overflow-hidden flex flex-col">
            <h3 className="font-title text-sm tracking-widest text-gold border-b border-gold/10 pb-2 mb-4">INCOMING CHALLENGES</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {invites.length === 0 && <p className="text-muted-foreground text-xs italic">No pending challenges...</p>}
              {invites.map(i => (
                <div key={i.id} className="p-3 rounded bg-gold/5 border border-gold/20 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-gold">{i.sender_username}</span>
                    <span className="text-[10px] text-muted-foreground">{i.world.toUpperCase()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => acceptInvite(i)}
                      className="flex-1 py-1.5 bg-gold/20 hover:bg-gold/40 text-gold text-[10px] font-bold rounded border border-gold/40 transition"
                    >
                      ACCEPT
                    </button>
                    <button className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded border border-red-500/20 transition">
                      DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="panel border-white/10 bg-black/60 p-4">
            <h3 className="font-title text-[10px] tracking-widest text-muted-foreground mb-2">SYSTEM STATUS</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">LATENCY</span>
                <span className="text-green-500">24MS</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">ENCRYPTION</span>
                <span className="text-primary">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 240, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 240, 255, 0.4); }
      `}</style>
    </div>
  );
}
