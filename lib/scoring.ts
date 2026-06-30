// Server-only scoring engine. Import only from server actions.
import { createAdminClient } from "@/lib/supabase/admin";
import type { Round } from "@/lib/types/database";

const MATCH_POINTS: Record<Round, number> = {
  R32: 2,
  R16: 3,
  QF: 5,
  SF: 8,
  F: 12,
};

const ROD_POINTS: Record<Round, number> = {
  R32: 5,
  R16: 10,
  QF: 15,
  SF: 20,
  F: 30,
};

const EXACT_SCORE_BONUS = 2;
const LOYALTY_BONUS = 10;

export type ScoringEvent = {
  user_id: string;
  points: number;
  reason: string;
  match_id?: string;
  team_id?: string;
};

// Compute what a user's score events SHOULD be based on current match results.
// Does NOT write to the database.
export async function computeUserScore(
  userId: string
): Promise<{ events: ScoringEvent[]; total: number; error?: string }> {
  const admin = createAdminClient();

  const { data: rodRow } = await admin
    .from("ride_or_die_picks")
    .select("team_id, team:team_id(is_top_20)")
    .eq("user_id", userId)
    .maybeSingle();

  const rodTeamId = rodRow?.team_id ?? null;
  const isCinderella = rodRow
    ? !(rodRow.team as unknown as { is_top_20: boolean }).is_top_20
    : false;

  const { data: done, error: matchErr } = await admin
    .from("matches")
    .select(
      "id, round, team_home_id, team_away_id, winner_team_id, home_score, away_score"
    )
    .eq("status", "completed");

  if (matchErr) return { events: [], total: 0, error: matchErr.message };
  if (!done?.length) return { events: [], total: 0 };

  const doneIds = done.map((m) => m.id);

  const { data: userPicks } = await admin
    .from("match_picks")
    .select(
      "match_id, winner_team_id, predicted_home_score, predicted_away_score"
    )
    .eq("user_id", userId)
    .in("match_id", doneIds);

  const pickByMatch = new Map(
    (userPicks ?? []).map((p) => [p.match_id, p])
  );

  // Derive actual winner from scores; fall back to DB field for ET/pen draws
  function resolveWinner(m: { home_score: number | null; away_score: number | null; team_home_id: string | null; team_away_id: string | null; winner_team_id: string | null }): string | null {
    if (m.home_score !== null && m.away_score !== null) {
      if (m.home_score > m.away_score) return m.team_home_id;
      if (m.away_score > m.home_score) return m.team_away_id;
    }
    return m.winner_team_id;
  }

  const events: ScoringEvent[] = [];

  for (const m of done) {
    const pick = pickByMatch.get(m.id);
    if (!pick) continue;
    const winnerId = resolveWinner(m);
    if (!winnerId) continue;

    if (pick.winner_team_id === winnerId) {
      events.push({
        user_id: userId,
        points: MATCH_POINTS[m.round as Round],
        reason: `Correct pick (${m.round})`,
        match_id: m.id,
        team_id: winnerId,
      });

      if (
        pick.predicted_home_score !== null &&
        pick.predicted_away_score !== null &&
        pick.predicted_home_score === m.home_score &&
        pick.predicted_away_score === m.away_score
      ) {
        events.push({
          user_id: userId,
          points: EXACT_SCORE_BONUS,
          reason: `Exact score bonus (${m.round})`,
          match_id: m.id,
          team_id: winnerId,
        });
      }
    }
  }

  if (rodTeamId) {
    const rodMatches = done.filter(
      (m) => m.team_home_id === rodTeamId || m.team_away_id === rodTeamId
    );

    for (const m of rodMatches) {
      if (resolveWinner(m) === rodTeamId) {
        const base = ROD_POINTS[m.round as Round];
        const pts = isCinderella ? base * 2 : base;
        events.push({
          user_id: userId,
          points: pts,
          reason: `Ride or Die${isCinderella ? " Cinderella 2×" : ""} (${m.round})`,
          match_id: m.id,
          team_id: rodTeamId,
        });
      }
    }

    const finalDone = done.some((m) => m.round === "F");
    if (finalDone && rodMatches.length > 0) {
      const allCorrect = rodMatches.every((m) => {
        const pick = pickByMatch.get(m.id);
        return pick?.winner_team_id === rodTeamId && resolveWinner(m) === rodTeamId;
      });
      if (allCorrect) {
        events.push({
          user_id: userId,
          points: LOYALTY_BONUS,
          reason: "Loyalty bonus: picked R/D team correctly every round",
          team_id: rodTeamId,
        });
      }
    }
  }

  const total = events.reduce((s, e) => s + e.points, 0);
  return { events, total };
}

// Delete existing score_events for userId and reinsert computed events.
export async function recalculateUserScore(
  userId: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { error: delErr } = await admin
    .from("score_events")
    .delete()
    .eq("user_id", userId);
  if (delErr) return { error: delErr.message };

  const { events, error: compErr } = await computeUserScore(userId);
  if (compErr) return { error: compErr };

  if (events.length > 0) {
    const { error: insErr } = await admin.from("score_events").insert(events);
    if (insErr) return { error: insErr.message };
  }

  return {};
}

export async function recalculateMatchAffectedUsers(
  matchId: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: match } = await admin
    .from("matches")
    .select("team_home_id, team_away_id")
    .eq("id", matchId)
    .single();

  if (!match) return { error: "Match not found" };

  const teamIds = [match.team_home_id, match.team_away_id].filter(
    Boolean
  ) as string[];

  const [pickersResult, rodPickersResult] = await Promise.all([
    admin.from("match_picks").select("user_id").eq("match_id", matchId),
    teamIds.length
      ? admin.from("ride_or_die_picks").select("user_id").in("team_id", teamIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userIds = new Set<string>([
    ...(pickersResult.data ?? []).map((p) => p.user_id),
    ...((rodPickersResult as { data: { user_id: string }[] | null }).data ?? []).map(
      (p) => p.user_id
    ),
  ]);

  for (const uid of userIds) {
    const result = await recalculateUserScore(uid);
    if (result.error) return result;
  }

  return {};
}
