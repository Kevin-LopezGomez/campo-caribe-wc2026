"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/logout-button";

const BASE_LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/farm-vs-farm", label: "Farm vs Farm" },
  { href: "/chat", label: "Chat" },
  { href: "/bracket", label: "Bracket" },
  { href: "/ride-or-die", label: "Ride or Die" },
  { href: "/predictor", label: "Predictor" },
] as const;

const ADMIN_LINKS = [
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/chat", label: "Chat Mod" },
] as const;

const DEV_LINKS = [{ href: "/dev", label: "Dev" }] as const;

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={[
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground font-semibold"
          : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        setRole((session?.user?.user_metadata?.role as string) ?? null);
        setCompany((session?.user?.user_metadata?.company as string) ?? null);
      });
  }, []);

  const isAdmin = role === "admin" || role === "dev";
  const isCCDev = role === "dev" && company === "Campo Caribe";

  const allLinks = [
    ...BASE_LINKS,
    ...(isAdmin ? ADMIN_LINKS : []),
    ...(isCCDev ? DEV_LINKS : []),
  ];

  return (
    <nav className="w-full border-b border-border">
      <div className="max-w-5xl mx-auto px-5">
        {/* Row 1: logo + name on left, desktop links + logout on right */}
        <div className="flex justify-between items-center py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/farm-cup-trophy.png" alt="The Farm Cup 2026" width={28} height={35} className="shrink-0 object-contain" />
            <span className="font-bold text-lg">
              <span className="hidden lg:inline">The </span>Farm Cup 2026
            </span>
          </Link>
          {/* Desktop: pill nav links + logout inline */}
          <div className="hidden md:flex shrink-0 items-center gap-2">
            {allLinks.map(({ href, label }) => (
              <NavLink key={href} href={href} label={label} pathname={pathname} />
            ))}
            <LogoutButton />
          </div>
          {/* Mobile: just logout */}
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </div>
        {/* Row 2: mobile pill nav links — scrollable with right-side fade mask */}
        <div
          className="flex md:hidden overflow-x-auto gap-2 pb-3"
          style={{ maskImage: "linear-gradient(to right, black 85%, transparent)" }}
        >
          {allLinks.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} pathname={pathname} />
          ))}
        </div>
      </div>
    </nav>
  );
}
