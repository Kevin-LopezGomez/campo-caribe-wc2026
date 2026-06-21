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

  // Re-score affected users so this match's points are removed
  await recalculateMatchAffectedUsers(matchId);

  revalidatePath("/admin/matches");
  revalidatePath("/bracket");
  revalidatePath("/predictor");
  revalidatePath("/");
  return {};
}
