"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  recalculateUserScore,
  recalculateMatchAffectedUsers,
  computeUserScore,
  type ScoringEvent,
} from "@/lib/scoring";

export async function seedTestData(): Promise<{ error?: string; count?: number }> {
  const admin = createAdminClient();

  // Ensure R32 matches have teams so we can create match_picks
  await ensureR32TeamsAssigned();

  const [teamsRes, matchesRes] = await Promise.all([
    admin.from("teams").select("id"),
    admin
      .from("matches")
      .select("id, team_home_id, team_away_id")
      .eq("round", "R32")
      .not("team_home_id", "is", null)
      .not("team_away_id", "is", null),
  ]);

  const teams = teamsRes.data ?? [];
  const r32 = matchesRes.data ?? [];
  let count = 0;

  for (let i = 1; i <= 20; i++) {
    const employeeId = `TEST${String(i).padStart(3, "0")}`;
    const fullName = `Test User ${String(i).padStart(2, "0")}`;
    const accessKey = String(Math.floor(Math.random() * 900000) + 100000);

    await admin.from("approved_employees").upsert(
      { employee_id: employeeId, full_name: fullName, access_key: accessKey, role: "user", is_registered: true, is_test: true },
      { onConflict: "employee_id" }
    );

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: `${employeeId}@campocaribe.internal`,
      password: "test123",
      email_confirm: true,
      user_metadata: { employee_id: employeeId, full_name: fullName, role: "user" },
    });

    if (authErr) {
      if (authErr.message.includes("already registered") || authErr.message.includes("already been registered")) continue;
      return { error: authErr.message };
    }

    const userId = authUser.user.id;
    await admin.from("profiles").update({ is_test: true }).eq("id", userId);

    // Random R/D pick
    const team = teams[Math.floor(Math.random() * teams.length)];
    await admin.from("ride_or_die_picks").upsert(
      { user_id: userId, team_id: team.id, locked: false },
      { onConflict: "user_id" }
    );

    // Random match picks for R32
    for (const m of r32) {
      if (!m.team_home_id || !m.team_away_id) continue;
      const pickHome = Math.random() < 0.5;
      const inclScore = Math.random() < 0.3;
      await admin.from("match_picks").upsert(
        {
          user_id: userId,
          match_id: m.id,
          winner_team_id: pickHome ? m.team_home_id : m.team_away_id,
          predicted_home_score: inclScore ? Math.floor(Math.random() * 4) : null,
          predicted_away_score: inclScore ? Math.floor(Math.random() * 4) : null,
        },
        { onConflict: "user_id,match_id" }
      );
    }
    count++;
  }

  revalidatePath("/dev");
  return { count };
}

// Randomly assign teams from the 48-team pool to R32 matches that are missing teams.
// Each team is used at most once. Safe to run multiple times (skips already-set matches).
async function ensureR32TeamsAssigned(): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: r32 } = await admin
    .from("matches")
    .select("id, team_home_id, team_away_id")
    .eq("round", "R32")
    .order("kickoff_time");

  const unset = (r32 ?? []).filter((m) => !m.team_home_id || !m.team_away_id);
  if (!unset.length) return {};

  const { data: teams } = await admin.from("teams").select("id");
  if (!teams?.length) return { error: "No teams found." };

  // Shuffle teams
  const pool = [...teams].sort(() => Math.random() - 0.5).map((t) => t.id);

  // Slots already used by set matches
  const usedIds = new Set(
    (r32 ?? [])
      .flatMap((m) => [m.team_home_id, m.team_away_id])
      .filter(Boolean) as string[]
  );
  const available = pool.filter((id) => !usedIds.has(id));

  let idx = 0;
  for (const m of unset) {
    if (idx + 1 >= available.length) break;
    const home = available[idx++];
    const away = available[idx++];
    await admin.from("matches").update({ team_home_id: home, team_away_id: away }).eq("id", m.id);
  }

  return {};
}

export async function seedTestResults(): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Assign teams to any unset R32 matches first
  const assignErr = await ensureR32TeamsAssigned();
  if (assignErr.error) return assignErr;

  const { data: matches } = await admin
    .from("matches")
    .select("id, team_home_id, team_away_id")
    .eq("round", "R32")
    .not("team_home_id", "is", null)
    .not("team_away_id", "is", null)
    .order("kickoff_time")
    .limit(8);

  if (!matches?.length) return { error: "No R32 matches found." };

  for (const m of matches) {
    if (!m.team_home_id || !m.team_away_id) continue;
    const homeWins = Math.random() < 0.5;
    const hs = Math.floor(Math.random() * 4);
    const as_ = Math.floor(Math.random() * 4);

    const { error: updErr } = await admin.from("matches").update({
      winner_team_id: homeWins ? m.team_home_id : m.team_away_id,
      home_score: hs,
      away_score: as_,
      status: "completed",
    }).eq("id", m.id);

    if (updErr) return { error: updErr.message };
    await recalculateMatchAffectedUsers(m.id);
  }

  revalidatePath("/dev");
  revalidatePath("/leaderboard");
  revalidatePath("/predictor");
  return {};
}

export async function teardownTestData(): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: testProfiles } = await admin
    .from("profiles")
    .select("id")
    .eq("is_test", true);

  const testIds = (testProfiles ?? []).map((p) => p.id);

  if (testIds.length) {
    await admin.from("score_events").delete().in("user_id", testIds);
    await admin.from("match_picks").delete().in("user_id", testIds);
    await admin.from("ride_or_die_picks").delete().in("user_id", testIds);
    for (const id of testIds) {
      await admin.auth.admin.deleteUser(id);
    }
  }

  await admin.from("approved_employees").delete().eq("is_test", true);
  await admin.from("matches").update({
    team_home_id: null,
    team_away_id: null,
    winner_team_id: null,
    home_score: null,
    away_score: null,
    status: "scheduled",
  }).eq("round", "R32");

  revalidatePath("/dev");
  revalidatePath("/leaderboard");
  revalidatePath("/predictor");
  return {};
}

export async function fixPartialScorePicks(): Promise<{ error?: string; fixed?: number }> {
  const admin = createAdminClient();

  // home set, away null → set away to 0
  const { data: awayNull, error: e1 } = await admin
    .from("match_picks")
    .update({ predicted_away_score: 0 })
    .not("predicted_home_score", "is", null)
    .is("predicted_away_score", null)
    .select("match_id");
  if (e1) return { error: e1.message };

  // away set, home null → set home to 0
  const { data: homeNull, error: e2 } = await admin
    .from("match_picks")
    .update({ predicted_home_score: 0 })
    .not("predicted_away_score", "is", null)
    .is("predicted_home_score", null)
    .select("match_id");
  if (e2) return { error: e2.message };

  const fixed = (awayNull?.length ?? 0) + (homeNull?.length ?? 0);
  return { fixed };
}

export async function recalculateAllScores(): Promise<{ error?: string; count?: number }> {
  // Always fix partial score picks first so exact-score bonuses are not missed
  const fixResult = await fixPartialScorePicks();
  if (fixResult.error) return { error: fixResult.error };

  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id");
  let count = 0;
  for (const p of profiles ?? []) {
    const r = await recalculateUserScore(p.id);
    if (r.error) return { error: r.error };
    count++;
  }
  revalidatePath("/dev");
  revalidatePath("/leaderboard");
  revalidatePath("/");
  return { count };
}

export async function recalculateOneUser(
  userId: string
): Promise<{ error?: string }> {
  const r = await recalculateUserScore(userId);
  revalidatePath("/dev");
  revalidatePath("/leaderboard");
  return r;
}

export type UserBreakdown = {
  userId: string;
  fullName: string;
  storedTotal: number;
  expectedTotal: number;
  discrepancy: boolean;
  storedEvents: Array<{ points: number; reason: string; created_at: string }>;
  expectedEvents: ScoringEvent[];
};

export async function getUserBreakdown(
  userId: string
): Promise<{ data?: UserBreakdown; error?: string }> {
  const admin = createAdminClient();

  const [profileRes, storedRes, expectedRes] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", userId).single(),
    admin.from("score_events").select("points, reason, created_at").eq("user_id", userId).order("created_at"),
    computeUserScore(userId),
  ]);

  if (expectedRes.error) return { error: expectedRes.error };

  const stored = storedRes.data ?? [];
  const storedTotal = stored.reduce((s, e) => s + e.points, 0);

  return {
    data: {
      userId,
      fullName: profileRes.data?.full_name ?? "Unknown",
      storedTotal,
      expectedTotal: expectedRes.total,
      discrepancy: storedTotal !== expectedRes.total,
      storedEvents: stored,
      expectedEvents: expectedRes.events,
    },
  };
}

export type MatchDetail = {
  matchId: string;
  round: string;
  homeTeam: { id: string; name: string; flag_emoji: string } | null;
  awayTeam: { id: string; name: string; flag_emoji: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  status: string;
  picks: Array<{
    userId: string;
    fullName: string;
    pickedTeamId: string;
    correct: boolean | null;
    predictedHome: number | null;
    predictedAway: number | null;
  }>;
};

export async function getMatchDetail(
  matchId: string
): Promise<{ data?: MatchDetail; error?: string }> {
  const admin = createAdminClient();

  const [matchRes, picksRes] = await Promise.all([
    admin
      .from("matches")
      .select("id, round, status, home_score, away_score, winner_team_id, team_home:team_home_id(id,name,flag_emoji), team_away:team_away_id(id,name,flag_emoji)")
      .eq("id", matchId)
      .single(),
    admin
      .from("match_picks")
      .select("user_id, winner_team_id, predicted_home_score, predicted_away_score, profile:user_id(full_name)")
      .eq("match_id", matchId),
  ]);

  if (matchRes.error) return { error: matchRes.error.message };
  const m = matchRes.data;

  return {
    data: {
      matchId,
      round: m.round,
      status: m.status,
      homeScore: m.home_score,
      awayScore: m.away_score,
      winnerId: m.winner_team_id,
      homeTeam: m.team_home as unknown as { id: string; name: string; flag_emoji: string } | null,
      awayTeam: m.team_away as unknown as { id: string; name: string; flag_emoji: string } | null,
      picks: (picksRes.data ?? []).map((p) => ({
        userId: p.user_id,
        fullName: (p.profile as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
        pickedTeamId: p.winner_team_id,
        correct: m.winner_team_id ? p.winner_team_id === m.winner_team_id : null,
        predictedHome: p.predicted_home_score,
        predictedAway: p.predicted_away_score,
      })),
    },
  };
}

export type DevStats = {
  usersByRole: Record<string, number>;
  testCount: number;
  realCount: number;
  totalPicks: number;
  rodPicks: number;
  completedMatches: number;
};

export async function getDevStats(): Promise<{ data?: DevStats; error?: string }> {
  const admin = createAdminClient();

  const [profilesRes, matchPicksRes, rodPicksRes, matchesRes] = await Promise.all([
    admin.from("profiles").select("role, is_test"),
    admin.from("match_picks").select("id", { count: "exact", head: true }),
    admin.from("ride_or_die_picks").select("id", { count: "exact", head: true }),
    admin.from("matches").select("id", { count: "exact", head: true }).eq("status", "completed"),
  ]);

  const profiles = profilesRes.data ?? [];
  const byRole: Record<string, number> = {};
  let testCount = 0;
  for (const p of profiles) {
    byRole[p.role] = (byRole[p.role] ?? 0) + 1;
    if (p.is_test) testCount++;
  }

  return {
    data: {
      usersByRole: byRole,
      testCount,
      realCount: profiles.length - testCount,
      totalPicks: matchPicksRes.count ?? 0,
      rodPicks: rodPicksRes.count ?? 0,
      completedMatches: matchesRes.count ?? 0,
    },
  };
}

export async function bulkRegisterHawaiiFarming(): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const admin = createAdminClient();

  type HFEmployee = {
    employee_id: string;
    full_name: string;
    access_key: string;
    role: string | null;
    job_title: string | null;
    home_department: string | null;
    division: string | null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: employeesRaw, error: fetchError } = await (admin.from("approved_employees") as any)
    .select("employee_id, full_name, access_key, role, job_title, home_department, division")
    .eq("company", "Hawaii Farming")
    .eq("is_registered", false);

  if (fetchError) return { created: 0, skipped: 0, errors: [fetchError.message] };

  const employees = (employeesRaw ?? []) as unknown as HFEmployee[];
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const employee of employees) {
    const { error: createError } = await admin.auth.admin.createUser({
      email: `${employee.employee_id}@campocaribe.internal`,
      password: employee.access_key,
      email_confirm: true,
      user_metadata: {
        employee_id: employee.employee_id,
        full_name: employee.full_name,
        role: employee.role ?? "user",
        job_title: employee.job_title ?? "",
        home_department: employee.home_department ?? "",
        division: employee.division ?? "",
        company: "Hawaii Farming",
      },
    });

    if (createError) {
      if (
        createError.message.includes("already registered") ||
        createError.message.includes("already been registered")
      ) {
        skipped++;
        continue;
      }
      errors.push(`${employee.employee_id}: ${createError.message}`);
      continue;
    }

    await admin
      .from("approved_employees")
      .update({ is_registered: true, registered_at: new Date().toISOString() })
      .eq("employee_id", employee.employee_id);

    created++;
  }

  return { created, skipped, errors };
}
