"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, deleteMessage, restoreMessage } from "@/app/chat/actions";

export type ChatMessageWithProfile = {
  id: string;
  user_id: string;
  message: string;
  image_url: string | null;
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
  tick: number;
}) {
  const [hovered, setHovered] = useState(false);
  const isDeleted = !!msg.deleted_at;
  const firstName = getFirstName(msg.profile?.full_name ?? "");
  const company = msg.profile?.company ?? null;

  void tick;

  return (
    <div
      className={`group relative px-4 ${grouped ? "pt-0.5" : "pt-3"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!grouped && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <CompanyLogo company={company} />
          <span className="text-xs font-semibold text-foreground">{firstName}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{relativeTime(msg.created_at)}</span>
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="w-4 shrink-0" />
        <div className={`flex-1 min-w-0 ${isDeleted ? "text-muted-foreground italic" : "text-foreground"}`}>
          {isDeleted ? (
            <p className="text-sm leading-snug">[Message removed]</p>
          ) : (
            <>
              {msg.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.image_url}
                  alt="Shared image"
                  className="max-h-64 max-w-xs rounded-lg object-contain mb-1 cursor-pointer"
                  onClick={() => window.open(msg.image_url!, "_blank")}
                />
              )}
              {msg.message && (
                <p className="text-sm leading-snug">{msg.message}</p>
              )}
            </>
          )}
        </div>

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
  isAdmin,
  isDev,
}: {
  initialMessages: ChatMessageWithProfile[];
  isAdmin: boolean;
  isDev: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [tick, setTick] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNearBottomRef = useRef(true);

  const supabase = createClient();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 80;
    if (isNearBottomRef.current) setHasNewMessages(false);
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasNewMessages(false);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("chat_messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const { data: row } = await supabase
            .from("chat_messages")
            .select("id, user_id, message, image_url, created_at, deleted_at")
            .eq("id", payload.new.id)
            .single();
          if (!row) return;
          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name, company")
            .eq("id", row.user_id)
            .single();
          const msg: ChatMessageWithProfile = { ...row, profile: sender ?? null };
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

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSendError("Image must be under 5 MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setSendError(null);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSend() {
    const text = input.trim();
    if (!text && !imageFile) return;
    if (isPending || isUploading) return;
    setSendError(null);

    let imageUrl: string | undefined;

    if (imageFile) {
      setIsUploading(true);
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("chat-images")
        .upload(path, imageFile, { contentType: imageFile.type });
      setIsUploading(false);
      if (uploadErr) {
        setSendError("Failed to upload image. Try again.");
        return;
      }
      const { data: { publicUrl } } = supabase.storage
        .from("chat-images")
        .getPublicUrl(path);
      imageUrl = publicUrl;
    }

    startTransition(async () => {
      const result = await sendMessage(text, imageUrl);
      if (result.error) {
        setSendError(result.error);
      } else {
        setInput("");
        clearImage();
        if (inputRef.current) inputRef.current.style.height = "auto";
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

  function handleRestore(id: string) {
    startTransition(async () => { await restoreMessage(id); });
  }

  const charCount = input.length;
  const overLimit = charCount > 500;
  const canSend = (input.trim().length > 0 || imageFile !== null) && !overLimit && !isPending && !isUploading;

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

      <div className="border-t border-border bg-background px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {sendError && (
          <p className="text-xs text-destructive mb-1.5 px-1">{sendError}</p>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div className="relative mb-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg object-contain" />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-muted border border-border text-foreground text-xs flex items-center justify-center hover:bg-muted-foreground/20"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isPending || isUploading}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-40"
            title="Share image"
            aria-label="Share image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSendError(null);
                autoResize(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder={imageFile ? "Add a caption… (optional)" : "Message the group…"}
              rows={1}
              className={`w-full resize-none rounded-lg border px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                overLimit ? "border-destructive focus:ring-destructive/30" : "border-input focus:ring-primary/30"
              }`}
              style={{ maxHeight: "160px", overflowY: "auto", fontSize: "16px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 transition-opacity min-h-[38px]"
          >
            {isPending || isUploading ? "…" : "Send"}
          </button>
        </div>
        <div className={`text-right text-xs mt-1 ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {charCount} / 500
        </div>
      </div>
    </div>
  );
}
