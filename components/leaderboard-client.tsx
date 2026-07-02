"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRole } from "@/lib/types/database";

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  full_name: string;
  total_points: number;
  is_test: boolean;
  role: UserRole;
  rod_flag: string | null;
  rod_name: string | null;
  company: string | null;
  score_events: Array<{ points: number; reason: string; created_at: string; flag_emoji?: string }>;
};

const COMPANY_LOGO: Record<string, { src: string; alt: string }> = {
  "Campo Caribe": { src: "/logo.png", alt: "Campo Caribe" },
  "Hawaii Farming": { src: "/hawaii-farming-logo.avif", alt: "Hawaii Farming" },
};

export function LeaderboardClient({
  rows,
  currentUserId,
  canSeeTestUsers,
  rodRevealed,
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
  canSeeTestUsers: boolean;
  rodRevealed: boolean;
}) {
  const [includeTest, setIncludeTest] = useState(false);
  const [selected, setSelected] = useState<LeaderboardRow | null>(null);

  const visible = canSeeTestUsers && includeTest
    ? rows
    : rows.filter((r) => !r.is_test);

  return (
    <div className="space-y-4">
      {canSeeTestUsers && (
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={includeTest}
            onChange={(e) => setIncludeTest(e.target.checked)}
            className="rounded"
          />
          Include test users
        </label>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2 w-12">#</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-right px-4 py-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const isMe = row.user_id === currentUserId;
              return (
                <tr
                  key={row.user_id}
                  onClick={() => setSelected(row)}
                  className={`border-t border-border cursor-pointer hover:bg-muted/30 transition-colors ${
                    isMe ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {row.rank}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {row.company && COMPANY_LOGO[row.company] && (
                        <Image
                          src={COMPANY_LOGO[row.company].src}
                          alt={COMPANY_LOGO[row.company].alt}
                          width={20}
                          height={20}
                          className="rounded-sm shrink-0 object-contain"
                        />
                      )}
                      {rodRevealed && row.rod_flag && (
                        <span className="text-base shrink-0">{row.rod_flag}</span>
                      )}
                      <span>
                        <span className="font-medium">{row.full_name}</span>
                        {isMe && (
                          <span className="ml-2 text-xs text-primary font-semibold">you</span>
                        )}
                        {row.is_test && (
                          <span className="ml-2 text-xs text-muted-foreground">[test]</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {row.total_points}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No participants yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Score breakdown dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex gap-6 text-sm">
                <span>Rank: <strong>#{selected.rank}</strong></span>
                <span>Total: <strong>{selected.total_points} pts</strong></span>
              </div>
              {rodRevealed && selected.rod_flag && (
                <p className="text-sm">
                  Ride or Die: {selected.rod_flag} {selected.rod_name}
                </p>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Score breakdown</p>
                {selected.score_events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No points yet</p>
                ) : (
                  <div className="space-y-0.5 text-xs max-h-64 overflow-y-auto">
                    {selected.score_events.map((e, i) => {
                      const isRod = e.reason.startsWith("Ride or Die") || e.reason.startsWith("Loyalty bonus");
                      return (
                        <div key={i} className="flex gap-3">
                          <span className="font-mono text-green-600 w-8 text-right shrink-0">
                            +{e.points}
                          </span>
                          <span className="text-muted-foreground">
                            {!isRod && e.flag_emoji && <span className="mr-1">{e.flag_emoji}</span>}
                            {e.reason}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
