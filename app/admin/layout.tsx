import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

async function AdminGuard({ children }: { children: React.ReactNode }) {
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
  if (!profile || !["admin", "dev"].includes(profile.role)) redirect("/");

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="w-full border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center gap-4 p-4 px-5">
          <Link
            href="/"
            className="font-bold text-base hover:opacity-80 transition-opacity"
          >
            ⚽ Campo Caribe
          </Link>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-semibold">Admin</span>

          <div className="flex items-center gap-4 ml-4">
            <Link
              href="/admin/teams"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Teams
            </Link>
            <Link
              href="/admin/matches"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Matches
            </Link>
            <Link
              href="/admin/settings"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
          </div>

          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        <Suspense>
          <AdminGuard>{children}</AdminGuard>
        </Suspense>
      </main>
    </div>
  );
}
