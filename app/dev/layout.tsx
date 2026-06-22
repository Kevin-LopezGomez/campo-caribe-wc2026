import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

async function DevGuard({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "dev") redirect("/");

  return <>{children}</>;
}

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNav />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        <Suspense>
          <DevGuard>{children}</DevGuard>
        </Suspense>
      </main>
    </div>
  );
}
