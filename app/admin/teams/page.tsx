import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTeamsClient } from "./teams-client";
import type { Team } from "@/lib/types/database";

async function TeamsData() {
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

  return <AdminTeamsClient teams={(teams ?? []) as Team[]} />;
}

function TeamsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function AdminTeamsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground mt-1">
          48 teams across 12 groups
        </p>
      </div>
      <Suspense fallback={<TeamsSkeleton />}>
        <TeamsData />
      </Suspense>
    </div>
  );
}
