import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { getFarmVsFarmData, MIN_OPPORTUNITIES, TOP_N } from "@/lib/farm-vs-farm";
import type { UserAccuracy } from "@/lib/farm-vs-farm";

function formatName(full_name: string): string {
  const comma = full_name.indexOf(",");
  if (comma === -1) return full_name;
  return `${full_name.slice(comma + 1).trim()} ${full_name.slice(0, comma).trim()}`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function CompanyRoster({
  users,
  color,
}: {
  users: UserAccuracy[];
  color: "orange" | "green";
}) {
  const textColor = color === "orange" ? "text-orange-500" : "text-green-600";

  if (users.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No qualified users yet (need {MIN_OPPORTUNITIES}+ opportunities).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u, i) => (
        <div
          key={u.user_id}
          className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5"
        >
          <span className="w-5 shrink-0 text-sm font-mono text-muted-foreground">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {formatName(u.full_name)}
            {u.rod_flag && <span className="ml-1.5">{u.rod_flag}</span>}
          </span>
          <div className="shrink-0 text-right">
            <span className="text-sm font-bold tabular-nums">{u.total_points} pts</span>
            <span className="ml-1.5 text-xs text-muted-foreground">
              · {pct(u.accuracy)} ({u.correct}/{u.opportunities})
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderSpan({ name }: { name: string }) {
  return (
    <span
      className={
        name === "Campo Caribe"
          ? "font-semibold text-orange-500"
          : "font-semibold text-green-600"
      }
    >
      {name}
    </span>
  );
}

async function FarmVsFarmContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { cc, hf } = await getFarmVsFarmData();

  const ccPct = Math.round(cc.teamAccuracy * 100);
  const hfPct = Math.round(hf.teamAccuracy * 100);
  const accuracyLeader = ccPct > hfPct ? "Campo Caribe" : hfPct > ccPct ? "Hawaii Farming" : null;
  const accuracyDiff = Math.abs(ccPct - hfPct);

  const ccPts = cc.topPointsTotal;
  const hfPts = hf.topPointsTotal;
  const pointsLeader = ccPts > hfPts ? "Campo Caribe" : hfPts > ccPts ? "Hawaii Farming" : null;
  const pointsDiff = Math.abs(ccPts - hfPts);

  return (
    <div className="space-y-8">
      {/* Head-to-head banner */}
      <div className="rounded-2xl border border-border bg-muted/20 p-6">
        <div className="flex items-center justify-center gap-8 sm:gap-16">
          {/* Campo Caribe */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Campo Caribe"
                width={22}
                height={22}
                className="shrink-0 object-contain"
              />
              <span className="hidden text-sm font-semibold text-orange-500 sm:block">
                Campo Caribe
              </span>
            </div>
            <span className="text-sm font-semibold text-orange-500 sm:hidden">CC</span>
            <span className="text-5xl font-bold tabular-nums text-orange-500">
              {ccPct}%
            </span>
            <span className="text-sm font-semibold tabular-nums text-orange-500/70">
              {ccPts} pts
            </span>
            {cc.topUsers.length > 0 && cc.topUsers.length < TOP_N && (
              <span className="text-xs text-muted-foreground">
                ({cc.topUsers.length} users)
              </span>
            )}
          </div>

          <span className="text-xl font-bold text-muted-foreground">vs</span>

          {/* Hawaii Farming */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-semibold text-green-600 sm:block">
                Hawaii Farming
              </span>
              <Image
                src="/hawaii-farming-logo.avif"
                alt="Hawaii Farming"
                width={22}
                height={22}
                className="shrink-0 object-contain"
              />
            </div>
            <span className="text-sm font-semibold text-green-600 sm:hidden">HF</span>
            <span className="text-5xl font-bold tabular-nums text-green-600">
              {hfPct}%
            </span>
            <span className="text-sm font-semibold tabular-nums text-green-600/70">
              {hfPts} pts
            </span>
            {hf.topUsers.length > 0 && hf.topUsers.length < TOP_N && (
              <span className="text-xs text-muted-foreground">
                ({hf.topUsers.length} users)
              </span>
            )}
          </div>
        </div>

        {/* Leader indicators */}
        <div className="mt-5 space-y-1 text-center text-sm text-muted-foreground">
          {accuracyLeader === pointsLeader && accuracyLeader !== null ? (
            <p>
              <LeaderSpan name={accuracyLeader} /> leading in both accuracy and points
            </p>
          ) : (
            <>
              {accuracyLeader ? (
                <p>
                  <LeaderSpan name={accuracyLeader} /> leading by {accuracyDiff}% accuracy
                </p>
              ) : (
                <p>Tied on accuracy</p>
              )}
              {pointsLeader ? (
                <p>
                  <LeaderSpan name={pointsLeader} /> leading by {pointsDiff} points
                </p>
              ) : (
                <p>Tied on points</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Per-company top-5 breakdown */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Campo Caribe */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Image
              src="/logo.png"
              alt=""
              width={16}
              height={16}
              className="object-contain"
            />
            <span className="text-orange-500">Campo Caribe</span>
            <span className="text-sm font-normal text-muted-foreground">
              — Top {Math.min(TOP_N, cc.topUsers.length)}
            </span>
          </h2>
          <CompanyRoster users={cc.topUsers} color="orange" />
          {cc.topUsers.length > 0 && (
            <p className="mt-2 text-right text-xs text-muted-foreground">
              Top {cc.topUsers.length} total:{" "}
              <span className="font-semibold text-foreground">{ccPts} pts</span>
            </p>
          )}
        </div>

        {/* Hawaii Farming */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Image
              src="/hawaii-farming-logo.avif"
              alt=""
              width={16}
              height={16}
              className="object-contain"
            />
            <span className="text-green-600">Hawaii Farming</span>
            <span className="text-sm font-normal text-muted-foreground">
              — Top {Math.min(TOP_N, hf.topUsers.length)}
            </span>
          </h2>
          <CompanyRoster users={hf.topUsers} color="green" />
          {hf.topUsers.length > 0 && (
            <p className="mt-2 text-right text-xs text-muted-foreground">
              Top {hf.topUsers.length} total:{" "}
              <span className="font-semibold text-foreground">{hfPts} pts</span>
            </p>
          )}
        </div>
      </div>

      {/* Signup counts */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>🟠 Campo Caribe: {cc.totalSignups} total signups, {cc.qualifiedCount} qualified</p>
        <p>🟢 Hawaii Farming: {hf.totalSignups} total signups, {hf.qualifiedCount} qualified</p>
      </div>

      {/* How it's calculated — native HTML details for zero-JS expand */}
      <details className="overflow-hidden rounded-lg border border-border">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/30">
          How it&apos;s calculated
        </summary>
        <div className="space-y-2 border-t border-border px-4 pb-4 pt-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Top {TOP_N} per company</strong> are chosen
            by total points — same ranking as the individual leaderboard.
          </p>
          <p>
            <strong className="text-foreground">Accuracy %</strong> = average accuracy of
            those top {TOP_N} scorers. Accuracy per user = (correct match picks + correct
            R/D advances) ÷ (picks made before kickoff + R/D matches played).
          </p>
          <p>
            <strong className="text-foreground">Total pts</strong> = combined points of the
            top {TOP_N} scorers. Both metrics are shown because accuracy measures precision
            and points measure overall output.
          </p>
          <p>
            Users need at least {MIN_OPPORTUNITIES} qualifying opportunities to be included.
            Late signups are not penalized — only picks and R/D rounds available to you
            count.
          </p>
        </div>
      </details>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-44 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          {Array.from({ length: TOP_N }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: TOP_N }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FarmVsFarmPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <AppNav />
      <div className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🌾 Farm vs Farm</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Company head-to-head — accuracy-based standings
          </p>
        </div>
        <Suspense fallback={<PageSkeleton />}>
          <FarmVsFarmContent />
        </Suspense>
      </div>
    </main>
  );
}
