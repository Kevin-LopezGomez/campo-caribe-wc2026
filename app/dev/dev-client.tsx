"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  seedTestData,
  seedTestResults,
  teardownTestData,
  recalculateAllScores,
  recalculateOneUser,
  getUserBreakdown,
  getMatchDetail,
  type UserBreakdown,
  type MatchDetail,
  type DevStats,
} from "./actions";

type Profile = { id: string; full_name: string; employee_id: string; is_test: boolean };
type MatchMeta = { id: string; round: string; kickoff_time: string; label: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-5 space-y-4">
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function ActionButton({
  label,
  pending,
  pendingLabel,
  onClick,
  variant = "default",
}: {
  label: string;
  pending: boolean;
  pendingLabel: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`text-sm px-3 py-1.5 rounded transition-opacity disabled:opacity-40 ${
        variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

// ── A: User Score Breakdown ──────────────────────────────────────────────────
function UserBreakdownPanel({ profiles }: { profiles: Profile[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [breakdown, setBreakdown] = useState<UserBreakdown | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function load(uid: string) {
    setSelectedId(uid);
    setBreakdown(null);
    setMsg(null);
    startTransition(async () => {
      const r = await getUserBreakdown(uid);
      if (r.error) setMsg(r.error);
      else setBreakdown(r.data ?? null);
    });
  }

  function recalc() {
    if (!selectedId) return;
    startTransition(async () => {
      const r = await recalculateOneUser(selectedId);
      if (r.error) { setMsg(r.error); return; }
      const r2 = await getUserBreakdown(selectedId);
      if (r2.data) setBreakdown(r2.data);
      router.refresh();
    });
  }

  return (
    <Section title="A — User Score Breakdown">
      <div className="flex gap-2 flex-wrap items-center">
        <select
          value={selectedId}
          onChange={(e) => load(e.target.value)}
          className="border border-input rounded px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Select user…</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} ({p.employee_id}){p.is_test ? " [test]" : ""}
            </option>
          ))}
        </select>
        {selectedId && (
          <ActionButton label="Recalculate" pendingLabel="Recalculating…" pending={isPending} onClick={recalc} />
        )}
      </div>
      {msg && <p className="text-sm text-destructive">{msg}</p>}
      {breakdown && (
        <div className="space-y-3">
          <div className="flex gap-6 text-sm">
            <span>Stored: <strong>{breakdown.storedTotal} pts</strong></span>
            <span>Expected: <strong>{breakdown.expectedTotal} pts</strong></span>
            {breakdown.discrepancy && (
              <span className="text-red-500 font-semibold">⚠ Discrepancy!</span>
            )}
          </div>
          <div>
            <p className="text-xs font-medium mb-1 text-muted-foreground">Stored score events</p>
            {breakdown.storedEvents.length === 0
              ? <p className="text-xs text-muted-foreground">None</p>
              : (
                <div className="space-y-0.5 text-xs">
                  {breakdown.storedEvents.map((e, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-green-600 font-mono w-8 text-right">+{e.points}</span>
                      <span>{e.reason}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
          {breakdown.discrepancy && (
            <div>
              <p className="text-xs font-medium mb-1 text-muted-foreground">Expected score events</p>
              <div className="space-y-0.5 text-xs">
                {breakdown.expectedEvents.map((e, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-blue-600 font-mono w-8 text-right">+{e.points}</span>
                    <span>{e.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {isPending && !breakdown && <p className="text-sm text-muted-foreground">Loading…</p>}
    </Section>
  );
}

// ── B: Match View ────────────────────────────────────────────────────────────
function MatchViewPanel({ matches }: { matches: MatchMeta[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(mid: string) {
    setSelectedId(mid);
    setDetail(null);
    setMsg(null);
    startTransition(async () => {
      const r = await getMatchDetail(mid);
      if (r.error) setMsg(r.error);
      else setDetail(r.data ?? null);
    });
  }

  return (
    <Section title="B — Match View">
      <select
        value={selectedId}
        onChange={(e) => load(e.target.value)}
        className="border border-input rounded px-2 py-1.5 text-sm bg-background"
      >
        <option value="">Select match…</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
      {msg && <p className="text-sm text-destructive">{msg}</p>}
      {detail && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {detail.homeTeam?.flag_emoji} {detail.homeTeam?.name ?? "TBD"}
            {detail.status === "completed" ? ` ${detail.homeScore}–${detail.awayScore} ` : " vs "}
            {detail.awayTeam?.name ?? "TBD"} {detail.awayTeam?.flag_emoji}
            <span className="ml-2 text-xs text-muted-foreground">({detail.status})</span>
          </p>
          <p className="text-xs text-muted-foreground">{detail.picks.length} picks</p>
          <div className="space-y-1 text-xs">
            {detail.picks.map((p) => (
              <div key={p.userId} className="flex gap-3 items-center">
                <span className={p.correct === true ? "text-green-600" : p.correct === false ? "text-red-500" : ""}>
                  {p.correct === true ? "✓" : p.correct === false ? "✗" : "·"}
                </span>
                <span className="w-36 truncate">{p.fullName}</span>
                <span>picked {p.pickedTeamId === detail.homeTeam?.id ? detail.homeTeam?.name : detail.awayTeam?.name}
                  {p.predictedHome !== null ? ` (${p.predictedHome}–${p.predictedAway})` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
    </Section>
  );
}

// ── C: Math Validator ────────────────────────────────────────────────────────
function MathValidatorPanel({ profiles }: { profiles: Profile[] }) {
  const [breakdown, setBreakdown] = useState<UserBreakdown | null>(null);
  const [realOnly, setRealOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  function pickRandom() {
    const pool = realOnly ? profiles.filter((p) => !p.is_test) : profiles;
    const eligible = pool.length ? pool : profiles;
    const rand = eligible[Math.floor(Math.random() * eligible.length)];
    if (!rand) return;
    startTransition(async () => {
      const r = await getUserBreakdown(rand.id);
      if (r.data) setBreakdown(r.data);
    });
  }

  return (
    <Section title="C — Math Validator">
      <div className="flex items-center gap-3 flex-wrap">
        <ActionButton label="Pick random user" pendingLabel="Loading…" pending={isPending} onClick={pickRandom} />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={realOnly}
            onChange={(e) => setRealOnly(e.target.checked)}
            className="rounded border-input"
          />
          Real users only
        </label>
      </div>
      {breakdown && (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{breakdown.fullName}</p>
          <div className="flex gap-6">
            <span className={breakdown.discrepancy ? "text-red-500 font-semibold" : "text-green-600"}>
              Stored: {breakdown.storedTotal} pts
            </span>
            <span className={breakdown.discrepancy ? "text-red-500 font-semibold" : "text-green-600"}>
              Expected: {breakdown.expectedTotal} pts
            </span>
            {breakdown.discrepancy
              ? <span className="text-red-500 font-semibold">⚠ Mismatch — run Recalculate</span>
              : <span className="text-green-600">✓ Match</span>}
          </div>
          {breakdown.storedEvents.length > 0 && (
            <div className="space-y-0.5 text-xs">
              {breakdown.storedEvents.map((e, i) => (
                <div key={i} className="flex gap-4">
                  <span className="font-mono w-8 text-right text-green-600">+{e.points}</span>
                  <span>{e.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ── D: Bulk Actions ───────────────────────────────────────────────────────────
function BulkActionsPanel() {
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmTeardown, setConfirmTeardown] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ error?: string; count?: number }>, label?: string) {
    setMsg(null);
    startTransition(async () => {
      const r = await action();
      if (r.error) setMsg(`Error: ${r.error}`);
      else setMsg(label ? `${label} complete${"count" in r ? ` (${r.count})` : ""}.` : "Done.");
      router.refresh();
    });
  }

  return (
    <Section title="D — Bulk Actions">
      {/* Test data tools */}
      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="Seed Test Data"
          pendingLabel="Seeding…"
          pending={isPending}
          onClick={() => run(() => seedTestData(), "Seeded")}
        />
        <ActionButton
          label="Seed Test Results"
          pendingLabel="Seeding results…"
          pending={isPending}
          onClick={() => run(() => seedTestResults(), "Results seeded")}
        />
        {!confirmTeardown ? (
          <button
            type="button"
            onClick={() => setConfirmTeardown(true)}
            className="text-sm px-3 py-1.5 rounded border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
          >
            Teardown Test Data
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-red-600 font-medium">Are you sure?</span>
            <ActionButton
              label="Yes, teardown"
              pendingLabel="Tearing down…"
              pending={isPending}
              variant="danger"
              onClick={() => { setConfirmTeardown(false); run(() => teardownTestData(), "Teardown"); }}
            />
            <button type="button" onClick={() => setConfirmTeardown(false)} className="text-sm text-muted-foreground">Cancel</button>
          </div>
        )}
      </div>
      {/* Divider */}
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">Score tools</span>
        <div className="flex-1 border-t border-border" />
      </div>
      {/* Production score tools */}
      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="Recalculate All Scores"
          pendingLabel="Recalculating…"
          pending={isPending}
          onClick={() => run(() => recalculateAllScores(), "Recalculated")}
        />
      </div>
      {msg && <p className="text-sm mt-2">{msg}</p>}
    </Section>
  );
}

// ── E: Database Stats ─────────────────────────────────────────────────────────
function StatsPanel({ stats }: { stats: DevStats }) {
  return (
    <Section title="E — Database Stats">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Users by role</p>
          {Object.entries(stats.usersByRole).map(([role, n]) => (
            <p key={role}>{role}: <strong>{n}</strong></p>
          ))}
        </div>
        <div>
          <p className="text-muted-foreground text-xs">User types</p>
          <p>Real: <strong>{stats.realCount}</strong></p>
          <p>Test: <strong>{stats.testCount}</strong></p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Picks</p>
          <p>Match picks: <strong>{stats.totalPicks}</strong></p>
          <p>Ride or Die: <strong>{stats.rodPicks}</strong></p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Matches</p>
          <p>Completed: <strong>{stats.completedMatches}</strong></p>
        </div>
      </div>
    </Section>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function DevDashboardClient({
  profiles,
  matches,
  stats,
}: {
  profiles: Profile[];
  matches: MatchMeta[];
  stats: DevStats;
}) {
  return (
    <div className="space-y-6">
      <StatsPanel stats={stats} />
      <BulkActionsPanel />
      <UserBreakdownPanel profiles={profiles} />
      <MathValidatorPanel profiles={profiles} />
      <MatchViewPanel matches={matches} />
    </div>
  );
}
