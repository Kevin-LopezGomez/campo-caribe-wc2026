"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Convert AST input value (YYYY-MM-DDTHH:mm in AST = UTC-4) to UTC ISO string
function astInputToUtcIso(astLocal: string): string {
  const [datePart, timePart] = astLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  // AST is UTC-4, so add 4 hours to get UTC
  return new Date(Date.UTC(year, month - 1, day, hours + 4, minutes)).toISOString();
}

export async function updateRideOrDieLockTime(
  astLocal: string
): Promise<{ error?: string }> {
  const utcIso = astInputToUtcIso(astLocal);
  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert({ key: "ride_or_die_lock_time", value: utcIso as unknown as import("@/lib/types/database").Json });
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/ride-or-die");
  return {};
}

export async function updateRegistrationOpen(
  open: boolean
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert({ key: "registration_open", value: open as unknown as import("@/lib/types/database").Json });
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return {};
}
