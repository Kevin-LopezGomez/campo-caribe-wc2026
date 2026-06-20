import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { BracketView, type BracketMatch } from "@/components/bracket-view";

async function BracketData() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "*, team_home:team_home_id(*), team_away:team_away_id(*), winner_team:winner_team_id(*)"
    )
    .order("kickoff_time", { ascending: true });

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load bracket: {error.message}
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No matches have been scheduled yet. Check back soon.
      </div>
    );
  }

  return <BracketView matches={matches as unknown as BracketMatch[]} />;
}

function BracketSkeleton() {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}

export default function BracketPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Bracket</h1>
          <p className="text-sm text-muted-foreground mt-1">
            WC2026 Knockout Stage · All times in AST (Puerto Rico)
          </p>
        </div>
        <Suspense fallback={<BracketSkeleton />}>
          <BracketData />
        </Suspense>
      </div>
    </main>
  );
}
