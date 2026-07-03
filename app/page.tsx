import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppNav } from "@/components/app-nav";
import { getFarmVsFarmData } from "@/lib/farm-vs-farm";
import type { UserRole } from "@/lib/types/database";

type RodPick = {
  team: { name: string; flag_emoji: string; is_top_20: boolean } | null;
} | null;

async function FarmVsFarmCard() {
  const { cc, hf } = await getFarmVsFarmData();
  const ccPct = Math.round(cc.teamAccuracy * 100);
  const hfPct = Math.round(hf.teamAccuracy * 100);
  const accDiff = Math.abs(ccPct - hfPct);
  const accLeader = ccPct > hfPct ? "Campo Caribe" : hfPct > ccPct ? "Hawaii Farming" : null;
  const ccPts = cc.topPointsTotal;
  const hfPts = hf.topPointsTotal;
  const ptsDiff = Math.abs(ccPts - hfPts);
  const ptsLeader = ccPts > hfPts ? "Campo Caribe" : hfPts > ccPts ? "Hawaii Farming" : null;

  return (
    <Link
      href="/farm-vs-farm"
      className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors block"
    >
      <h2 className="font-semibold text-lg mb-3">🌾 Farm vs Farm</h2>
      <div className="mb-3 flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold tabular-nums text-orange-500">{ccPct}%</span>
          <span className="text-xs tabular-nums text-orange-500/70">{ccPts} pts</span>
        </div>
        <span className="text-xs text-muted-foreground">vs</span>
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold tabular-nums text-green-600">{hfPct}%</span>
          <span className="text-xs tabular-nums text-green-600/70">{hfPts} pts</span>
        </div>
      </div>
      <div className="mb-3 space-y-0.5 text-xs text-muted-foreground">
        {accLeader ? <p>{accLeader} leading by {accDiff}% accuracy</p> : <p>Tied on accuracy</p>}
        {ptsLeader ? <p>{ptsLeader} leading by {ptsDiff} pts</p> : <p>Tied on points</p>}
      </div>
      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
        View standings →
      </span>
    </Link>
  );
}

function FarmVsFarmCardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-6">
      <div className="h-5 w-32 bg-muted rounded animate-pulse mb-3" />
      <div className="h-7 w-28 bg-muted rounded animate-pulse mb-2" />
      <div className="h-3 w-36 bg-muted rounded animate-pulse mb-4" />
      <div className="h-5 w-24 bg-muted rounded animate-pulse" />
    </div>
  );
}

async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/landing");

  const admin = createAdminClient();

  const [profileResult, rodPickResult, pickCountResult, pickableResult, latestChatRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, role, last_chat_visit_at")
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
      admin
        .from("chat_messages")
        .select("message, created_at, profile:user_id(full_name, company)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const profile = profileResult.data;
  const role: UserRole = profile?.role ?? "user";

  type LatestChat = { message: string; created_at: string; profile: { full_name: string; company: string | null } | null } | null;
  const latestChat = latestChatRes.data as unknown as LatestChat;
  const lastVisit = profile?.last_chat_visit_at ?? null;
  const hasUnread = latestChat
    ? !lastVisit || new Date(latestChat.created_at) > new Date(lastVisit)
    : false;
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
      {/* vs banner — full-width centering independent of grid */}
      <div className="w-full flex justify-center">
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <Image src="/logo.png" alt="Campo Caribe" width={32} height={32} className="object-contain" />
            <span className="text-xs font-medium text-muted-foreground">Campo Caribe</span>
          </div>
          <span className="text-lg font-bold text-muted-foreground">vs</span>
          <div className="flex flex-col items-center gap-1">
            <Image src="/hawaii-farming-logo.avif" alt="Hawaii Farming" width={32} height={32} className="object-contain" />
            <span className="text-xs font-medium text-muted-foreground">Hawaii Farming</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Farm vs Farm */}
        <Suspense fallback={<FarmVsFarmCardSkeleton />}>
          <FarmVsFarmCard />
        </Suspense>

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

        {/* Chat */}
        <Link
          href="/chat"
          className="border border-border rounded-lg p-6 hover:bg-muted/30 transition-colors block relative"
        >
          {hasUnread && (
            <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary" />
          )}
          <h2 className="font-semibold text-lg mb-2">💬 Chat</h2>
          {latestChat ? (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-0.5">Latest message</p>
              <p className="text-sm text-foreground line-clamp-2">
                <span className="font-medium">
                  {latestChat.profile?.full_name?.includes(",")
                    ? latestChat.profile.full_name.split(",")[1]?.trim().split(" ")[0]
                    : latestChat.profile?.full_name?.split(" ")[0] ?? "Someone"}
                  :{" "}
                </span>
                {latestChat.message.slice(0, 60)}{latestChat.message.length > 60 ? "…" : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">
              Talk trash, share predictions, celebrate goals.
            </p>
          )}
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
            Open chat →
          </span>
        </Link>

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

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-background">
      <AppNav />
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
