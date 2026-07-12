"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { recalculateMatchAffectedUsers } from "@/lib/scoring";

export async function updateMatchTeams(
  matchId: string,
  data: {
    team_home_id: string | null;
    team_away_id: string | null;
    kickoff_time: string;
  }
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("matches").update(data).eq("id", matchId);
  if (error) return { error: error.message };
  revalidatePath("/admin/matches");
  revalidatePath("/bracket");
  revalidatePath("/predictor");
  revalidatePath("/");
  return {};
}

export async function enterMatchResult(
  matchId: string,
  data: {
    winner_team_id: string;
    home_score: number;
    away_score: number;
    status: "live" | "completed";
  }
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Fetch match teams so we can override winner_team_id from scores (avoids wrong-team data)
  const { data: matchTeams } = await admin
    .from("matches")
    .select("team_home_id, team_away_id")
    .eq("id", matchId)
    .single();

  const scoreWinnerId = matchTeams
    ? data.home_score > data.away_score
      ? matchTeams.team_home_id
      : data.away_score > data.home_score
      ? matchTeams.team_away_id
      : null
    : null;

  const effectiveWinnerId = scoreWinnerId ?? data.winner_team_id;

  const { error } = await admin
    .from("matches")
    .update({ ...data, winner_team_id: effectiveWinnerId })
    .eq("id", matchId);
  if (error) return { error: error.message };

  if (data.status === "completed") {
    // Bracket progression: slot effective winner into the next match
    // matchTeams already fetched above — reuse next_match_id from it
    const { data: currentMatchMeta } = await admin
      .from("matches")
      .select("next_match_id, next_match_loser_id")
      .eq("id", matchId)
      .single();

    if (currentMatchMeta?.next_match_id) {
      const { data: nextMatch } = await admin
        .from("matches")
        .select("team_home_id, team_away_id")
        .eq("id", currentMatchMeta.next_match_id)
        .single();

      if (nextMatch) {
        if (!nextMatch.team_home_id) {
          await admin
            .from("matches")
            .update({ team_home_id: effectiveWinnerId })
            .eq("id", currentMatchMeta.next_match_id);
        } else if (!nextMatch.team_away_id) {
          await admin
            .from("matches")
            .update({ team_away_id: effectiveWinnerId })
            .eq("id", currentMatchMeta.next_match_id);
        }
      }
    }

    // Loser propagation: slot the losing team into the 3rd place match
    if (currentMatchMeta?.next_match_loser_id && matchTeams) {
      const loserId = [matchTeams.team_home_id, matchTeams.team_away_id]
        .find((id) => id && id !== effectiveWinnerId) ?? null;
      if (loserId) {
        const { data: loserMatch } = await admin
          .from("matches")
          .select("team_home_id, team_away_id")
          .eq("id", currentMatchMeta.next_match_loser_id)
          .single();
        if (loserMatch) {
          if (!loserMatch.team_home_id) {
            await admin
              .from("matches")
              .update({ team_home_id: loserId })
              .eq("id", currentMatchMeta.next_match_loser_id);
          } else if (!loserMatch.team_away_id) {
            await admin
              .from("matches")
              .update({ team_away_id: loserId })
              .eq("id", currentMatchMeta.next_match_loser_id);
          }
        }
      }
    }

    const scoreResult = await recalculateMatchAffectedUsers(matchId);
    if (scoreResult.error) return { error: `Saved, but scoring failed: ${scoreResult.error}` };
  }

  revalidatePath("/admin/matches");
  revalidatePath("/bracket");
  revalidatePath("/predictor");
  revalidatePath("/");
  return {};
}

export async function resetMatchResult(
  matchId: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Read current state BEFORE resetting so we can remove the winner from the next match
  const { data: currentMatch } = await admin
    .from("matches")
    .select("next_match_id, next_match_loser_id, winner_team_id, team_home_id, team_away_id")
    .eq("id", matchId)
    .single();

  const { error } = await admin
    .from("matches")
    .update({
      winner_team_id: null,
      home_score: null,
      away_score: null,
      status: "scheduled",
    })
    .eq("id", matchId);
  if (error) return { error: error.message };

  // Clear the winner from the next match's slot
  if (currentMatch?.next_match_id && currentMatch.winner_team_id) {
    const { data: nextMatch } = await admin
      .from("matches")
      .select("team_home_id, team_away_id")
      .eq("id", currentMatch.next_match_id)
      .single();

    if (nextMatch) {
      if (nextMatch.team_home_id === currentMatch.winner_team_id) {
        await admin
          .from("matches")
          .update({ team_home_id: null })
          .eq("id", currentMatch.next_match_id);
      } else if (nextMatch.team_away_id === currentMatch.winner_team_id) {
        await admin
          .from("matches")
          .update({ team_away_id: null })
          .eq("id", currentMatch.next_match_id);
      }
    }
  }

  // Clear the loser from the 3rd place match slot
  if (currentMatch?.next_match_loser_id && currentMatch.winner_team_id) {
    const loserId = [currentMatch.team_home_id, currentMatch.team_away_id]
      .find((id) => id && id !== currentMatch!.winner_team_id) ?? null;
    if (loserId) {
      const { data: loserMatch } = await admin
        .from("matches")
        .select("team_home_id, team_away_id")
        .eq("id", currentMatch.next_match_loser_id)
        .single();
      if (loserMatch) {
        if (loserMatch.team_home_id === loserId) {
          await admin
            .from("matches")
            .update({ team_home_id: null })
            .eq("id", currentMatch.next_match_loser_id);
        } else if (loserMatch.team_away_id === loserId) {
          await admin
            .from("matches")
            .update({ team_away_id: null })
            .eq("id", currentMatch.next_match_loser_id);
        }
      }
    }
  }

  // Re-score affected users so this match's points are removed
  await recalculateMatchAffectedUsers(matchId);

  revalidatePath("/admin/matches");
  revalidatePath("/bracket");
  revalidatePath("/predictor");
  revalidatePath("/");
  return {};
}
