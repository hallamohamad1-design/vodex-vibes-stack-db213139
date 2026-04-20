import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const signUpSchema = z.object({
  username: z.string().trim().min(3, "Callsign min 3 chars").max(20, "Max 20 chars"),
  email: z.string().trim().email("Invalid secure channel").max(255),
  password: z.string().min(6, "Encryption key min 6 chars").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Encryption keys do not match", path: ["confirm"] });

const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Required").max(255),
  password: z.string().min(1, "Required").max(72),
});

const Auth = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState({ identifier: "", password: "" });
  const [reg, setReg] = useState({ username: "", email: "", password: "", confirm: "" });

  // Instant redirect the moment auth resolves to a user — no flash, no delay
  useEffect(() => {
    if (user) nav("/", { replace: true });
  }, [user, nav]);

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(login);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    try {
      // identifier may be email or username — if no '@', look up email by username
      let email = parsed.data.identifier;
      if (!email.includes("@")) {
        const { data } = await supabase.from("profiles").select("user_id").eq("username", email).maybeSingle();
        if (!data) { toast.error("Operative not found"); return; }
        // can't get email from auth.users via RLS — require email login for now
        toast.error("Use your email to log in");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: parsed.data.password,
      });
      if (error) {
        toast.error(error.message.includes("Invalid") ? "Invalid credentials" : error.message);
        return;
      }
      toast.success("Authenticated. Welcome, Operative.");
      // navigation happens via the useEffect listener above — no manual setTimeout
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(reg);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { username: parsed.data.username },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already")) toast.error("Operative already exists. Login instead.");
        else toast.error(error.message);
        return;
      }
      toast.success(`Echo Identity forged. Welcome, ${parsed.data.username}.`);
    } finally {
      setBusy(false);
    }
  };

  // Subtle loading state — but we never block on `loading` initial fetch since user-null is the default
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-8 bg-[#060810]">
      {/* Hex grid background */}
      <div
        className="fixed inset-0 pointer-events-none animate-[gridShift_30s_linear_infinite]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,240,255,0.025) 2px, rgba(0,240,255,0.025) 3px)",
        }}
      />
      {/* Aura */}
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/15 blur-3xl animate-pulse-glow pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

      {/* Corner decos */}
      <CornerDeco pos="top-2 left-2" cls="border-t-2 border-l-2" />
      <CornerDeco pos="top-2 right-2" cls="border-t-2 border-r-2" />
      <CornerDeco pos="bottom-2 left-2" cls="border-b-2 border-l-2" />
      <CornerDeco pos="bottom-2 right-2" cls="border-b-2 border-r-2" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-7">
          <h1
            className="font-title font-black text-6xl tracking-[0.4em] text-primary text-glow-cyan animate-flicker"
            style={{ animation: "float 4s ease-in-out infinite, flicker 6s infinite" }}
          >
            ECHO
          </h1>
          <p className="font-mono text-[11px] tracking-[0.4em] text-muted-foreground uppercase mt-2">
            Face Your Reflection
          </p>
        </div>

        {/* Card */}
        <div className="relative rounded-xl border border-primary/20 bg-[rgba(8,12,25,0.92)] backdrop-blur-2xl p-6 sm:p-8 overflow-hidden shadow-[0_0_60px_rgba(0,240,255,0.08)] animate-pop-in">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          {/* Animated scan line */}
          <div
            className="absolute left-0 right-0 h-[2px] opacity-30 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(0,240,255,0.6), transparent)",
              animation: "scanLine 4s linear infinite",
            }}
          />

          {/* Tab switcher */}
          <div className="flex border border-border rounded-md overflow-hidden mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 font-title text-[11px] tracking-[2px] uppercase transition ${
                mode === "login"
                  ? "bg-primary/10 text-primary text-glow-cyan"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2.5 font-title text-[11px] tracking-[2px] uppercase transition ${
                mode === "register"
                  ? "bg-secondary/10 text-secondary text-glow-purple"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field
                label="Email"
                icon="@"
                value={login.identifier}
                onChange={(v) => setLogin({ ...login, identifier: v })}
                placeholder="Enter operative email…"
                type="email"
                autoComplete="email"
              />
              <Field
                label="Password"
                icon="🔒"
                value={login.password}
                onChange={(v) => setLogin({ ...login, password: v })}
                placeholder="Enter encryption key…"
                type="password"
                autoComplete="current-password"
              />
              <CtaButton busy={busy} variant="cyan">⚡ Enter the Echo Realm</CtaButton>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field
                label="Choose Callsign"
                icon="⬡"
                value={reg.username}
                onChange={(v) => setReg({ ...reg, username: v })}
                placeholder="Create operative ID…"
              />
              <Field
                label="Email"
                icon="@"
                value={reg.email}
                onChange={(v) => setReg({ ...reg, email: v })}
                placeholder="Secure channel address…"
                type="email"
                autoComplete="email"
              />
              <Field
                label="Password"
                icon="🔒"
                value={reg.password}
                onChange={(v) => setReg({ ...reg, password: v })}
                placeholder="Set encryption key…"
                type="password"
                autoComplete="new-password"
              />
              <Field
                label="Confirm Password"
                icon="🔒"
                value={reg.confirm}
                onChange={(v) => setReg({ ...reg, confirm: v })}
                placeholder="Confirm encryption key…"
                type="password"
                autoComplete="new-password"
              />
              <CtaButton busy={busy} variant="purple">✨ Create Echo Identity</CtaButton>
            </form>
          )}
        </div>

        <p className="text-center mt-6 font-mono text-[10px] text-muted-foreground tracking-[0.5em]">
          QUEUE · STACK · DECISION TREE
        </p>
      </div>

      {/* Inline keyframes for scan + grid + flicker (effects ECHO uses) */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 0; }
          100% { top: 100%; }
        }
        @keyframes gridShift {
          0%   { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
      `}</style>
    </div>
  );
};

function CornerDeco({ pos, cls }: { pos: string; cls: string }) {
  return (
    <div
      className={`fixed ${pos} w-20 h-20 border-primary opacity-40 pointer-events-none z-[3] ${cls}`}
    />
  );
}

function Field({
  label, icon, value, onChange, placeholder, type = "text", autoComplete,
}: {
  label: string; icon: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoComplete?: string;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] tracking-[2px] text-primary uppercase mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full pl-10 pr-4 py-2.5 bg-primary/[0.04] border border-border rounded-md font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary focus:bg-primary/[0.06] focus:shadow-[0_0_0_2px_rgba(0,240,255,0.12),0_0_12px_rgba(0,240,255,0.4)]"
        />
      </div>
    </div>
  );
}

function CtaButton({ busy, variant, children }: { busy: boolean; variant: "cyan" | "purple"; children: React.ReactNode }) {
  const isCyan = variant === "cyan";
  return (
    <button
      type="submit"
      disabled={busy}
      className={`relative w-full mt-2 py-3.5 font-title text-[13px] tracking-[3px] font-bold uppercase rounded-md transition overflow-hidden disabled:opacity-50 hover:-translate-y-0.5 active:scale-[0.98] ${
        isCyan
          ? "text-background shadow-[0_0_20px_rgba(0,240,255,0.45)] hover:shadow-[0_0_40px_rgba(0,240,255,0.7),0_0_80px_rgba(0,240,255,0.3)]"
          : "text-foreground shadow-[0_0_20px_rgba(191,0,255,0.5)] hover:shadow-[0_0_40px_rgba(191,0,255,0.7)]"
      }`}
      style={{
        background: isCyan
          ? "linear-gradient(135deg, #00b8cc, #00f0ff)"
          : "linear-gradient(135deg, #7b00cc, #bf00ff)",
      }}
    >
      <span
        className="absolute top-0 -left-full w-3/5 h-full -skew-x-12 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
          animation: "shimmer 2.5s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 150%; }
        }
      `}</style>
      {busy ? "PROCESSING…" : children}
    </button>
  );
}

export default Auth;
