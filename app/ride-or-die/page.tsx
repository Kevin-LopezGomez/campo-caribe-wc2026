import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppNav } from "@/components/app-nav";
import {
  RideOrDieClient,
  type CurrentPick,
} from "@/components/ride-or-die-client";
import type { Team } from "@/lib/types/database";

async function RideOrDieData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const [teamsResult, pickResult, settingResult] = await Promise.all([
    supabase
      .from("teams")
      .select("*")
      .order("name"),
    supabase
      .from("ride_or_die_picks")
      .select("id, team_id, locked, team:team_id(id, name, flag_emoji, country_code, is_top_20)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("settings")
      .select("value")
      .eq("key", "ride_or_die_lock_time")
      .maybeSingle(),
  ]);

  const lockTime = (settingResult.data?.value as string | null) ?? null;
  const isLocked = lockTime ? new Date(lockTime) <= new Date() : false;

  const allTeams = (teamsResult.data ?? []) as Team[];

  // After lock: fetch all picks to show counts per team (admin bypasses RLS)
  let pickCounts: Record<string, number> = {};
  if (isLocked) {
    const { data: allPicks } = await admin
      .from("ride_or_die_picks")
      .select("team_id");
    for (const p of allPicks ?? []) {
      pickCounts[p.team_id] = (pickCounts[p.team_id] ?? 0) + 1;
    }
  }

  return (
    <RideOrDieClient
      teams={allTeams}
      currentPick={(pickResult.data as unknown as CurrentPick) ?? null}
      lockTime={lockTime}
      isLocked={isLocked}
      pickCounts={pickCounts}
    />
  );
}

function RideOrDieSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-muted rounded-lg animate-pulse" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RideOrDiePage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🎯 Ride or Die</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick one team and earn points every round they advance. Max 80 pts.
          </p>
        </div>
        <Suspense fallback={<RideOrDieSkeleton />}>
          <RideOrDieData />
        </Suspense>
      </div>
    </main>
  );
}
