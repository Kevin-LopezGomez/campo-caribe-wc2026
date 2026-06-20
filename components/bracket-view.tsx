"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type TeamSnap = {
  id: string;
  name: string;
  flag_emoji: string;
  country_code: string;
};

export type BracketMatch = {
  id: string;
  round: string;
  kickoff_time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  next_match_id: string | null;
  winner_team_id: string | null;
  team_home: TeamSnap | null;
  team_away: TeamSnap | null;
  winner_team: TeamSnap | null;
};

const ROUNDS = ["R32", "R16", "QF", "SF", "F"] as const;
type RoundKey = (typeof ROUNDS)[number];

const ROUND_LABELS: Record<RoundKey, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinals",
  SF: "Semifinals",
  F: "Final",
};

const ROUND_SHORT: Record<RoundKey, string> = {
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  F: "Final",
};

// Each R32 slot = BASE_PX. Each subsequent round doubles.
const BASE_PX = 56;
const SLOT_MULTIPLIERS: Record<RoundKey, number> = {
  R32: 1,
  R16: 2,
  QF: 4,
  SF: 8,
  F: 16,
};

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

function CompactMatchCard({ match }: { match: BracketMatch }) {
  const isCompleted = match.status === "completed";
  const isLive = match.status === "live";
  const home = match.team_home;
  const away = match.team_away;

  const homeWon = isCompleted && match.winner_team_id === home?.id;
  const awayWon = isCompleted && match.winner_team_id === away?.id;

  return (
    <div
      className={`w-full rounded border bg-card text-card-foreground text-xs select-none ${
        isLive ? "border-green-500" : "border-border"
      }`}
    >
      <div
        className={`flex items-center justify-between px-2 py-1 gap-1 min-w-0 ${
          homeWon ? "font-bold" : ""
        }`}
      >
        <span className="flex items-center gap-1 min-w-0">
          <span>{home?.flag_emoji ?? "🏳️"}</span>
          <span className="truncate">{home?.name ?? "TBD"}</span>
        </span>
        {(isCompleted || isLive) && (
          <span className="shrink-0 tabular-nums">{match.home_score ?? "-"}</span>
        )}
      </div>

      <div className="border-t border-border" />

      <div
        className={`flex items-center justify-between px-2 py-1 gap-1 min-w-0 ${
          awayWon ? "font-bold" : ""
        }`}
      >
        <span className="flex items-center gap-1 min-w-0">
          <span>{away?.flag_emoji ?? "🏳️"}</span>
          <span className="truncate">{away?.name ?? "TBD"}</span>
        </span>
        {(isCompleted || isLive) && (
          <span className="shrink-0 tabular-nums">{match.away_score ?? "-"}</span>
        )}
      </div>

      <div
        className="border-t border-border px-2 py-0.5 flex items-center justify-between gap-1"
        style={{ fontSize: "10px" }}
      >
        <span className="text-muted-foreground">
          {formatKickoff(match.kickoff_time)} AST
        </span>
        {isLive && (
          <span className="text-green-500 font-bold animate-pulse">LIVE</span>
        )}
        {isCompleted && (
          <span className="text-muted-foreground">FT</span>
        )}
      </div>
    </div>
  );
}

function FullMatchCard({ match }: { match: BracketMatch }) {
  const isCompleted = match.status === "completed";
  const isLive = match.status === "live";
  const home = match.team_home;
  const away = match.team_away;

  const homeWon = isCompleted && match.winner_team_id === home?.id;
  const awayWon = isCompleted && match.winner_team_id === away?.id;

  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground ${
        isLive ? "border-green-500" : "border-border"
      }`}
    >
      <div className="px-4 py-2 flex items-center justify-between">
        <div
          className={`flex items-center gap-3 ${homeWon ? "font-bold" : ""}`}
        >
          <span className="text-2xl">{home?.flag_emoji ?? "🏳️"}</span>
          <span className="text-sm">{home?.name ?? "TBD"}</span>
        </div>
        {(isCompleted || isLive) && (
          <span className="text-xl font-bold tabular-nums">
            {match.home_score ?? "-"}
          </span>
        )}
      </div>

      <div className="border-t border-border mx-4" />

      <div className="px-4 py-2 flex items-center justify-between">
        <div
          className={`flex items-center gap-3 ${awayWon ? "font-bold" : ""}`}
        >
          <span className="text-2xl">{away?.flag_emoji ?? "🏳️"}</span>
          <span className="text-sm">{away?.name ?? "TBD"}</span>
        </div>
        {(isCompleted || isLive) && (
          <span className="text-xl font-bold tabular-nums">
            {match.away_score ?? "-"}
          </span>
        )}
      </div>

      <div className="border-t border-border px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatKickoff(match.kickoff_time)} AST</span>
        {isLive && (
          <span className="text-green-500 font-semibold animate-pulse">
            LIVE
          </span>
        )}
        {isCompleted && <span>Full Time</span>}
        {!isCompleted && !isLive && <span>Scheduled</span>}
      </div>
    </div>
  );
}

function groupByRound(matches: BracketMatch[]) {
  const grouped: Record<RoundKey, BracketMatch[]> = {
    R32: [],
    R16: [],
    QF: [],
    SF: [],
    F: [],
  };
  for (const m of matches) {
    const r = m.round as RoundKey;
    if (grouped[r]) grouped[r].push(m);
  }
  for (const r of ROUNDS) {
    grouped[r].sort(
      (a, b) =>
        new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
    );
  }
  return grouped;
}

function getDefaultRound(byRound: Record<RoundKey, BracketMatch[]>): RoundKey {
  const now = Date.now();
  for (const round of ROUNDS) {
    const hasActive = byRound[round].some(
      (m) =>
        m.status === "live" ||
        (m.status === "scheduled" &&
          new Date(m.kickoff_time).getTime() > now - 7200_000)
    );
    if (hasActive) return round;
  }
  return "F";
}

export function BracketView({ matches }: { matches: BracketMatch[] }) {
  const byRound = useMemo(() => groupByRound(matches), [matches]);
  const defaultRound = useMemo(() => getDefaultRound(byRound), [byRound]);
  const [activeTab, setActiveTab] = useState<RoundKey>(defaultRound);

  return (
    <>
      {/* ── Mobile: tabs ── */}
      <div className="md:hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as RoundKey)}
        >
          <TabsList className="w-full">
            {ROUNDS.map((r) => (
              <TabsTrigger key={r} value={r} className="flex-1 text-xs">
                {ROUND_SHORT[r]}
              </TabsTrigger>
            ))}
          </TabsList>

          {ROUNDS.map((r) => (
            <TabsContent key={r} value={r} className="mt-4">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {ROUND_LABELS[r]}
              </h2>
              <div className="flex flex-col gap-3">
                {byRound[r].length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matches scheduled yet.
                  </p>
                ) : (
                  byRound[r].map((match) => (
                    <FullMatchCard key={match.id} match={match} />
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ── Desktop: bracket columns ── */}
      <div className="hidden md:block overflow-x-auto pb-6">
        <div className="flex gap-2 items-start" style={{ minWidth: "880px" }}>
          {ROUNDS.map((round) => {
            const slotPx = SLOT_MULTIPLIERS[round] * BASE_PX;
            const roundMatches = byRound[round];
            return (
              <div
                key={round}
                className="flex-shrink-0"
                style={{ width: "168px" }}
              >
                <div className="text-center text-xs font-semibold text-muted-foreground mb-2 px-1">
                  {ROUND_LABELS[round]}
                </div>
                {roundMatches.length === 0 ? (
                  <div
                    style={{ height: `${16 * BASE_PX}px` }}
                    className="flex items-start pt-3 justify-center text-xs text-muted-foreground"
                  >
                    TBD
                  </div>
                ) : (
                  roundMatches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center"
                      style={{ height: `${slotPx}px` }}
                    >
                      <CompactMatchCard match={match} />
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
