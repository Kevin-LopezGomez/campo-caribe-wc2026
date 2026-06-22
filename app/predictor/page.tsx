import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppNav } from "@/components/app-nav";
import {
  PredictorClient,
  type PredictorMatchData,
} from "@/components/predictor-client";
import type { Round, MatchStatus } from "@/lib/types/database";

async function PredictorData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const [matchesResult, picksResult, allPicksResult] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, round, kickoff_time, status, home_score, away_score, winner_team_id, team_home:team_home_id(id,name,flag_emoji), team_away:team_away_id(id,name,flag_emoji)"
      )
      .order("kickoff_time"),
    supabase
      .from("match_picks")
      .select("match_id, winner_team_id, predicted_home_score, predicted_away_score")
      .eq("user_id", user.id),
    // All picks (for counts) — use admin to bypass RLS
    admin
      .from("match_picks")
      .select("match_id, winner_team_id"),
  ]);

  const matches = matchesResult.data ?? [];
  const myPickMap = new Map(
    (picksResult.data ?? []).map((p) => [p.match_id, p])
  );

  // Build pick counts per match per team
  type CountMap = Record<string, Record<string, number>>;
  const countMap: CountMap = {};
  for (const p of allPicksResult.data ?? []) {
    if (!countMap[p.match_id]) countMap[p.match_id] = {};
    countMap[p.match_id][p.winner_team_id] =
      (countMap[p.match_id][p.winner_team_id] ?? 0) + 1;
  }

  const predictorMatches: PredictorMatchData[] = matches.map((m) => {
    const isPastKickoff = new Date(m.kickoff_time) <= new Date();
    const home = m.team_home as unknown as { id: string; name: string; flag_emoji: string } | null;
    const away = m.team_away as unknown as { id: string; name: string; flag_emoji: string } | null;

    let pickCounts: { home: number; away: number } | null = null;
    if (isPastKickoff && home && away) {
      const mc = countMap[m.id] ?? {};
      pickCounts = { home: mc[home.id] ?? 0, away: mc[away.id] ?? 0 };
    }

    return {
      id: m.id,
      round: m.round as Round,
      kickoff_time: m.kickoff_time,
      status: m.status as MatchStatus,
      home_score: m.home_score,
      away_score: m.away_score,
      winner_team_id: m.winner_team_id,
      team_home: home,
      team_away: away,
      myPick: myPickMap.get(m.id) ?? null,
      pickCounts,
    };
  });

  const totalPickable = predictorMatches.filter(
    (m) => m.team_home && m.team_away
  ).length;

  const madeCount = predictorMatches.filter(
    (m) => m.team_home && m.team_away && myPickMap.has(m.id)
  ).length;

  return (
    <div className="space-y-6">
      {totalPickable === 0 && (
        <p className="text-sm text-muted-foreground">
          Match teams will be confirmed after the group stage ends. You can still browse the schedule below.
        </p>
      )}
      {totalPickable > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-2 inline-block">
          {madeCount} of {totalPickable} picks made
        </div>
      )}
      <PredictorClient matches={predictorMatches} />
    </div>
  );
}

function PredictorSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-36 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PredictorPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🔮 Match Predictor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick the winner of every knockout match before kickoff. Exact score
            predictions earn a bonus +2 pts.
          </p>
        </div>
        <Suspense fallback={<PredictorSkeleton />}>
          <PredictorData />
        </Suspense>
      </div>
    </main>
  );
}
