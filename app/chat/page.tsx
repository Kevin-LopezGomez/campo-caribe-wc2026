import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppNav } from "@/components/app-nav";
import { ChatClient, type ChatMessageWithProfile } from "@/components/chat-client";

async function ChatData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // Fetch current user profile (admin client for role check) and messages
  // (user client — authenticated users have SELECT on non-deleted rows).
  const [profileRes, messagesRes] = await Promise.all([
    admin.from("profiles").select("role, company").eq("id", user.id).single(),
    supabase
      .from("chat_messages")
      .select("id, user_id, message, image_url, created_at, deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  const profile = profileRes.data;
  const isAdmin = ["admin", "dev"].includes(profile?.role ?? "");
  const isDev = profile?.role === "dev";

  // Fetch sender profiles separately (avoids PostgREST join cache issues)
  const msgData = messagesRes.data ?? [];
  const userIds = [...new Set(msgData.map((m) => m.user_id))];
  const profileMap = new Map<string, { full_name: string; company: string | null }>();
  if (userIds.length > 0) {
    const { data: senderProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, company")
      .in("id", userIds);
    for (const p of senderProfiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, company: p.company });
    }
  }

  const messages: ChatMessageWithProfile[] = msgData.map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) ?? null,
  }));

  // Mark last visit
  await supabase
    .from("profiles")
    .update({ last_chat_visit_at: new Date().toISOString() } as never)
    .eq("id", user.id);

  return (
    <ChatClient
      initialMessages={messages}
      isAdmin={isAdmin}
      isDev={isDev}
    />
  );
}

export default function ChatPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading chat…</div>}>
        <ChatData />
      </Suspense>
    </div>
  );
}
