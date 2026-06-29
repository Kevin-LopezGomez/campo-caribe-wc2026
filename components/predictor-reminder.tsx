"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type UnpickedMatch = {
  id: string;
  kickoff_time: string;
  team_home: { name: string; flag_emoji: string } | null;
  team_away: { name: string; flag_emoji: string } | null;
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

export function PredictorReminder() {
  const router = useRouter();
  const [unpicked, setUnpicked] = useState<UnpickedMatch[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [matchesRes, picksRes] = await Promise.all([
        supabase
          .from("matches")
          .select("id, kickoff_time, team_home:teams!team_home_id(name, flag_emoji), team_away:teams!team_away_id(name, flag_emoji)")
          .eq("status", "scheduled")
          .not("team_home_id", "is", null)
          .not("team_away_id", "is", null)
          .gt("kickoff_time", new Date().toISOString())
          .order("kickoff_time"),
        supabase
          .from("match_picks")
          .select("match_id")
          .eq("user_id", user.id),
      ]);

      const pickedIds = new Set((picksRes.data ?? []).map((p) => p.match_id));
      const unpickedMatches = (matchesRes.data ?? []).filter(
        (m) => !pickedIds.has(m.id)
      ) as unknown as UnpickedMatch[];

      if (unpickedMatches.length > 0) {
        setUnpicked(unpickedMatches);
        setOpen(true);
      }
    }

    check();
  }, []);

  if (!open) return null;

  const n = unpicked.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm flex flex-col">
        {/* Header */}
        <div className="p-5 pb-3">
          <h2 className="text-lg font-bold">
            🔮 You have {n} unpicked {n === 1 ? "match" : "matches"}!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a winner before kickoff to earn points.
          </p>
        </div>

        {/* Match list */}
        <div className="overflow-y-auto max-h-64 px-5">
          {unpicked.map((match, i) => (
            <div
              key={match.id}
              className={`flex items-center justify-between gap-3 py-2.5 ${
                i < unpicked.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {formatKickoff(match.kickoff_time)} AST
                </p>
                <p className="text-sm font-medium truncate">
                  {match.team_home?.flag_emoji} {match.team_home?.name}{" "}
                  <span className="text-muted-foreground font-normal">vs</span>{" "}
                  {match.team_away?.flag_emoji} {match.team_away?.name}
                </p>
              </div>
              <button
                onClick={() => { setOpen(false); router.push("/predictor"); }}
                className="text-xs text-primary font-medium shrink-0 hover:underline"
              >
                Pick Now →
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 pt-4">
          <Button
            className="flex-1"
            onClick={() => { setOpen(false); router.push("/predictor"); }}
          >
            Go to Predictor
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Remind me later
          </Button>
        </div>
      </div>
    </div>
  );
}
