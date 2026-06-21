import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminSettingsClient } from "./settings-client";

async function SettingsData() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("settings")
    .select("key, value")
    .in("key", ["ride_or_die_lock_time", "registration_open"]);

  const byKey = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const lockTime = (byKey["ride_or_die_lock_time"] as string | undefined) ?? null;
  const registrationOpen = (byKey["registration_open"] as boolean | undefined) ?? true;

  return (
    <AdminSettingsClient
      lockTime={lockTime}
      registrationOpen={registrationOpen}
    />
  );
}

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tournament controls and deadlines
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-40 bg-muted rounded-lg animate-pulse" />
            <div className="h-40 bg-muted rounded-lg animate-pulse" />
          </div>
        }
      >
        <SettingsData />
      </Suspense>
    </div>
  );
}
