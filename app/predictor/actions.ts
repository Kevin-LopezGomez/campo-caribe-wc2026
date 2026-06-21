"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveMatchPick(
  matchId: string,
  winnerId: string,
  predictedHomeScore: number | null,
  predictedAwayScore: number | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Server-side lock check — status takes priority over clock time
  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("kickoff_time, status, team_home_id, team_away_id")
    .eq("id", matchId)
    .single();

  if (!match) return { error: "Match not found." };
  if (!match.team_home_id || !match.team_away_id)
    return { error: "Teams not set yet." };
  if (match.status !== "scheduled")
    return { error: "Pick deadline has passed. Match has already started or finished." };
  if (new Date(match.kickoff_time) <= new Date())
    return { error: "Pick deadline has passed. Match has kicked off." };
  if (winnerId !== match.team_home_id && winnerId !== match.team_away_id)
    return { error: "Invalid team selection." };

  const { error } = await supabase.from("match_picks").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      winner_team_id: winnerId,
      predicted_home_score: predictedHomeScore,
      predicted_away_score: predictedAwayScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) return { error: error.message };
  revalidatePath("/predictor");
  revalidatePath("/");
  return {};
}
