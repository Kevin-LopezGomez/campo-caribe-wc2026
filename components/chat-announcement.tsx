"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "chat_announcement_v1_seen";

export function ChatAnnouncement() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode, etc.)
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  // Don't show on the chat page itself
  if (!visible || pathname === "/chat") return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-primary text-primary-foreground rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
        <span className="text-xl shrink-0">💬</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">Chat is here!</p>
          <p className="text-xs opacity-80 leading-snug mt-0.5">
            A shared chat room for Campo Caribe &amp; Hawaii Farming.
          </p>
        </div>
        <Link
          href="/chat"
          onClick={dismiss}
          className="shrink-0 bg-primary-foreground text-primary text-xs font-semibold rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity"
        >
          Open
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity text-base leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
