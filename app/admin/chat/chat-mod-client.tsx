"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { deleteMessage, restoreMessage, updateProfanityFilter } from "@/app/chat/actions";

export type ModMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  deleted_at: string | null;
  profile: { full_name: string; company: string | null } | null;
};

const COMPANY_LOGO: Record<string, { src: string; alt: string }> = {
  "Campo Caribe":   { src: "/logo.png",                 alt: "Campo Caribe" },
  "Hawaii Farming": { src: "/hawaii-farming-logo.avif", alt: "Hawaii Farming" },
};

function formatTime(ts: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(ts));
}

export function ChatModClient({
  messages: initial,
  filterWords: initialWords,
  isDev,
}: {
  messages: ModMessage[];
  filterWords: string[];
  isDev: boolean;
}) {
  const [messages, setMessages] = useState<ModMessage[]>(initial);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"feed" | "users" | "filter">("feed");
  const [filterWords, setFilterWords] = useState<string[]>(initialWords);
  const [filterInput, setFilterInput] = useState(initialWords.join("\n"));
  const [filterMsg, setFilterMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.message.toLowerCase().includes(q) ||
      (m.profile?.full_name ?? "").toLowerCase().includes(q)
    );
  });

  // Per-user message counts
  const userCounts = new Map<string, { name: string; company: string | null; total: number; deleted: number }>();
  for (const m of messages) {
    const name = m.profile?.full_name ?? m.user_id;
    const company = m.profile?.company ?? null;
    const existing = userCounts.get(m.user_id) ?? { name, company, total: 0, deleted: 0 };
    existing.total++;
    if (m.deleted_at) existing.deleted++;
    userCounts.set(m.user_id, existing);
  }
  const userRows = [...userCounts.entries()]
    .map(([, v]) => v)
    .sort((a, b) => b.total - a.total);

  function handleDelete(id: string) {
    startTransition(async () => {
      const r = await deleteMessage(id);
      if (!r.error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m))
        );
      }
    });
  }

  function handleRestore(id: string) {
    startTransition(async () => {
      const r = await restoreMessage(id);
      if (!r.error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, deleted_at: null } : m))
        );
      }
    });
  }

  function handleSaveFilter() {
    const words = filterInput
      .split(/[\n,]+/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    startTransition(async () => {
      const r = await updateProfanityFilter(words);
      if (r.error) {
        setFilterMsg(`Error: ${r.error}`);
      } else {
        setFilterWords(words);
        setFilterMsg("Saved!");
        setTimeout(() => setFilterMsg(null), 2000);
      }
    });
  }

  void filterWords;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        {(["feed", "users", ...(isDev ? ["filter"] : [])] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            className={`text-sm px-3 py-1 rounded-full capitalize transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground font-semibold"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "feed" ? "Message Feed" : t === "users" ? "User Counts" : "Profanity Filter"}
          </button>
        ))}
      </div>

      {/* ── Feed tab ── */}
      {tab === "feed" && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by user or content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-muted-foreground">
            {filtered.length} message{filtered.length !== 1 ? "s" : ""} — newest first
          </p>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {filtered.map((m) => {
              const logo = m.profile?.company ? COMPANY_LOGO[m.profile.company] : null;
              const isDeleted = !!m.deleted_at;
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isDeleted
                      ? "border-border bg-muted/20 opacity-60"
                      : "border-border bg-card"
                  }`}
                >
                  {logo && (
                    <Image src={logo.src} alt={logo.alt} width={16} height={16} className="mt-0.5 shrink-0 object-contain" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold">{m.profile?.full_name ?? "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(m.created_at)}</span>
                      {isDeleted && <span className="text-xs text-destructive">[deleted]</span>}
                    </div>
                    <p className={`text-sm break-words ${isDeleted ? "italic text-muted-foreground" : ""}`}>
                      {isDeleted ? "[Message removed]" : m.message}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!isDeleted && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={isPending}
                        className="text-xs text-destructive hover:underline disabled:opacity-40"
                      >
                        Delete
                      </button>
                    )}
                    {isDeleted && isDev && (
                      <button
                        onClick={() => handleRestore(m.id)}
                        disabled={isPending}
                        className="text-xs text-green-600 hover:underline disabled:opacity-40"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── User counts tab ── */}
      {tab === "users" && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">User</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Deleted</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((r) => {
                const logo = r.company ? COMPANY_LOGO[r.company] : null;
                return (
                  <tr key={r.name} className="border-t border-border">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {logo && <Image src={logo.src} alt={logo.alt} width={14} height={14} className="object-contain shrink-0" />}
                        <span>{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.total}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-destructive">
                      {r.deleted > 0 ? r.deleted : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Filter tab (dev only) ── */}
      {tab === "filter" && isDev && (
        <div className="space-y-3 max-w-lg">
          <p className="text-sm text-muted-foreground">
            One word per line (or comma-separated). Case-insensitive, whole-word match.
          </p>
          <textarea
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            rows={12}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm font-mono bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveFilter}
              disabled={isPending}
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            {filterMsg && (
              <span className={`text-sm ${filterMsg.startsWith("Error") ? "text-destructive" : "text-green-600"}`}>
                {filterMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
