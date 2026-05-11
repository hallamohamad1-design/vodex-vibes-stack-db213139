import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHARACTER_CLASSES } from "@/lib/worlds";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterClass, setCharacterClass] = useState("warrior");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.navigate({ to: "/lobby" });
  }, [user, router]);

  const signUp = async () => {
    if (!email || !password || !username) return toast.error("Fill in all fields");
    setLoading(true);
    const avatar = CHARACTER_CLASSES.find((c) => c.id === characterClass)?.emoji ?? "⚔️";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/lobby`,
        data: { username, character_name: characterName || username, character_class: characterClass, avatar },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome, hero!");
    router.navigate({ to: "/lobby" });
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    router.navigate({ to: "/lobby" });
  };

  const signInGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/lobby` });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    router.navigate({ to: "/lobby" });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-xl border border-border/60 bg-card/70 p-6 shadow-arcane backdrop-blur">
          <h1 className="font-display text-2xl text-primary text-glow text-center">Enter the Arena</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">Sign in or forge a new hero</p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-3 pt-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button className="w-full" onClick={signIn} disabled={loading}>Sign In</Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 pt-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ravenstrike" /></div>
              <div><Label>Character Name</Label><Input value={characterName} onChange={(e) => setCharacterName(e.target.value)} placeholder="Sir Vandren" /></div>
              <div>
                <Label>Class</Label>
                <Select value={characterClass} onValueChange={setCharacterClass}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHARACTER_CLASSES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-gold text-primary-foreground" onClick={signUp} disabled={loading}>Forge Hero</Button>
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={signInGoogle}>Continue with Google</Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Back home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
