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
import { updateTeam } from "./actions";

const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export function AdminTeamsClient({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const byGroup = GROUP_LETTERS.reduce<Record<string, Team[]>>((acc, g) => {
    acc[g] = teams.filter((t) => t.group_letter === g);
    return acc;
  }, {});

  function handleEdit(team: Team) {
    setError(undefined);
    setEditTeam({ ...team });
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTeam) return;
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateTeam(editTeam.id, {
        name: fd.get("name") as string,
        country_code: fd.get("country_code") as string,
        flag_emoji: fd.get("flag_emoji") as string,
        group_letter: fd.get("group_letter") as string,
        is_top_20: fd.get("is_top_20") === "true",
        eliminated: fd.get("eliminated") === "true",
      });
      if (result.error) {
        setError(result.error);
      } else {
        setEditTeam(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="space-y-6">
        {GROUP_LETTERS.map((g) => {
          const groupTeams = byGroup[g];
          if (!groupTeams || groupTeams.length === 0) return null;
          return (
            <div key={g}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                Group {g}
              </h2>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-3 py-2 font-medium">Team</th>
                      <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">
                        Code
                      </th>
                      <th className="text-left px-3 py-2 font-medium hidden md:table-cell">
                        Status
                      </th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupTeams.map((team, i) => (
                      <tr
                        key={team.id}
                        className={
                          i < groupTeams.length - 1
                            ? "border-b border-border"
                            : ""
                        }
                      >
                        <td className="px-3 py-2">
                          <span className="mr-2">{team.flag_emoji}</span>
                          <span
                            className={
                              team.eliminated
                                ? "line-through text-muted-foreground"
                                : ""
                            }
                          >
                            {team.name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                          {team.country_code}
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {team.is_top_20 && (
                              <Badge variant="secondary" className="text-xs">
                                Top 20
                              </Badge>
                            )}
                            {!team.is_top_20 && (
                              <Badge variant="outline" className="text-xs">
                                Cinderella
                              </Badge>
                            )}
                            {team.eliminated && (
                              <Badge variant="destructive" className="text-xs">
                                Out
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(team)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTeam} onOpenChange={(open) => !open && setEditTeam(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {editTeam?.flag_emoji} {editTeam?.name}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          {editTeam && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="name">Team name</Label>
                  <Input id="name" name="name" defaultValue={editTeam.name} required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="country_code">Code (3-letter)</Label>
                  <Input
                    id="country_code"
                    name="country_code"
                    defaultValue={editTeam.country_code}
                    maxLength={3}
                    minLength={3}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flag_emoji">Flag emoji</Label>
                  <Input
                    id="flag_emoji"
                    name="flag_emoji"
                    defaultValue={editTeam.flag_emoji}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="group_letter">Group</Label>
                  <select
                    id="group_letter"
                    name="group_letter"
                    defaultValue={editTeam.group_letter ?? ""}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    {GROUP_LETTERS.map((g) => (
                      <option key={g} value={g}>
                        Group {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="is_top_20">FIFA ranking</Label>
                  <select
                    id="is_top_20"
                    name="is_top_20"
                    defaultValue={editTeam.is_top_20 ? "true" : "false"}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="true">Top 20 (not Cinderella)</option>
                    <option value="false">Cinderella eligible</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="eliminated">Tournament status</Label>
                  <select
                    id="eliminated"
                    name="eliminated"
                    defaultValue={editTeam.eliminated ? "true" : "false"}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="false">Still in tournament</option>
                    <option value="true">Eliminated</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditTeam(null)}
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
    </>
  );
}
