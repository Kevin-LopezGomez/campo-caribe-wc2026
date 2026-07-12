import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { DevDashboardClient } from "./dev-client";
import { getDevStats } from "./actions";
import type { Round } from "@/lib/types/database";

const ROUND_ORDER: Record<Round, number> = { R32: 1, R16: 2, QF: 3, SF: 4, "3RD": 5, F: 6 };

async function DevData() {
  const admin = createAdminClient();

  const [profilesRes, matchesRes, statsRes] = await Promise.all([
    admin.from("profiles").select("id, full_name, employee_id, is_test").order("full_name"),
    admin.from("matches").select("id, round, kickoff_time, status, team_home:team_home_id(name), team_away:team_away_id(name)").order("kickoff_time"),
    getDevStats(),
  ]);

  const profiles = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    employee_id: p.employee_id,
    is_test: p.is_test,
  }));

  const matches = (matchesRes.data ?? []).map((m) => {
    const home = m.team_home as unknown as { name: string } | null;
    const away = m.team_away as unknown as { name: string } | null;
    const d = new Date(m.kickoff_time);
    const dateStr = d.toLocaleDateString("en-US", {
      timeZone: "America/Puerto_Rico",
      month: "short",
      day: "numeric",
    });
    const homeLabel = home?.name ?? "TBD";
    const awayLabel = away?.name ?? "TBD";
    return {
      id: m.id,
      round: m.round as Round,
      kickoff_time: m.kickoff_time,
      label: `${m.round} · ${dateStr} · ${homeLabel} vs ${awayLabel} [${m.status}]`,
    };
  }).sort((a, b) => ROUND_ORDER[a.round] - ROUND_ORDER[b.round]);

  return (
    <DevDashboardClient
      profiles={profiles}
      matches={matches}
      stats={statsRes.data ?? {
        usersByRole: {},
        testCount: 0,
        realCount: 0,
        totalPicks: 0,
        rodPicks: 0,
        completedMatches: 0,
      }}
    />
  );
}

export default function DevPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🔧 Dev Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scoring validator, test data tools, and bulk actions.
        </p>
      </div>
      <Suspense fallback={<div className="h-32 bg-muted rounded-lg animate-pulse" />}>
        <DevData />
      </Suspense>
    </div>
  );
}
