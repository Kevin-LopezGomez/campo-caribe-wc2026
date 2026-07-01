"use client";

import { useState, useMemo, useRef, useEffect } from "react";

const ROUND_SHORT: Record<string, string> = {
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  F: "Final",
};

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
  bracket_slot: number | null;
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

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
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
      (a, b) => (a.bracket_slot ?? 999) - (b.bracket_slot ?? 999)
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

type BracketPair = {
  sources: BracketMatch[];
  dest: BracketMatch | null;
};

function buildPairs(
  currentMatches: BracketMatch[],
  nextMatchById: Map<string, BracketMatch>
): BracketPair[] {
  const byNextId = new Map<string, BracketMatch[]>();
  const noNext: BracketMatch[] = [];

  for (const m of currentMatches) {
    if (m.next_match_id) {
      if (!byNextId.has(m.next_match_id)) byNextId.set(m.next_match_id, []);
      byNextId.get(m.next_match_id)!.push(m);
    } else {
      noNext.push(m);
    }
  }

  const pairs: BracketPair[] = [];

  for (const [nextId, sources] of byNextId) {
    sources.sort(
      (a, b) => (a.bracket_slot ?? 999) - (b.bracket_slot ?? 999)
    );
    pairs.push({ sources, dest: nextMatchById.get(nextId) ?? null });
  }

  pairs.sort((a, b) => {
    const at = a.sources[0]?.bracket_slot ?? 999;
    const bt = b.sources[0]?.bracket_slot ?? 999;
    return at - bt;
  });

  for (const m of noNext) {
    pairs.push({ sources: [m], dest: null });
  }

  return pairs;
}

function MatchCard({ match }: { match: BracketMatch }) {
  const isCompleted = match.status === "completed";
  const isLive = match.status === "live";
  const home = match.team_home;
  const away = match.team_away;
  const homeWon = isCompleted && match.winner_team_id === home?.id;
  const awayWon = isCompleted && match.winner_team_id === away?.id;

  return (
    <div
      className={`rounded-xl border bg-card p-3 w-full ${
        isLive ? "border-green-500/60" : "border-border/60"
      }`}
    >
      <p className="text-xs text-muted-foreground mb-2.5 flex items-center gap-2">
        <span>{formatKickoff(match.kickoff_time)} AST</span>
        {isLive && (
          <span className="text-green-500 font-semibold animate-pulse">
            LIVE
          </span>
        )}
        {isCompleted && <span>FT</span>}
      </p>

      <div
        className={`flex items-center justify-between gap-1 mb-2 ${
          homeWon ? "font-semibold" : awayWon ? "opacity-40" : ""
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{home?.flag_emoji ?? "🏳️"}</span>
          <span className="text-sm truncate">{home?.name ?? "TBD"}</span>
        </span>
        {(isCompleted || isLive) && (
          <span className="tabular-nums font-bold text-sm shrink-0">
            {match.home_score ?? "-"}
          </span>
        )}
      </div>

      <div
        className={`flex items-center justify-between gap-1 ${
          awayWon ? "font-semibold" : homeWon ? "opacity-40" : ""
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{away?.flag_emoji ?? "🏳️"}</span>
          <span className="text-sm truncate">{away?.name ?? "TBD"}</span>
        </span>
        {(isCompleted || isLive) && (
          <span className="tabular-nums font-bold text-sm shrink-0">
            {match.away_score ?? "-"}
          </span>
        )}
      </div>
    </div>
  );
}

function PairRow({ pair }: { pair: BracketPair }) {
  const showBracket = pair.sources.length === 2 && pair.dest !== null;

  if (!showBracket) {
    return (
      <div className="space-y-3 mb-6">
        {pair.sources.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-stretch mb-6">
      {/* Source matches — 55% */}
      <div className="flex flex-col gap-3 min-w-0" style={{ flex: "11 1 0%" }}>
        {pair.sources.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>

      {/* Bracket connector lines */}
      <div className="w-6 shrink-0 flex flex-col">
        <div className="flex-1 border-r-2 border-b-2 border-border/40 rounded-br-xl" />
        <div className="flex-1 border-r-2 border-t-2 border-border/40 rounded-tr-xl" />
      </div>

      {/* Destination match (next round preview) — 45%, vertically centered */}
      <div className="flex items-center min-w-0" style={{ flex: "9 1 0%" }}>
        <MatchCard match={pair.dest!} />
      </div>
    </div>
  );
}

export function BracketView({ matches }: { matches: BracketMatch[] }) {
  const byRound = useMemo(() => groupByRound(matches), [matches]);
  const defaultRound = useMemo(() => getDefaultRound(byRound), [byRound]);
  const [activeRound, setActiveRound] = useState<RoundKey>(defaultRound);

  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = tabBarRef.current;
    const activeEl = tabRefs.current[activeRound];
    if (!container || !activeEl) return;
    const targetScroll =
      activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
    container.scrollTo({ left: targetScroll, behavior: "smooth" });
  }, [activeRound]);

  const roundIdx = ROUNDS.indexOf(activeRound);
  const currentMatches = byRound[activeRound];
  const nextRoundKey =
    roundIdx < ROUNDS.length - 1 ? ROUNDS[roundIdx + 1] : undefined;
  const nextMatches = nextRoundKey ? byRound[nextRoundKey] : [];
  const nextMatchById = useMemo(
    () => new Map(nextMatches.map((m) => [m.id, m])),
    [nextMatches]
  );

  const pairs = useMemo(
    () => buildPairs(currentMatches, nextMatchById),
    [currentMatches, nextMatchById]
  );

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Only fire if swipe is clearly horizontal (not a diagonal scroll)
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && roundIdx < ROUNDS.length - 1) setActiveRound(ROUNDS[roundIdx + 1]);
    if (dx > 0 && roundIdx > 0) setActiveRound(ROUNDS[roundIdx - 1]);
  }

  return (
    <div>
      {/* Tab bar — pill/chip style, auto-scrolls active tab into center */}
      <div ref={tabBarRef} className="flex overflow-x-auto gap-2 mb-5 pb-1">
        {ROUNDS.map((r) => (
          <button
            key={r}
            ref={(el) => { tabRefs.current[r] = el; }}
            onClick={() => setActiveRound(r)}
            className={[
              "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors",
              r === activeRound
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {ROUND_SHORT[r]}
          </button>
        ))}
      </div>

      {/* Round content — swipe left/right to navigate rounds */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {currentMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No matches scheduled yet.
          </p>
        ) : (
          <div>
            {pairs.map((pair, i) => (
              <PairRow key={i} pair={pair} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
