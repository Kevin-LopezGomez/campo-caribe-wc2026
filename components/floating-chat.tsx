"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, deleteMessage, updateLastChatVisit } from "@/app/chat/actions";
import type { ChatMessageWithProfile } from "@/components/chat-client";

const COMPANY_LOGO: Record<string, { src: string; alt: string }> = {
  "Campo Caribe":   { src: "/logo.png",                 alt: "Campo Caribe" },
  "Hawaii Farming": { src: "/hawaii-farming-logo.avif", alt: "Hawaii Farming" },
};

function getFirstName(fullName: string): string {
  if (!fullName) return "?";
  if (fullName.includes(",")) return fullName.split(",")[1]?.trim().split(" ")[0] ?? fullName;
  return fullName.split(" ")[0];
}

function relativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(ts));
}

export function FloatingChat() {
  const pathname = usePathname();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([]);
  const [unread, setUnread] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [tick, setTick] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const isOpenRef = useRef(false);

  void tick;

  // Tick every 30s so relative timestamps stay fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // On mount: check auth, load profile (role + last visit) and messages
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, msgRes] = await Promise.all([
        supabase.from("profiles")
          .select("role, last_chat_visit_at")
          .eq("id", user.id)
          .single(),
        supabase.from("chat_messages")
          .select("id, user_id, message, created_at, deleted_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(100),
      ]);

      const profile = profileRes.data;
      if (profile) {
        setIsAdmin(["admin", "dev"].includes(profile.role ?? ""));
        const msgs = msgRes.data ?? [];
        if (profile.last_chat_visit_at) {
          const lastVisit = new Date(profile.last_chat_visit_at).getTime();
          setUnread(msgs.filter((m) => new Date(m.created_at).getTime() > lastVisit).length);
        } else {
          setUnread(msgs.length);
        }
      }

      const msgs = msgRes.data ?? [];
      const userIds = [...new Set(msgs.map((m) => m.user_id))];
      const profileMap = new Map<string, { full_name: string; company: string | null }>();
      if (userIds.length > 0) {
        const { data: senders } = await supabase
          .from("profiles").select("id, full_name, company").in("id", userIds);
        for (const p of senders ?? []) profileMap.set(p.id, { full_name: p.full_name, company: p.company });
      }

      setMessages(msgs.map((m) => ({ ...m, profile: profileMap.get(m.user_id) ?? null })));
      setReady(true);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription — always active so unread badge stays accurate
  useEffect(() => {
    if (!ready) return;
    const channel = supabase
      .channel("floating_chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const { data: row } = await supabase
            .from("chat_messages")
            .select("id, user_id, message, created_at, deleted_at")
            .eq("id", payload.new.id)
            .single();
          if (!row) return;
          const { data: sender } = await supabase
            .from("profiles").select("full_name, company").eq("id", row.user_id).single();
          const msg: ChatMessageWithProfile = { ...row, profile: sender ?? null };
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (!isOpenRef.current) {
            setUnread((n) => n + 1);
          } else if (isNearBottomRef.current) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          } else {
            setHasNewMessages(true);
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id
                ? { ...m, deleted_at: payload.new.deleted_at as string | null }
                : m
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isNearBottomRef.current) setHasNewMessages(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessages(false);
  }, []);

  function openChat() {
    isOpenRef.current = true;
    setIsOpen(true);
    setUnread(0);
    setHasNewMessages(false);
    updateLastChatVisit();
    setTimeout(() => bottomRef.current?.scrollIntoView(), 60);
  }

  function closeChat() {
    isOpenRef.current = false;
    setIsOpen(false);
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleSend() {
    const text = input.trim();
    if (!text || text.length > 500 || isPending) return;
    setSendError(null);
    startTransition(async () => {
      const result = await sendMessage(text);
      if (result.error) {
        setSendError(result.error);
      } else {
        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteMessage(id); });
  }

  function isGrouped(i: number): boolean {
    if (i === 0) return false;
    const prev = messages[i - 1];
    const curr = messages[i];
    if (prev.user_id !== curr.user_id) return false;
    return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() < 60_000;
  }

  const charCount = input.length;
  const overLimit = charCount > 500;
  const canSend = input.trim().length > 0 && !overLimit && !isPending;

  // Hide on dedicated chat page and for unauthenticated users (ready never true)
  if (pathname === "/chat" || !ready) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start">
      {/* Chat panel */}
      {isOpen && (
        <div
          className="mb-3 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          style={{ width: "min(320px, calc(100vw - 2rem))", height: "420px" }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
            <span className="text-sm font-semibold">Group Chat</span>
            <button
              onClick={closeChat}
              className="pb-0.5 text-xl leading-none text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          {/* Message list */}
          <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-2">
            {messages.length === 0 && (
              <p className="mt-8 text-center text-xs text-muted-foreground">
                No messages yet. Say something!
              </p>
            )}
            {messages.map((msg, i) => {
              const grouped = isGrouped(i);
              const isDeleted = !!msg.deleted_at;
              const firstName = getFirstName(msg.profile?.full_name ?? "");
              const logo = msg.profile?.company ? COMPANY_LOGO[msg.profile.company] : null;
              return (
                <div key={msg.id} className={`group px-3 ${grouped ? "pt-0.5" : "pt-2.5"}`}>
                  {!grouped && (
                    <div className="mb-0.5 flex items-center gap-1.5">
                      {logo ? (
                        <Image
                          src={logo.src}
                          alt={logo.alt}
                          width={14}
                          height={14}
                          className="shrink-0 rounded-sm object-contain"
                        />
                      ) : (
                        <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full bg-muted-foreground/30" />
                      )}
                      <span className="text-xs font-semibold">{firstName}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{relativeTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-1">
                    <div className="w-3.5 shrink-0" />
                    <p
                      className={`min-w-0 flex-1 text-xs leading-snug ${
                        isDeleted ? "italic text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {isDeleted ? "[Removed]" : msg.message}
                    </p>
                    {isAdmin && !isDeleted && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="shrink-0 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        title="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} className="h-1" />
          </div>

          {/* New messages bar */}
          {hasNewMessages && (
            <div className="flex shrink-0 justify-center border-t border-border py-1.5">
              <button
                onClick={scrollToBottom}
                className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground shadow"
              >
                ↓ New messages
              </button>
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 border-t border-border px-3 pb-3 pt-2">
            {sendError && <p className="mb-1 text-xs text-destructive">{sendError}</p>}
            <div className="flex items-end gap-1.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setSendError(null);
                  autoResize(e.target);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message the group…"
                rows={1}
                className={`flex-1 resize-none rounded-lg border px-2.5 py-1.5 text-xs bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                  overLimit
                    ? "border-destructive focus:ring-destructive/30"
                    : "border-input focus:ring-primary/30"
                }`}
                style={{ maxHeight: "80px", overflowY: "auto", fontSize: "16px" }}
              />
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
              >
                {isPending ? "…" : "Send"}
              </button>
            </div>
            <div
              className={`mt-0.5 text-right text-[10px] ${
                overLimit ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {charCount} / 500
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={isOpen ? closeChat : openChat}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label={isOpen ? "Close chat" : "Open group chat"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
        {unread > 0 && (
          <span className="pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
