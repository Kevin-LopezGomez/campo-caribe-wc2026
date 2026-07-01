import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatModClient, type ModMessage } from "./chat-mod-client";

export default async function AdminChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "dev"].includes(profile.role)) redirect("/");

  const isDev = profile.role === "dev";
  const admin = createAdminClient();

  const [messagesRes, filterRes] = await Promise.all([
    admin
      .from("chat_messages")
      .select("id, user_id, message, created_at, deleted_at, profile:user_id(full_name, company)")
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("settings")
      .select("value")
      .eq("key", "profanity_filter")
      .maybeSingle(),
  ]);

  const messages = (messagesRes.data ?? []) as unknown as ModMessage[];
  const filterWords = (filterRes.data?.value as string[] | null) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Chat Moderation</h1>
      <ChatModClient messages={messages} filterWords={filterWords} isDev={isDev} />
    </div>
  );
}
