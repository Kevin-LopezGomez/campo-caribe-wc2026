import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

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
      <nav className="w-full border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center gap-4 p-4 px-5">
          <Link href="/" className="font-bold text-base hover:opacity-80 transition-opacity">
            ⚽ Campo Caribe
          </Link>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-semibold">🔧 Dev</span>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        <Suspense>
          <DevGuard>{children}</DevGuard>
        </Suspense>
      </main>
    </div>
  );
}
