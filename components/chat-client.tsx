"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, deleteMessage, restoreMessage } from "@/app/chat/actions";

export type ChatMessageWithProfile = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  deleted_at: string | null;
  profile: { full_name: string; company: string | null } | null;
};

const COMPANY_LOGO: Record<string, { src: string; alt: string }> = {
  "Campo Caribe":   { src: "/logo.png",                  alt: "Campo Caribe" },
  "Hawaii Farming": { src: "/hawaii-farming-logo.avif",  alt: "Hawaii Farming" },
};

function getFirstName(fullName: string): string {
  if (!fullName) return "?";
  if (fullName.includes(",")) {
    // "Last, First Middle" → take word after the comma
    return fullName.split(",")[1]?.trim().split(" ")[0] ?? fullName;
  }
  return fullName.split(" ")[0];
}

function relativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 10)  return "just now";
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(ts));
}

function CompanyLogo({ company }: { company: string | null }) {
  const logo = company ? COMPANY_LOGO[company] : null;
  if (!logo) return <span className="w-4 h-4 rounded-full bg-muted-foreground/30 inline-block shrink-0" />;
  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={16}
      height={16}
      className="rounded-sm object-contain shrink-0"
    />
  );
}

function MessageRow({
  msg,
  grouped,
  isAdmin,
  isDev,
  onDelete,
  onRestore,
  tick,
}: {
  msg: ChatMessageWithProfile;
  grouped: boolean;
  isAdmin: boolean;
  isDev: boolean;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  tick: number; // forces relative-time re-render
}) {
  const [hovered, setHovered] = useState(false);
  const isDeleted = !!msg.deleted_at;
  const firstName = getFirstName(msg.profile?.full_name ?? "");
  const company = msg.profile?.company ?? null;

  // suppress unused warning
  void tick;

  return (
    <div
      className={`group relative px-4 ${grouped ? "pt-0.5" : "pt-3"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row — hidden when grouped */}
      {!grouped && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <CompanyLogo company={company} />
          <span className="text-xs font-semibold text-foreground">{firstName}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{relativeTime(msg.created_at)}</span>
        </div>
      )}

      {/* Message body */}
      <div className="flex items-start gap-2">
        {/* Indent to align with header */}
        <div className="w-4 shrink-0" />
        <p className={`text-sm leading-snug flex-1 min-w-0 ${isDeleted ? "text-muted-foreground italic" : "text-foreground"}`}>
          {isDeleted ? "[Message removed]" : msg.message}
        </p>

        {/* Admin action buttons */}
        {isAdmin && !isDeleted && hovered && (
          <button
            onClick={() => onDelete(msg.id)}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors text-xs px-1"
            title="Delete message"
            aria-label="Delete message"
          >
            ✕
          </button>
        )}
        {isDev && isDeleted && hovered && (
          <button
            onClick={() => onRestore(msg.id)}
            className="shrink-0 text-muted-foreground hover:text-green-600 transition-colors text-xs px-1"
            title="Restore message"
            aria-label="Restore message"
          >
            ↩
          </button>
        )}
      </div>
    </div>
  );
}

export function ChatClient({
  initialMessages,
  currentUserId,
  isAdmin,
  isDev,
}: {
  initialMessages: ChatMessageWithProfile[];
  currentUserId: string;
  isAdmin: boolean;
  isDev: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [tick, setTick] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);

  const supabase = createClient();

  // Tick every 30s to refresh relative timestamps
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Track scroll position to know if user is near bottom
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 80;
    if (isNearBottomRef.current) setHasNewMessages(false);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasNewMessages(false);
    }
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("chat_messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const { data } = await supabase
            .from("chat_messages")
            .select("id, user_id, message, created_at, deleted_at, profile:user_id(full_name, company)")
            .eq("id", payload.new.id)
            .single();
          if (!data) return;
          const msg = data as unknown as ChatMessageWithProfile;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (isNearBottomRef.current) {
            setTimeout(() => scrollToBottom(true), 50);
          } else {
            setHasNewMessages(true);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
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
  }, []);

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
    startTransition(async () => {
      await deleteMessage(id);
    });
  }

  function handleRestore(id: string) {
    startTransition(async () => {
      await restoreMessage(id);
    });
  }

  const charCount = input.length;
  const overLimit = charCount > 500;
  const canSend = input.trim().length > 0 && !overLimit && !isPending;

  // Determine grouped messages: same user within 60s of previous
  function isGrouped(i: number): boolean {
    if (i === 0) return false;
    const prev = messages[i - 1];
    const curr = messages[i];
    if (prev.user_id !== curr.user_id) return false;
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 60_000;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-57px)]">
      {/* Message list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2"
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-12">
            No messages yet. Say something!
          </p>
        )}
        {messages.map((msg, i) => (
          <MessageRow
            key={msg.id}
            msg={msg}
            grouped={isGrouped(i)}
            isAdmin={isAdmin}
            isDev={isDev}
            onDelete={handleDelete}
            onRestore={handleRestore}
            tick={tick}
          />
        ))}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* "New messages" floating pill */}
      {hasNewMessages && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => scrollToBottom(true)}
            className="bg-primary text-primary-foreground text-xs px-4 py-1.5 rounded-full shadow-lg animate-bounce"
          >
            ↓ New messages
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border bg-background px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {sendError && (
          <p className="text-xs text-destructive mb-1.5 px-1">{sendError}</p>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setSendError(null); }}
              onKeyDown={handleKeyDown}
              placeholder="Message the group…"
              rows={1}
              className={`w-full resize-none rounded-lg border px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                overLimit ? "border-destructive focus:ring-destructive/30" : "border-input focus:ring-primary/30"
              }`}
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 transition-opacity min-h-[38px]"
          >
            {isPending ? "…" : "Send"}
          </button>
        </div>
        <div className={`text-right text-xs mt-1 ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {charCount} / 500
        </div>
      </div>
    </div>
  );
}
