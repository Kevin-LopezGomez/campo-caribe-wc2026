import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LogoutButton } from "@/components/logout-button";
import type { UserRole } from "@/lib/types/database";

type RodPick = {
  team: { name: string; flag_emoji: string; is_top_20: boolean } | null;
} | null;

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const [profileResult, rodPickResult, pickCountResult, pickableResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("ride_or_die_picks")
        .select("team:team_id(name, flag_emoji, is_top_20)")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("match_picks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .not("team_home_id", "is", null)
        .not("team_away_id", "is", null),
    ]);

  const profile = profileResult.data;
  const role: UserRole = profile?.role ?? "user";
  const rodPick = rodPickResult.data as RodPick;
  const picksMade = pickCountResult.count ?? 0;
  const picksOf = pickableResult.count ?? 0;

  // User rank from leaderboard (exclude test users)
  const { data: lb } = await admin.rpc("get_leaderboard");
  const realLb = (lb ?? []).filter((r) => !r.is_test);
  const myIdx = realLb.findIndex((r) => r.user_id === user.id);
  const myRank = myIdx >= 0 ? myIdx + 1 : null;
  const myPoints =
    myIdx >= 0 ? Number(realLb[myIdx].total_points) : 0;

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
        {/* Ride or Die */}
        <Link
          href="/ride-or-die"
          className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors block"
        >
          <h2 className="font-semibold text-lg mb-2">🎯 Ride or Die</h2>
          {rodPick?.team ? (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-0.5">Your pick</p>
              <p className="text-xl font-bold">
                {rodPick.team.flag_emoji} {rodPick.team.name}
              </p>
              {!rodPick.team.is_top_20 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  🌟 Cinderella — 2× points
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">
              Pick one team and earn points every round they advance.
            </p>
          )}
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
            {rodPick?.team ? "Change pick →" : "Pick a team →"}
          </span>
        </Link>

        {/* Match Predictor */}
        <Link
          href="/predictor"
          className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors block"
        >
          <h2 className="font-semibold text-lg mb-2">🔮 Match Predictor</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Pick the winner of every knockout match before kickoff.
          </p>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
            {picksOf > 0
              ? `${picksMade} of ${picksOf} picks →`
              : "View matches →"}
          </span>
        </Link>

        {/* Leaderboard */}
        <Link
          href="/leaderboard"
          className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors block"
        >
          <h2 className="font-semibold text-lg mb-2">🏆 Leaderboard</h2>
          {myRank !== null ? (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-0.5">Your rank</p>
              <p className="text-xl font-bold">
                #{myRank}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  of {realLb.length}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {myPoints} pts
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">
              See how you stack up against your colleagues.
            </p>
          )}
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
            View leaderboard →
          </span>
        </Link>

        {/* Bracket */}
        <Link
          href="/bracket"
          className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors block"
        >
          <h2 className="font-semibold text-lg mb-1">📋 Bracket</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Follow the full knockout bracket as the tournament unfolds.
          </p>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
            View bracket →
          </span>
        </Link>
      </div>

      {/* Admin card — role: admin or dev */}
      {(role === "admin" || role === "dev") && (
        <Link
          href="/admin"
          className="block border border-border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <h2 className="font-semibold text-lg mb-1">⚙️ Admin</h2>
          <p className="text-sm text-muted-foreground">
            Manage employees, enter match results, and recalculate scores.
          </p>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded mt-3 inline-block">
            Open admin →
          </span>
        </Link>
      )}

      {/* Dev card — role: dev only */}
      {role === "dev" && (
        <Link
          href="/dev"
          className="block border border-border rounded-lg p-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:opacity-90 transition-opacity"
        >
          <h2 className="font-semibold text-lg mb-1">🔧 Dev Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Scoring validator, test data seeding, math breakdowns.
          </p>
          <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded mt-3 inline-block">
            Open dev tools →
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
          <Link
            href="/bracket"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Bracket
          </Link>
          <Link
            href="/ride-or-die"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ride or Die
          </Link>
          <Link
            href="/predictor"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Predictor
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Leaderboard
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
      <Suspense
        fallback={
          <div className="flex-1 w-full max-w-5xl p-6">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        }
      >
        <Dashboard />
      </Suspense>
    </main>
  );
}
