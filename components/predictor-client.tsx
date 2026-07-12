"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Round, MatchStatus } from "@/lib/types/database";
import { saveMatchPick, resetMatchPick } from "@/app/predictor/actions";

export type PredictorMatchData = {
  id: string;
  round: Round;
  kickoff_time: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  team_home: { id: string; name: string; flag_emoji: string } | null;
  team_away: { id: string; name: string; flag_emoji: string } | null;
  myPick: {
    winner_team_id: string;
    predicted_home_score: number | null;
    predicted_away_score: number | null;
  } | null;
  pickCounts: { home: number; away: number } | null;
};

const ROUND_LABELS: Record<Round, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinals",
  SF: "Semifinals",
  "3RD": "3rd Place Match",
  F: "Final",
};
const ROUNDS: Round[] = ["R32", "R16", "QF", "SF", "3RD", "F"];

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function PickCounts({
  counts,
  homeId,
  awayId,
  homeTeam,
  awayTeam,
}: {
  counts: { home: number; away: number };
  homeId: string;
  awayId: string;
  homeTeam: { name: string; flag_emoji: string };
  awayTeam: { name: string; flag_emoji: string };
}) {
  const total = counts.home + counts.away;
  const homePct = total === 0 ? 50 : Math.round((counts.home / total) * 100);
  const awayPct = 100 - homePct;
  return (
    <div className="mt-3 text-xs text-muted-foreground space-y-1">
      <p className="font-medium text-foreground text-xs">Employee picks</p>
      <div className="flex items-center gap-2">
        <span className="w-5 text-right shrink-0">{counts.home}</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${homePct}%` }}
          />
        </div>
        <span className="w-5 shrink-0">{counts.away}</span>
      </div>
      <div className="flex justify-between">
        <span>
          {homeTeam.flag_emoji} {homeTeam.name} {homePct}%
        </span>
        <span>
          {awayPct}% {awayTeam.flag_emoji} {awayTeam.name}
        </span>
      </div>
    </div>
  );
}

function MatchPickCard({ match }: { match: PredictorMatchData }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    match.myPick?.winner_team_id ?? null
  );
  const [homeScore, setHomeScore] = useState(
    match.myPick?.predicted_home_score?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    match.myPick?.predicted_away_score?.toString() ?? ""
  );
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Locked when status is no longer 'scheduled' OR kickoff has passed (whichever comes first)
  const isLocked = match.status !== "scheduled" || new Date(match.kickoff_time) <= new Date();
  const isCompleted = match.status === "completed";
  const hasBothTeams = !!(match.team_home && match.team_away);

  // Derive winner from score for regular-time decisions; fall back to DB field for ET/pen draws
  const scoreWinnerId = (() => {
    if (!isCompleted || match.home_score === null || match.away_score === null) return null;
    if (match.home_score > match.away_score) return match.team_home?.id ?? null;
    if (match.away_score > match.home_score) return match.team_away?.id ?? null;
    return null;
  })();
  const displayWinnerId = scoreWinnerId ?? match.winner_team_id;

  const myPickCorrect =
    isCompleted && match.myPick && displayWinnerId
      ? match.myPick.winner_team_id === displayWinnerId
      : null;

  function handleSelect(teamId: string) {
    if (isLocked) return;
    setSelectedId(teamId);
    setMsg(null);
  }

  function handleSubmit() {
    if (!selectedId || isLocked) return;
    const hasHome = homeScore !== "";
    const hasAway = awayScore !== "";
    if (hasHome !== hasAway) {
      setMsg({ text: "Enter both scores or leave both empty.", ok: false });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const result = await saveMatchPick(
        match.id,
        selectedId,
        hasHome ? parseInt(homeScore, 10) : null,
        hasAway ? parseInt(awayScore, 10) : null
      );
      if (result.error) {
        setMsg({ text: result.error, ok: false });
      } else {
        setMsg({ text: "Pick saved!", ok: true });
        router.refresh();
      }
    });
  }

  // TBD: teams not assigned yet
  if (!hasBothTeams) {
    return (
      <div className="border border-border rounded-lg p-4 opacity-60">
        <p className="text-xs text-muted-foreground mb-1">
          {formatKickoff(match.kickoff_time)} AST
        </p>
        <p className="text-sm font-medium">
          {match.team_home
            ? `${match.team_home.flag_emoji} ${match.team_home.name}`
            : "TBD"}
          <span className="text-muted-foreground font-normal"> vs </span>
          {match.team_away
            ? `${match.team_away.flag_emoji} ${match.team_away.name}`
            : "TBD"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {match.team_home || match.team_away
            ? "Waiting for opponent"
            : "Teams not set yet"}
        </p>
      </div>
    );
  }

  const home = match.team_home!;
  const away = match.team_away!;

  return (
    <div
      className={`border rounded-lg p-4 ${
        isCompleted
          ? "border-border"
          : isLocked
          ? "border-amber-500/50"
          : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">
          {formatKickoff(match.kickoff_time)} AST
        </span>
        {match.status === "live" && (
          <span className="text-xs font-semibold text-red-500 animate-pulse">
            LIVE
          </span>
        )}
        {isLocked && match.status !== "live" && !isCompleted && (
          <span className="text-xs text-amber-600 font-medium">Kicked off</span>
        )}
      </div>

      {/* Completed: show score */}
      {isCompleted ? (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className={displayWinnerId && displayWinnerId !== home.id ? "opacity-40" : ""}>
              {home.flag_emoji} {home.name}
            </span>
            <span className="text-lg font-bold tabular-nums">
              {match.home_score ?? "?"} — {match.away_score ?? "?"}
            </span>
            <span className={displayWinnerId && displayWinnerId !== away.id ? "opacity-40" : ""}>
              {away.name} {away.flag_emoji}
            </span>
          </div>
          {/* User's result */}
          {match.myPick ? (
            <p className="text-sm mt-1">
              Your pick:{" "}
              <span
                className={
                  myPickCorrect ? "text-green-600 font-semibold" : "text-red-500"
                }
              >
                {myPickCorrect ? "✓" : "✗"}{" "}
                {match.myPick.winner_team_id === home.id ? home.name : away.name}
                {(match.myPick.predicted_home_score !== null || match.myPick.predicted_away_score !== null) &&
                  ` (${match.myPick.predicted_home_score ?? 0}-${match.myPick.predicted_away_score ?? 0})`}
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No pick made</p>
          )}
        </div>
      ) : (
        /* Teams row */
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="font-medium">
            {home.flag_emoji} {home.name}
          </span>
          <span className="text-muted-foreground">vs</span>
          <span className="font-medium">
            {away.flag_emoji} {away.name}
          </span>
        </div>
      )}

      {/* Before lock: pick form */}
      {!isLocked && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelect(home.id)}
              className={`flex-1 text-sm py-2 px-3 rounded border transition-colors ${
                selectedId === home.id
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border hover:border-primary/60"
              }`}
            >
              {selectedId === home.id && "✓ "}
              {home.flag_emoji} {home.name}
            </button>
            <button
              type="button"
              onClick={() => handleSelect(away.id)}
              className={`flex-1 text-sm py-2 px-3 rounded border transition-colors ${
                selectedId === away.id
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border hover:border-primary/60"
              }`}
            >
              {selectedId === away.id && "✓ "}
              {away.flag_emoji} {away.name}
            </button>
          </div>

          {/* Optional score prediction */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Score (optional):</span>
            <span>{home.flag_emoji}</span>
            <input
              type="number"
              min="0"
              max="20"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              placeholder="0"
              className="w-12 border border-input rounded px-2 py-1 text-center text-foreground bg-background text-sm"
            />
            <span>—</span>
            <input
              type="number"
              min="0"
              max="20"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              placeholder="0"
              className="w-12 border border-input rounded px-2 py-1 text-center text-foreground bg-background text-sm"
            />
            <span>{away.flag_emoji}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedId || isPending}
              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded disabled:opacity-40 transition-opacity"
            >
              {isPending
                ? "Saving…"
                : match.myPick
                ? "Update Pick"
                : "Save Pick"}
            </button>
            {match.myPick && (
              <button
                type="button"
                onClick={() => {
                  setMsg(null);
                  startTransition(async () => {
                    const result = await resetMatchPick(match.id);
                    if (result.error) {
                      setMsg({ text: result.error, ok: false });
                    } else {
                      setSelectedId(null);
                      setHomeScore("");
                      setAwayScore("");
                      router.refresh();
                    }
                  });
                }}
                disabled={isPending}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
              >
                Reset
              </button>
            )}
            {msg && (
              <span
                className={`text-xs ${msg.ok ? "text-green-600" : "text-destructive"}`}
              >
                {msg.text}
              </span>
            )}
          </div>
        </div>
      )}

      {/* After lock, not completed: show my pick read-only */}
      {isLocked && !isCompleted && (
        <div className="text-sm">
          {match.myPick ? (
            <p>
              Your pick:{" "}
              <span className="font-medium">
                {match.myPick.winner_team_id === home.id
                  ? `${home.flag_emoji} ${home.name}`
                  : `${away.flag_emoji} ${away.name}`}
                {(match.myPick.predicted_home_score !== null || match.myPick.predicted_away_score !== null) &&
                  ` — predicted ${match.myPick.predicted_home_score ?? 0}–${match.myPick.predicted_away_score ?? 0}`}
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No pick made</p>
          )}
        </div>
      )}

      {/* Pick counts (after lock for any state) */}
      {isLocked && match.pickCounts && (
        <PickCounts
          counts={match.pickCounts}
          homeId={home.id}
          awayId={away.id}
          homeTeam={home}
          awayTeam={away}
        />
      )}
    </div>
  );
}

export function PredictorClient({
  matches,
}: {
  matches: PredictorMatchData[];
}) {
  const matchesByRound = ROUNDS.reduce(
    (acc, r) => {
      acc[r] = matches.filter((m) => m.round === r);
      return acc;
    },
    {} as Record<Round, PredictorMatchData[]>
  );

  return (
    <div className="space-y-8">
      {ROUNDS.map((round) => {
        const roundMatches = matchesByRound[round];
        if (!roundMatches.length) return null;
        return (
          <section key={round}>
            <h2 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">
              {ROUND_LABELS[round]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roundMatches.map((m) => (
                <MatchPickCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
