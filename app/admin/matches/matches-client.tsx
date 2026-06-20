"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/lib/types/database";
import type { AdminMatch } from "./page";
import {
  updateMatchTeams,
  enterMatchResult,
  resetMatchResult,
} from "./actions";

const ROUNDS = ["R32", "R16", "QF", "SF", "F"] as const;
const ROUND_LABELS: Record<string, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinals",
  SF: "Semifinals",
  F: "Final",
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

function toLocalDatetimeValue(iso: string) {
  // Convert UTC ISO string to value for <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live")
    return (
      <Badge className="bg-green-600 text-white text-xs">LIVE</Badge>
    );
  if (status === "completed")
    return (
      <Badge variant="secondary" className="text-xs">
        FT
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-xs">
      Scheduled
    </Badge>
  );
}

type DialogMode = "teams" | "result";

export function AdminMatchesClient({
  matches,
  teams,
}: {
  matches: AdminMatch[];
  teams: Team[];
}) {
  const router = useRouter();
  const [activeMatch, setActiveMatch] = useState<AdminMatch | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("teams");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const byRound = ROUNDS.reduce<Record<string, AdminMatch[]>>((acc, r) => {
    acc[r] = matches.filter((m) => m.round === r);
    return acc;
  }, {});

  function openTeamsDialog(match: AdminMatch) {
    setError(undefined);
    setActiveMatch(match);
    setDialogMode("teams");
  }

  function openResultDialog(match: AdminMatch) {
    setError(undefined);
    setActiveMatch(match);
    setDialogMode("result");
  }

  function handleTeamsSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeMatch) return;
    const fd = new FormData(e.currentTarget);
    const homeId = fd.get("team_home_id") as string;
    const awayId = fd.get("team_away_id") as string;
    const kickoff = fd.get("kickoff_time") as string;

    startTransition(async () => {
      const result = await updateMatchTeams(activeMatch.id, {
        team_home_id: homeId || null,
        team_away_id: awayId || null,
        // Convert local datetime string back to UTC ISO
        kickoff_time: kickoff ? new Date(kickoff).toISOString() : activeMatch.kickoff_time,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setActiveMatch(null);
        router.refresh();
      }
    });
  }

  function handleResultSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeMatch) return;
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await enterMatchResult(activeMatch.id, {
        winner_team_id: fd.get("winner_team_id") as string,
        home_score: Number(fd.get("home_score")),
        away_score: Number(fd.get("away_score")),
        status: fd.get("status") as "live" | "completed",
      });
      if (result.error) {
        setError(result.error);
      } else {
        setActiveMatch(null);
        router.refresh();
      }
    });
  }

  function handleReset(matchId: string) {
    startTransition(async () => {
      await resetMatchResult(matchId);
      router.refresh();
    });
  }

  const homeTeam = activeMatch?.team_home;
  const awayTeam = activeMatch?.team_away;

  return (
    <>
      <div className="space-y-8">
        {ROUNDS.map((round) => {
          const roundMatches = byRound[round];
          if (!roundMatches || roundMatches.length === 0) return null;
          return (
            <div key={round}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {ROUND_LABELS[round]}
              </h2>
              <div className="space-y-2">
                {roundMatches.map((match) => {
                  const home = match.team_home;
                  const away = match.team_away;
                  const isCompleted = match.status === "completed";
                  const hasTeams = !!(home && away);

                  return (
                    <div
                      key={match.id}
                      className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      {/* Match info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {home ? (
                            <>
                              <span>{home.flag_emoji}</span>{" "}
                              <span
                                className={
                                  isCompleted &&
                                  match.winner_team_id === home.id
                                    ? "font-bold"
                                    : ""
                                }
                              >
                                {home.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">TBD</span>
                          )}
                          <span className="text-muted-foreground mx-2">vs</span>
                          {away ? (
                            <>
                              <span>{away.flag_emoji}</span>{" "}
                              <span
                                className={
                                  isCompleted &&
                                  match.winner_team_id === away.id
                                    ? "font-bold"
                                    : ""
                                }
                              >
                                {away.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">TBD</span>
                          )}
                          {isCompleted && (
                            <span className="ml-2 text-muted-foreground font-normal">
                              ({match.home_score}–{match.away_score})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatKickoff(match.kickoff_time)} AST
                          </span>
                          <StatusBadge status={match.status} />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTeamsDialog(match)}
                        >
                          {hasTeams ? "Edit Teams" : "Set Teams"}
                        </Button>
                        {hasTeams && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openResultDialog(match)}
                          >
                            {isCompleted ? "Edit Score" : "Enter Score"}
                          </Button>
                        )}
                        {isCompleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReset(match.id)}
                            disabled={isPending}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Set Teams dialog ── */}
      <Dialog
        open={!!(activeMatch && dialogMode === "teams")}
        onOpenChange={(open) => !open && setActiveMatch(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Teams — {activeMatch ? ROUND_LABELS[activeMatch.round] : ""}</DialogTitle>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          {activeMatch && (
            <form onSubmit={handleTeamsSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="team_home_id">Home team</Label>
                <select
                  id="team_home_id"
                  name="team_home_id"
                  defaultValue={activeMatch.team_home?.id ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">— TBD —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.flag_emoji} {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team_away_id">Away team</Label>
                <select
                  id="team_away_id"
                  name="team_away_id"
                  defaultValue={activeMatch.team_away?.id ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">— TBD —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.flag_emoji} {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="kickoff_time">Kickoff time (your local time)</Label>
                <Input
                  id="kickoff_time"
                  name="kickoff_time"
                  type="datetime-local"
                  defaultValue={toLocalDatetimeValue(activeMatch.kickoff_time)}
                />
                <p className="text-xs text-muted-foreground">
                  Current: {formatKickoff(activeMatch.kickoff_time)} AST
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveMatch(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Enter Score dialog ── */}
      <Dialog
        open={!!(activeMatch && dialogMode === "result")}
        onOpenChange={(open) => !open && setActiveMatch(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Enter Score —{" "}
              {homeTeam?.flag_emoji} {homeTeam?.name ?? "TBD"} vs{" "}
              {awayTeam?.flag_emoji} {awayTeam?.name ?? "TBD"}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          {activeMatch && homeTeam && awayTeam && (
            <form onSubmit={handleResultSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    {homeTeam.flag_emoji} {homeTeam.name}
                  </Label>
                  <Input
                    name="home_score"
                    type="number"
                    min="0"
                    max="30"
                    defaultValue={activeMatch.home_score ?? 0}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {awayTeam.flag_emoji} {awayTeam.name}
                  </Label>
                  <Input
                    name="away_score"
                    type="number"
                    min="0"
                    max="30"
                    defaultValue={activeMatch.away_score ?? 0}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="winner_team_id">
                  Winner (use for penalty shootout)
                </Label>
                <select
                  id="winner_team_id"
                  name="winner_team_id"
                  defaultValue={activeMatch.winner_team_id ?? homeTeam.id}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value={homeTeam.id}>
                    {homeTeam.flag_emoji} {homeTeam.name}
                  </option>
                  <option value={awayTeam.id}>
                    {awayTeam.flag_emoji} {awayTeam.name}
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={
                    activeMatch.status === "completed" ? "completed" : "live"
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value="live">Live / In progress</option>
                  <option value="completed">Full time (completed)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveMatch(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Save Score"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
