"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendMessage(message: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const trimmed = message.trim();
  if (!trimmed) return { error: "Message cannot be empty." };
  if (trimmed.length > 500) return { error: "Message too long." };

  const admin = createAdminClient();

  // Rate limit: max 5 messages per 60 seconds
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= 5) {
    return { error: "Slow down — you're posting too fast." };
  }

  // Server-side profanity filter
  const { data: setting } = await admin
    .from("settings")
    .select("value")
    .eq("key", "profanity_filter")
    .maybeSingle();
  const wordList = (setting?.value as string[] | null) ?? [];
  const lower = trimmed.toLowerCase();
  for (const word of wordList) {
    const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, "i");
    if (regex.test(lower)) {
      return { error: "Message contains inappropriate content." };
    }
  }

  const { error } = await supabase
    .from("chat_messages")
    .insert({ user_id: user.id, message: trimmed });

  if (error) return { error: error.message };
  return {};
}

export async function deleteMessage(messageId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "dev"].includes(profile.role)) {
    return { error: "Unauthorized." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { error: error.message };
  return {};
}

export async function restoreMessage(messageId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "dev") {
    return { error: "Unauthorized." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_messages")
    .update({ deleted_at: null })
    .eq("id", messageId);

  if (error) return { error: error.message };
  return {};
}

export async function updateLastChatVisit(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ last_chat_visit_at: new Date().toISOString() } as never)
    .eq("id", user.id);
}

export async function updateProfanityFilter(words: string[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "dev") return { error: "Unauthorized." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert({ key: "profanity_filter", value: words as never });

  if (error) return { error: error.message };
  return {};
}
