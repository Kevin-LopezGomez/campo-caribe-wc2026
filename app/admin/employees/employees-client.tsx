"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type EmployeeRow = {
  id: string;
  employee_id: string;
  full_name: string;
  job_title: string | null;
  home_department: string | null;
  division: string | null;
  is_registered: boolean;
  access_key: string;
};

function deptDisplay(e: EmployeeRow) {
  if (!e.home_department && !e.division) return "—";
  if (!e.division || e.home_department === e.division) return e.home_department ?? e.division ?? "—";
  return `${e.home_department} / ${e.division}`;
}

export function AdminEmployeesClient({ employees }: { employees: EmployeeRow[] }) {
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = employees.filter((e) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name or Associate ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
          autoComplete="off"
        />
        <span className="text-xs text-muted-foreground shrink-0">
          {filtered.length} of {employees.length}
        </span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">
                Associate ID
              </th>
              <th className="text-left px-3 py-2 font-medium hidden md:table-cell">
                Job Title
              </th>
              <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">
                Dept / Division
              </th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Access Key</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No employees match your search.
                </td>
              </tr>
            ) : (
              filtered.map((e, i) => (
                <tr
                  key={e.id}
                  className={i < filtered.length - 1 ? "border-b border-border" : ""}
                >
                  <td className="px-3 py-2 font-medium">{e.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                    {e.employee_id}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                    {e.job_title ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">
                    {deptDisplay(e)}
                  </td>
                  <td className="px-3 py-2">
                    {e.is_registered ? (
                      <Badge variant="default" className="text-xs">
                        Registered
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Not yet
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums">
                        {revealed.has(e.id) ? e.access_key : "••••••"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => toggleReveal(e.id)}
                      >
                        {revealed.has(e.id) ? "Hide" : "Show"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
