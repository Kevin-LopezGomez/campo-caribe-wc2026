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
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/lib/types/database";
import { saveRideOrDiePick } from "@/app/ride-or-die/actions";


type PickedTeam = {
  id: string;
  name: string;
  flag_emoji: string;
  country_code: string;
  is_top_20: boolean;
  eliminated: boolean;
};

export type CurrentPick = {
  id: string;
  team_id: string;
  locked: boolean;
  team: PickedTeam;
} | null;

function formatLockTime(utcIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(utcIso));
}

function TeamCard({
  team,
  isSelected,
  isLocked,
  pickCount,
  onClick,
  isQualified,
}: {
  team: Team;
  isSelected: boolean;
  isLocked: boolean;
  pickCount: number | undefined;
  onClick: () => void;
  isQualified: boolean;
}) {
  const interactive = !isLocked && !team.eliminated;

  return (
    <button
      onClick={interactive ? onClick : undefined}
      disabled={isLocked && !isSelected}
      aria-pressed={isSelected}
      className={[
        "relative w-full rounded-lg border p-3 text-left transition-all duration-150",
        interactive && !isSelected
          ? "hover:border-primary/60 hover:bg-primary/5 cursor-pointer"
          : "",
        isSelected
          ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1"
          : team.eliminated
          ? "border-red-500 bg-card ring-2 ring-red-500"
          : isQualified
          ? "border-green-500 bg-card ring-2 ring-green-500"
          : "border-border bg-card",
        isLocked && !isSelected ? "cursor-default" : "",
        team.eliminated ? "opacity-50 pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Flag + badges row */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-3xl leading-none">{team.flag_emoji}</span>
        <div className="flex flex-col items-end gap-0.5 mt-0.5">
          {!team.is_top_20 && (
            <span className="text-sm" title="Cinderella team — earns double Ride or Die points">
              🌟
            </span>
          )}
          {isSelected && (
            <span
              className="text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold"
              aria-label="Your pick"
            >
              ✓
            </span>
          )}
        </div>
      </div>

      {/* Team name */}
      <p className="text-xs font-medium leading-snug line-clamp-2">{team.name}</p>

      {/* Pick count — only after lock */}
      {isLocked && pickCount !== undefined && pickCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {pickCount} {pickCount === 1 ? "pick" : "picks"}
        </p>
      )}
    </button>
  );
}

export function RideOrDieClient({
  teams,
  currentPick,
  lockTime,
  isLocked,
  pickCounts,
  qualifiedIds,
}: {
  teams: Team[];
  currentPick: CurrentPick;
  lockTime: string | null;
  isLocked: boolean;
  pickCounts: Record<string, number>;
  qualifiedIds: string[];
}) {
  const router = useRouter();
  const [pendingTeam, setPendingTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const qualifiedSet = new Set(qualifiedIds);

  function handleTeamClick(team: Team) {
    if (isLocked || team.eliminated) return;
    if (team.id === currentPick?.team_id) return;
    setError(undefined);
    setPendingTeam(team);
  }

  function handleConfirm() {
    if (!pendingTeam) return;
    startTransition(async () => {
      const result = await saveRideOrDiePick(pendingTeam.id);
      if (result.error) {
        setError(result.error);
      } else {
        setPendingTeam(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* ── Current pick banner ── */}
      {currentPick ? (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
              Your Ride or Die
            </p>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{currentPick.team.flag_emoji}</span>
              <div>
                <p className="font-bold text-lg leading-tight">
                  {currentPick.team.name}
                </p>
                {!currentPick.team.is_top_20 && (
                  <span className="text-xs text-muted-foreground">
                    🌟 Cinderella — 2× points if they advance
                  </span>
                )}
              </div>
            </div>
          </div>
          {isLocked ? (
            <Badge variant="secondary" className="shrink-0">
              Locked
            </Badge>
          ) : (
            <p className="text-xs text-muted-foreground shrink-0 text-right">
              Click any team<br />below to change
            </p>
          )}
        </div>
      ) : !isLocked ? (
        <div className="mb-6 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          You haven't made a pick yet. Select a team below.
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
          You did not make a Ride or Die pick before the deadline.
        </div>
      )}

      {/* ── Lock time status ── */}
      <p className="text-sm text-muted-foreground mb-6">
        {isLocked ? (
          <>
            Picks are locked.{" "}
            {Object.keys(pickCounts).length > 0 &&
              "Pick counts are now visible."}
          </>
        ) : lockTime ? (
          <>
            <span>
              Picks lock on <span className="font-medium text-foreground">{formatLockTime(lockTime)} AST</span>. You can change your pick any time before then.
            </span>
            <span className="block mt-1 text-xs text-green-500 font-medium">
              Deadline extended to allow Hawaii Farming employees to register and make their picks.
            </span>
            <span className="block mt-1 text-xs text-muted-foreground">
              🌟 Cinderella team — earns 2× Ride or Die points if they advance.
            </span>
          </>
        ) : (
          "Lock time not yet set — check back soon."
        )}
      </p>

      {/* ── Legend ── */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {qualifiedSet.size > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-green-500" />
            Already qualified for the knockout rounds
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-red-500" />
          Eliminated
        </span>
        {isLocked && <span>Pick counts shown after lock</span>}
      </div>

      {/* ── Eliminated pick warning ── */}
      {currentPick && currentPick.team.eliminated && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
          ⚠️ Your current pick ({currentPick.team.flag_emoji} {currentPick.team.name}) has been eliminated. Please choose a new team.
        </div>
      )}

      {/* ── Team grid (flat A-Z) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            isSelected={team.id === currentPick?.team_id}
            isLocked={isLocked}
            pickCount={pickCounts[team.id]}
            onClick={() => handleTeamClick(team)}
            isQualified={qualifiedSet.has(team.id)}
          />
        ))}
      </div>

      {/* ── Confirmation dialog ── */}
      <Dialog
        open={!!pendingTeam}
        onOpenChange={(open) => {
          if (!open) setPendingTeam(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {currentPick ? "Change your pick?" : "Confirm your pick"}
            </DialogTitle>
          </DialogHeader>

          {pendingTeam && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-4xl">{pendingTeam.flag_emoji}</span>
                <div>
                  <p className="font-bold">{pendingTeam.name}</p>
                  {!pendingTeam.is_top_20 && (
                    <p className="text-xs text-muted-foreground">
                      🌟 Cinderella — 2× points if they advance
                    </p>
                  )}
                </div>
              </div>

              {currentPick && (
                <p className="text-sm text-muted-foreground">
                  This will replace your current pick:{" "}
                  <span className="font-medium text-foreground">
                    {currentPick.team.flag_emoji} {currentPick.team.name}
                  </span>
                </p>
              )}

              {lockTime && (
                <p className="text-xs text-muted-foreground">
                  You can change your pick until{" "}
                  <span className="font-medium">{formatLockTime(lockTime)} AST</span>.
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setPendingTeam(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirm} disabled={isPending}>
                  {isPending
                    ? "Saving…"
                    : currentPick
                    ? "Change Pick"
                    : "Lock In Pick"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
