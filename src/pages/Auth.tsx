import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const signUpSchema = z.object({
  username: z.string().trim().min(3, "Min 3 chars").max(20, "Max 20 chars"),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 chars").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Required").max(72),
});

const Auth = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && user) nav("/", { replace: true });
  }, [user, loading, nav]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username: parsed.data.username },
          },
        });
        if (error) {
          if (error.message.includes("already")) toast.error("Account exists. Sign in instead.");
          else toast.error(error.message);
          return;
        }
        toast.success("Account forged. Entering ECHO…");
      } else {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.errors[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(error.message.includes("Invalid") ? "Wrong email or password" : error.message);
          return;
        }
        toast.success("Welcome back, Echo-walker.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      {/* Animated background — ECHO cyberpunk vibe */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,hsl(187_100%_50%/0.18),transparent_55%),radial-gradient(ellipse_at_80%_90%,hsl(282_100%_50%/0.18),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(hsl(187 100% 50% / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(187 100% 50% / 0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/15 blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <p className="font-mono text-[10px] tracking-[0.6em] text-muted-foreground">TEMPORAL · ECHO</p>
          <h1 className="mt-2 font-title font-black text-5xl tracking-[0.3em] text-primary text-glow-cyan animate-flicker">
            ECHO
          </h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground tracking-[0.3em]">
            {mode === "signin" ? "// AUTHENTICATE" : "// FORGE IDENTITY"}
          </p>
        </div>

        <form onSubmit={submit} className="panel scanline relative p-6 sm:p-8 space-y-4 animate-pop-in">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 font-mono text-xs tracking-[0.3em] transition border ${
                mode === "signin"
                  ? "border-primary text-primary text-glow-cyan box-glow-cyan"
                  : "border-border text-muted-foreground hover:text-foreground"
              } rounded-md`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 font-mono text-xs tracking-[0.3em] transition border ${
                mode === "signup"
                  ? "border-secondary text-secondary text-glow-purple box-glow-purple"
                  : "border-border text-muted-foreground hover:text-foreground"
              } rounded-md`}
            >
              SIGN UP
            </button>
          </div>

          {mode === "signup" && (
            <Field
              label="USERNAME"
              type="text"
              value={form.username}
              onChange={(v) => setForm({ ...form, username: v })}
              placeholder="echo_walker"
            />
          )}
          <Field
            label="EMAIL"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="you@echo.dev"
          />
          <Field
            label="PASSWORD"
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 py-3 font-title text-sm tracking-[0.4em] bg-primary text-primary-foreground rounded-md box-glow-cyan hover:brightness-110 transition disabled:opacity-50"
          >
            {busy ? "PROCESSING…" : mode === "signin" ? "ENTER" : "FORGE"}
          </button>

          <p className="text-center font-mono text-[10px] text-muted-foreground tracking-[0.2em] pt-2">
            {mode === "signin" ? "NEW TO ECHO?" : "ALREADY HAVE AN ACCOUNT?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary text-glow-cyan hover:underline"
            >
              {mode === "signin" ? "FORGE ONE →" : "SIGN IN →"}
            </button>
          </p>
        </form>

        <p className="text-center mt-6 font-mono text-[10px] text-muted-foreground tracking-[0.5em]">
          QUEUE · STACK · DECISION TREE
        </p>
      </div>
    </div>
  );
};

function Field({
  label, type, value, onChange, placeholder,
}: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="mt-1 w-full bg-background-2/60 border border-border focus:border-primary focus:box-glow-cyan outline-none rounded-md px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 transition"
      />
    </label>
  );
}

export default Auth;
