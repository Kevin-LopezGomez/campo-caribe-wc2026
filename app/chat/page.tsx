import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppNav } from "@/components/app-nav";
import { ChatClient, type ChatMessageWithProfile } from "@/components/chat-client";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const [profileRes, messagesRes] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, role, company")
      .eq("id", user.id)
      .single(),
    admin
      .from("chat_messages")
      .select("id, user_id, message, created_at, deleted_at, profile:user_id(full_name, company)")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  const profile = profileRes.data;
  const isAdmin = ["admin", "dev"].includes(profile?.role ?? "");
  const isDev = profile?.role === "dev";

  // Mark visit (fire-and-forget on server)
  await supabase
    .from("profiles")
    .update({ last_chat_visit_at: new Date().toISOString() } as never)
    .eq("id", user.id);

  const messages = (messagesRes.data ?? []) as unknown as ChatMessageWithProfile[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <ChatClient
        initialMessages={messages}
        currentUserId={user.id}
        isAdmin={isAdmin}
        isDev={isDev}
      />
    </div>
  );
}
