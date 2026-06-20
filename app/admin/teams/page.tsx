import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTeamsClient } from "./teams-client";
import type { Team } from "@/lib/types/database";

export default async function AdminTeamsPage() {
  const admin = createAdminClient();
  const { data: teams, error } = await admin
    .from("teams")
    .select("*")
    .order("group_letter")
    .order("name");

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load teams: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {teams?.length ?? 0} teams across 12 groups
        </p>
      </div>
      <AdminTeamsClient teams={(teams ?? []) as Team[]} />
    </div>
  );
}
