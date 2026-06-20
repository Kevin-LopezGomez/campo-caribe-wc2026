import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_admin")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex-1 w-full max-w-5xl p-6 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          World Cup 2026 — Campo Caribe Edition
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors cursor-not-allowed opacity-60">
          <h2 className="font-semibold text-lg mb-1">🎯 Ride or Die</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Pick one team and ride with them through the tournament.
          </p>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
            Coming soon
          </span>
        </div>

        <div className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors cursor-not-allowed opacity-60">
          <h2 className="font-semibold text-lg mb-1">🔮 Match Predictor</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Pick the winner of every knockout match before kickoff.
          </p>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
            Coming soon
          </span>
        </div>

        <div className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors cursor-not-allowed opacity-60">
          <h2 className="font-semibold text-lg mb-1">🏆 Leaderboard</h2>
          <p className="text-sm text-muted-foreground mb-3">
            See how you stack up against your colleagues.
          </p>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
            Coming soon
          </span>
        </div>

        <Link href="/bracket" className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors block">
          <h2 className="font-semibold text-lg mb-1">📋 Bracket</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Follow the full knockout bracket as the tournament unfolds.
          </p>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
            View bracket →
          </span>
        </Link>
      </div>

      {profile?.is_admin && (
        <Link href="/admin" className="block border border-border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition-colors">
          <h2 className="font-semibold text-lg mb-1">⚙️ Admin</h2>
          <p className="text-sm text-muted-foreground">
            Manage employees, enter match results, and recalculate scores.
          </p>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded mt-3 inline-block">
            Open admin →
          </span>
        </Link>
      )}
    </div>
  );
}

function NavBar() {
  return (
    <nav className="w-full border-b border-border">
      <div className="max-w-5xl mx-auto flex justify-between items-center p-4 px-5">
        <span className="font-bold text-lg">⚽ Campo Caribe WC2026</span>
        <div className="flex items-center gap-4">
          <Link href="/bracket" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Bracket
          </Link>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-background">
      <NavBar />
      <Suspense fallback={
        <div className="flex-1 w-full max-w-5xl p-6">
          <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
      }>
        <Dashboard />
      </Suspense>
    </main>
  );
}
