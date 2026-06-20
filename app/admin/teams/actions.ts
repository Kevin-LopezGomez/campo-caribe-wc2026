"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateTeam(
  teamId: string,
  data: {
    name: string;
    country_code: string;
    flag_emoji: string;
    group_letter: string;
    is_top_20: boolean;
    eliminated: boolean;
  }
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("teams").update(data).eq("id", teamId);
  if (error) return { error: error.message };
  revalidatePath("/admin/teams");
  revalidatePath("/bracket");
  return {};
}
