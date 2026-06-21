"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveRideOrDiePick(
  teamId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Check lock time server-side (cannot be bypassed)
  const admin = createAdminClient();
  const { data: setting } = await admin
    .from("settings")
    .select("value")
    .eq("key", "ride_or_die_lock_time")
    .single();

  const lockTime = setting?.value as string | null;
  if (lockTime && new Date(lockTime) <= new Date()) {
    return { error: "Pick deadline has passed. Picks are now locked." };
  }

  // Upsert — insert or update on user_id conflict
  const { error } = await supabase
    .from("ride_or_die_picks")
    .upsert(
      {
        user_id: user.id,
        team_id: teamId,
        locked: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/ride-or-die");
  revalidatePath("/");
  return {};
}
