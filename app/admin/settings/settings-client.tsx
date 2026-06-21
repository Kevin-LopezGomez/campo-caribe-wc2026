"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateRideOrDieLockTime,
  updateRegistrationOpen,
} from "./actions";

// Convert UTC ISO string → AST datetime-local input value (YYYY-MM-DDTHH:mm)
function utcIsoToAstInput(utcIso: string): string {
  const d = new Date(utcIso);
  // AST = UTC-4
  const ast = new Date(d.getTime() - 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ast.getUTCFullYear()}-${pad(ast.getUTCMonth() + 1)}-${pad(
    ast.getUTCDate()
  )}T${pad(ast.getUTCHours())}:${pad(ast.getUTCMinutes())}`;
}

function formatASTDisplay(utcIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(utcIso));
}

export function AdminSettingsClient({
  lockTime,
  registrationOpen,
}: {
  lockTime: string | null;
  registrationOpen: boolean;
}) {
  const router = useRouter();
  const [lockError, setLockError] = useState<string>();
  const [lockSuccess, setLockSuccess] = useState(false);
  const [regError, setRegError] = useState<string>();
  const [regSuccess, setRegSuccess] = useState(false);
  const [isPendingLock, startLockTransition] = useTransition();
  const [isPendingReg, startRegTransition] = useTransition();

  function handleLockSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const astValue = fd.get("lock_time") as string;
    setLockError(undefined);
    setLockSuccess(false);

    startLockTransition(async () => {
      const result = await updateRideOrDieLockTime(astValue);
      if (result.error) {
        setLockError(result.error);
      } else {
        setLockSuccess(true);
        router.refresh();
      }
    });
  }

  function handleRegSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const value = fd.get("registration_open") === "true";
    setRegError(undefined);
    setRegSuccess(false);

    startRegTransition(async () => {
      const result = await updateRegistrationOpen(value);
      if (result.error) {
        setRegError(result.error);
      } else {
        setRegSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* ── Ride or Die Lock Time ── */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="font-semibold">🎯 Ride or Die Lock Time</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            After this time, no new picks or changes are accepted.
          </p>
        </div>

        {lockTime && (
          <div className="text-sm bg-muted/40 rounded px-3 py-2">
            <span className="text-muted-foreground">Current: </span>
            <span className="font-medium">{formatASTDisplay(lockTime)} AST</span>
          </div>
        )}

        <form onSubmit={handleLockSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lock_time">New lock time (enter in AST = Puerto Rico time)</Label>
            <Input
              id="lock_time"
              name="lock_time"
              type="datetime-local"
              defaultValue={
                lockTime ? utcIsoToAstInput(lockTime) : "2026-06-28T19:00"
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter in AST (UTC-4). Default: Jun 28 at 7:00 PM AST (first R32 kickoff).
            </p>
          </div>

          {lockError && (
            <p className="text-sm text-destructive">{lockError}</p>
          )}
          {lockSuccess && (
            <p className="text-sm text-green-600">Lock time updated.</p>
          )}

          <Button type="submit" disabled={isPendingLock} size="sm">
            {isPendingLock ? "Saving…" : "Update Lock Time"}
          </Button>
        </form>
      </div>

      {/* ── Registration ── */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="font-semibold">👥 Employee Registration</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Controls whether new employees can sign up.
          </p>
        </div>

        <div className="text-sm bg-muted/40 rounded px-3 py-2">
          <span className="text-muted-foreground">Current: </span>
          <span className={`font-medium ${registrationOpen ? "text-green-600" : "text-red-500"}`}>
            {registrationOpen ? "Open" : "Closed"}
          </span>
        </div>

        <form onSubmit={handleRegSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="registration_open">Registration status</Label>
            <select
              id="registration_open"
              name="registration_open"
              defaultValue={registrationOpen ? "true" : "false"}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="true">Open — employees can sign up</option>
              <option value="false">Closed — no new signups</option>
            </select>
          </div>

          {regError && (
            <p className="text-sm text-destructive">{regError}</p>
          )}
          {regSuccess && (
            <p className="text-sm text-green-600">Registration status updated.</p>
          )}

          <Button type="submit" disabled={isPendingReg} size="sm">
            {isPendingReg ? "Saving…" : "Update Registration"}
          </Button>
        </form>
      </div>
    </div>
  );
}
