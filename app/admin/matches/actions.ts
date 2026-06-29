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
  const { error } = await admin.from("matches").update(data).eq("id", matchId);
  if (error) return { error: error.message };

  if (data.status === "completed") {
    // Bracket progression: slot winner into the next match
    const { data: currentMatch } = await admin
      .from("matches")
      .select("next_match_id, team_home_id, team_away_id")
      .eq("id", matchId)
      .single();

    if (currentMatch?.next_match_id) {
      const { data: nextMatch } = await admin
        .from("matches")
        .select("team_home_id, team_away_id")
        .eq("id", currentMatch.next_match_id)
        .single();

      if (nextMatch) {
        const update: Record<string, string> = {};
        if (!nextMatch.team_home_id) {
          update.team_home_id = data.winner_team_id;
        } else if (!nextMatch.team_away_id) {
          update.team_away_id = data.winner_team_id;
        }
        if (Object.keys(update).length > 0) {
          await admin
            .from("matches")
            .update(update)
            .eq("id", currentMatch.next_match_id);
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
    .select("next_match_id, winner_team_id")
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
      const update: Record<string, null> = {};
      if (nextMatch.team_home_id === currentMatch.winner_team_id) {
        update.team_home_id = null;
      } else if (nextMatch.team_away_id === currentMatch.winner_team_id) {
        update.team_away_id = null;
      }
      if (Object.keys(update).length > 0) {
        await admin.from("matches").update(update).eq("id", currentMatch.next_match_id);
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
