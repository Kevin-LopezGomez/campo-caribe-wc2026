import { createAdminClient } from "@/lib/supabase/admin";

export const MIN_OPPORTUNITIES = 5;
export const TOP_N = 5;

export type UserAccuracy = {
  user_id: string;
  full_name: string;
  company: string;
  total_points: number;
  correct: number;
  opportunities: number;
  accuracy: number; // 0–1
};

export type CompanyStats = {
  company: string;
  teamAccuracy: number; // average accuracy of top-N users
  topPointsTotal: number; // sum of top-N users' points
  topUsers: UserAccuracy[];
  totalSignups: number;
  qualifiedCount: number;
};

export type FarmVsFarmData = {
  cc: CompanyStats;
  hf: CompanyStats;
};

export async function getFarmVsFarmData(): Promise<FarmVsFarmData> {
  const admin = createAdminClient();

  // Parallel fetch: profiles, completed matches, R/D picks, score events
  const [profilesRes, matchesRes, rodPicksRes, scoreEventsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, company")
      .eq("is_test", false)
      .not("company", "is", null),
    admin
      .from("matches")
      .select("id, team_home_id, team_away_id, kickoff_time, winner_team_id")
      .eq("status", "completed"),
    admin.from("ride_or_die_picks").select("user_id, team_id"),
    admin.from("score_events").select("user_id, points"),
  ]);

  // Sum points per user
  const pointsByUser = new Map<string, number>();
  for (const e of scoreEventsRes.data ?? []) {
    pointsByUser.set(e.user_id, (pointsByUser.get(e.user_id) ?? 0) + e.points);
  }

  const profiles = (profilesRes.data ?? []).filter(
    (p) => p.company === "Campo Caribe" || p.company === "Hawaii Farming"
  );
  const completedMatches = matchesRes.data ?? [];
  const matchById = new Map(completedMatches.map((m) => [m.id, m]));
  const rodByUser = new Map((rodPicksRes.data ?? []).map((r) => [r.user_id, r.team_id]));

  // Fetch match picks for completed matches only
  const matchIds = completedMatches.map((m) => m.id);
  const allPicks =
    matchIds.length > 0
      ? ((await admin
          .from("match_picks")
          .select("user_id, match_id, winner_team_id, submitted_at")
          .in("match_id", matchIds)).data ?? [])
      : [];

  // Group picks by user for O(1) lookup
  const picksByUser = new Map<string, typeof allPicks>();
  for (const pick of allPicks) {
    if (!picksByUser.has(pick.user_id)) picksByUser.set(pick.user_id, []);
    picksByUser.get(pick.user_id)!.push(pick);
  }

  // Calculate per-user accuracy
  const userAccuracies: UserAccuracy[] = profiles.map((profile) => {
    const userPicks = picksByUser.get(profile.id) ?? [];

    // Valid = completed match + submitted before kickoff
    const validPicks = userPicks.filter((p) => {
      const match = matchById.get(p.match_id);
      return match && new Date(p.submitted_at) < new Date(match.kickoff_time);
    });

    const correctMatchPicks = validPicks.filter(
      (p) => p.winner_team_id === matchById.get(p.match_id)!.winner_team_id
    );

    // Ride or Die: count matches team played in, and matches they won
    const rodTeamId = rodByUser.get(profile.id) ?? null;
    let rodPlayed = 0;
    let rodCorrect = 0;
    if (rodTeamId) {
      for (const m of completedMatches) {
        if (m.team_home_id !== rodTeamId && m.team_away_id !== rodTeamId) continue;
        rodPlayed++;
        if (m.winner_team_id === rodTeamId) rodCorrect++;
      }
    }

    const correct = correctMatchPicks.length + rodCorrect;
    const opportunities = validPicks.length + rodPlayed;

    return {
      user_id: profile.id,
      full_name: profile.full_name,
      company: profile.company!,
      total_points: pointsByUser.get(profile.id) ?? 0,
      correct,
      opportunities,
      accuracy: opportunities > 0 ? correct / opportunities : 0,
    };
  });

  function buildStats(company: string): CompanyStats {
    const users = userAccuracies.filter((u) => u.company === company);
    const totalSignups = users.length;
    const qualified = users
      .filter((u) => u.opportunities >= MIN_OPPORTUNITIES)
      .sort((a, b) => b.total_points - a.total_points);
    const topUsers = qualified.slice(0, TOP_N);
    const teamAccuracy =
      topUsers.length > 0
        ? topUsers.reduce((s, u) => s + u.accuracy, 0) / topUsers.length
        : 0;
    const topPointsTotal = topUsers.reduce((s, u) => s + u.total_points, 0);
    return { company, teamAccuracy, topPointsTotal, topUsers, totalSignups, qualifiedCount: qualified.length };
  }

  return {
    cc: buildStats("Campo Caribe"),
    hf: buildStats("Hawaii Farming"),
  };
}
