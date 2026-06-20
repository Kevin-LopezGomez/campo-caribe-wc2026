import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminMatchesClient } from "./matches-client";
import type { Team } from "@/lib/types/database";

export type AdminMatch = {
  id: string;
  round: string;
  kickoff_time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  next_match_id: string | null;
  winner_team_id: string | null;
  team_home: Team | null;
  team_away: Team | null;
  winner_team: Pick<Team, "id" | "name" | "flag_emoji"> | null;
};

async function MatchesData() {
  const admin = createAdminClient();
  const [matchesResult, teamsResult] = await Promise.all([
    admin
      .from("matches")
      .select(
        "*, team_home:team_home_id(*), team_away:team_away_id(*), winner_team:winner_team_id(id, name, flag_emoji)"
      )
      .order("kickoff_time", { ascending: true }),
    admin.from("teams").select("*").order("name"),
  ]);

  if (matchesResult.error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load matches: {matchesResult.error.message}
      </div>
    );
  }

  return (
    <AdminMatchesClient
      matches={(matchesResult.data ?? []) as unknown as AdminMatch[]}
      teams={(teamsResult.data ?? []) as Team[]}
    />
  );
}

function MatchesSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AdminMatchesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Matches</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign teams to bracket slots · Enter scores · Update status
        </p>
      </div>
      <Suspense fallback={<MatchesSkeleton />}>
        <MatchesData />
      </Suspense>
    </div>
  );
}
