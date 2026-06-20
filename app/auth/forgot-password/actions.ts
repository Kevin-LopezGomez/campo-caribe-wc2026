"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function resetPassword(
  employeeId: string,
  accessKey: string,
  newPassword: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Validate the HR-issued access key (works even after initial registration)
  const { data: employee, error: lookupError } = await admin
    .from("approved_employees")
    .select("employee_id, access_key, is_registered")
    .eq("employee_id", employeeId)
    .single();

  if (lookupError || !employee) {
    return { error: "Employee ID not found." };
  }

  if (employee.access_key !== accessKey) {
    return { error: "Invalid access key. Contact HR to get a new one." };
  }

  if (!employee.is_registered) {
    return { error: "No account found for this employee ID. Please sign up first." };
  }

  // Look up the auth user ID via the profiles table
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("employee_id", employeeId)
    .single();

  if (profileError || !profile) {
    return { error: "Account not found. Please contact HR." };
  }

  // Update password directly via the admin API
  const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });

  if (updateError) {
    return { error: "Failed to reset password. Please try again." };
  }

  return {};
}
