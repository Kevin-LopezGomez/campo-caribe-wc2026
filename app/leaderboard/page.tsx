import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppNav } from "@/components/app-nav";
import {
  LeaderboardClient,
  type LeaderboardRow,
  type DeptGroup,
} from "@/components/leaderboard-client";
import type { Round, UserRole } from "@/lib/types/database";

// Points awarded per correct pick per round (for tiebreaking rank).
// Earlier rounds matter less, later rounds matter more.
const TB_ROUNDS: Round[] = ["F", "SF", "QF"];

async function LeaderboardData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // Fetch profile of current user to know their role
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role, company")
    .eq("id", user.id)
    .single();
  const canSeeTestUsers = ["admin", "dev"].includes(myProfile?.role ?? "");
  const isCampoCaribe = myProfile?.company === "Campo Caribe";

  const [lbRes, rodRes, scoresRes, tiebreakerMatchRes, lockRes, companyRes, teamsRes] = await Promise.all([
    // get_leaderboard now returns role + is_test
    admin.rpc("get_leaderboard"),
    admin.from("ride_or_die_picks").select("user_id, team:team_id(name, flag_emoji)"),
    admin.from("score_events").select("user_id, points, reason, created_at, team_id").order("created_at"),
    admin
      .from("matches")
      .select("id, round, winner_team_id")
      .in("round", TB_ROUNDS)
      .eq("status", "completed"),
    admin.from("settings").select("value").eq("key", "ride_or_die_lock_time").maybeSingle(),
    admin.from("profiles").select("id, company, home_department, is_test"),
    admin.from("teams").select("id, flag_emoji"),
  ]);

  type CompanyRow = { id: string; company: string | null; home_department: string | null; is_test: boolean };
  const companyData = companyRes.data as unknown as CompanyRow[] | null;
  const companyByUser = new Map(
    (companyData ?? []).map((p) => [p.id, p.company])
  );

  const teamFlagById = new Map(
    (teamsRes.data ?? []).map((t) => [t.id, t.flag_emoji])
  );

  // Ride or Die picks are only revealed after the lock time has passed
  const lockTime = lockRes.data?.value as string | null | undefined;
  const rodRevealed = lockTime ? new Date(lockTime) <= new Date() : false;

  const lbRows = lbRes.data ?? [];
  const rodByUser = new Map(
    (rodRes.data ?? []).map((r) => [
      r.user_id,
      r.team as unknown as { name: string; flag_emoji: string } | null,
    ])
  );

  // Group score_events by user
  const eventsByUser = new Map<
    string,
    Array<{ points: number; reason: string; created_at: string; flag_emoji?: string }>
  >();
  for (const e of scoresRes.data ?? []) {
    if (!eventsByUser.has(e.user_id)) eventsByUser.set(e.user_id, []);
    const flag_emoji = e.team_id ? teamFlagById.get(e.team_id) : undefined;
    eventsByUser.get(e.user_id)!.push({ ...e, flag_emoji });
  }

  // Build tiebreaker data: for F/SF/QF, fetch all picks
  const tbMatchIds = (tiebreakerMatchRes.data ?? []).map((m) => m.id);
  const tbPicksRes = tbMatchIds.length
    ? await admin
        .from("match_picks")
        .select("user_id, match_id, winner_team_id")
        .in("match_id", tbMatchIds)
    : { data: [] };

  // Compute tiebreaker score per user (higher = better)
  const tbMatchByRound = new Map(
    (tiebreakerMatchRes.data ?? []).map((m) => [m.id, m])
  );

  function tiebreakerKey(userId: string): [number, number, number] {
    const picks = (tbPicksRes.data ?? []).filter((p) => p.user_id === userId);
    let champion = 0;
    let sf = 0;
    let qf = 0;
    for (const p of picks) {
      const m = tbMatchByRound.get(p.match_id);
      if (!m || !m.winner_team_id) continue;
      if (p.winner_team_id !== m.winner_team_id) continue;
      if (m.round === "F") champion++;
      else if (m.round === "SF") sf++;
      else if (m.round === "QF") qf++;
    }
    return [champion, sf, qf];
  }

  // Sort with tiebreaking
  const sorted = [...lbRows].sort((a, b) => {
    const ptsDiff = Number(b.total_points) - Number(a.total_points);
    if (ptsDiff !== 0) return ptsDiff;
    const [ac, asf, aqf] = tiebreakerKey(a.user_id);
    const [bc, bsf, bqf] = tiebreakerKey(b.user_id);
    if (bc !== ac) return bc - ac;
    if (bsf !== asf) return bsf - asf;
    return bqf - aqf;
  });

  // Assign ranks (tied entries share a rank)
  let rank = 1;
  const rows: LeaderboardRow[] = sorted.map((entry, idx) => {
    if (idx > 0) {
      const prev = sorted[idx - 1];
      const same =
        Number(entry.total_points) === Number(prev.total_points) &&
        tiebreakerKey(entry.user_id).join() === tiebreakerKey(prev.user_id).join();
      if (!same) rank = idx + 1;
    }
    const rod = rodByUser.get(entry.user_id) ?? null;
    return {
      rank,
      user_id: entry.user_id,
      full_name: entry.full_name,
      total_points: Number(entry.total_points),
      is_test: entry.is_test,
      role: entry.role as UserRole,
      rod_flag: rod?.flag_emoji ?? null,
      rod_name: rod?.name ?? null,
      company: companyByUser.get(entry.user_id) ?? null,
      score_events: eventsByUser.get(entry.user_id) ?? [],
    };
  });

  // Build department groups for CC users (all members, top computed client-side to respect toggle)
  const DEPT_ORDER = ["Management", "Production", "Post Harvest", "Grow", "Food Safety", "Procurement", "Maintenance", "Sales & Marketing", "Data"];
  const deptByUser = new Map(
    (companyData ?? [])
      .filter((p) => p.company === "Campo Caribe" && p.home_department)
      .map((p) => [p.id, p.home_department!])
  );
  const deptGroupMap = new Map<string, DeptGroup["users"]>();
  if (isCampoCaribe) {
    for (const row of rows) {
      const dept = deptByUser.get(row.user_id);
      if (!dept) continue;
      if (!deptGroupMap.has(dept)) deptGroupMap.set(dept, []);
      deptGroupMap.get(dept)!.push({
        user_id: row.user_id,
        full_name: row.full_name,
        total_points: row.total_points,
        is_test: row.is_test,
        rod_flag: row.rod_flag,
      });
    }
  }
  const deptGroups: DeptGroup[] = DEPT_ORDER
    .filter((d) => deptGroupMap.has(d))
    .map((d) => ({ department: d, users: deptGroupMap.get(d)! }));

  return (
    <LeaderboardClient
      rows={rows}
      currentUserId={user.id}
      canSeeTestUsers={canSeeTestUsers}
      rodRevealed={rodRevealed}
      deptGroups={isCampoCaribe ? deptGroups : undefined}
    />
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
          <div className="h-4 w-6 bg-muted rounded animate-pulse" />
          <div className="h-4 w-40 bg-muted rounded animate-pulse flex-1" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <div className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🏆 Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Click any row to see their full score breakdown.
          </p>
        </div>
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardData />
        </Suspense>
      </div>
    </main>
  );
}
