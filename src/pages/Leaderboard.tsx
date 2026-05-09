import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { WorldId } from "@/game/types";

interface Row {
  username: string;
  world: string;
  score: number;
  kills: number;
  max_combo: number;
  signature_moves: number;
}

const WORLDS: { id: WorldId | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "vodex", label: "VODEX" },
  { id: "battleground", label: "BATTLEGROUND" },
  { id: "virtual", label: "VIRTUAL" },
  { id: "blockworld", label: "BLOCKWORLD" },
];

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<WorldId | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("leaderboard_public")
        .select("username, world, score, kills, max_combo, signature_moves")
        .order("score", { ascending: false })
        .limit(50);
      if (tab !== "all") q = q.eq("world", tab);
      const { data } = await q;
      if (active) {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [tab]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-8">
        <Link to="/" className="panel px-3 py-1.5 font-mono text-xs hover:box-glow-cyan transition">
          ⌂ HUB
        </Link>
        <h1 className="font-title text-2xl sm:text-4xl tracking-[0.3em] text-gold text-glow-gold">
          ★ LEADERBOARD
        </h1>
        <div className="w-16" />
      </header>

      <div className="relative z-10 mx-auto mt-8 max-w-5xl px-6 sm:px-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              onClick={() => setTab(w.id)}
              className={`panel px-3 py-1.5 font-mono text-[11px] tracking-[0.3em] transition ${
                tab === w.id ? "box-glow-cyan text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="panel scanline p-4">
          {loading && <p className="font-mono text-xs text-muted-foreground">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="font-mono text-xs text-muted-foreground">
              No scores yet. Enter a world and start fighting the mage.
            </p>
          )}
          {!loading && rows.length > 0 && (
            <table className="w-full font-mono text-xs sm:text-sm">
              <thead>
                <tr className="text-muted-foreground tracking-[0.3em] text-[10px]">
                  <th className="text-left py-2">#</th>
                  <th className="text-left">PLAYER</th>
                  <th className="text-left">WORLD</th>
                  <th className="text-right">SCORE</th>
                  <th className="text-right">KILLS</th>
                  <th className="text-right">COMBO</th>
                  <th className="text-right">SIG</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.username}-${r.world}-${i}`}
                    className="border-t border-border/40 hover:bg-primary/5"
                  >
                    <td className="py-2 text-gold">{i + 1}</td>
                    <td className="text-primary">{r.username}</td>
                    <td className="text-muted-foreground">{r.world}</td>
                    <td className="text-right text-glow-cyan text-primary">{r.score}</td>
                    <td className="text-right">{r.kills}</td>
                    <td className="text-right">{r.max_combo}</td>
                    <td className="text-right text-secondary">{r.signature_moves}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
