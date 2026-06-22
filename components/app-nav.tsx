"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const NAV_LINKS = [
  { href: "/bracket", label: "Bracket" },
  { href: "/ride-or-die", label: "Ride or Die" },
  { href: "/predictor", label: "Predictor" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={[
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground font-semibold"
          : "bg-muted text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b border-border">
      <div className="max-w-5xl mx-auto px-5">
        {/* Row 1: logo + name on left, desktop links + logout on right */}
        <div className="flex justify-between items-center py-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Campo Caribe" width={32} height={32} className="shrink-0" />
            <span className="font-bold text-lg">Campo Caribe WC2026</span>
          </Link>
          {/* Desktop: pill nav links + logout inline */}
          <div className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map(({ href, label }) => (
              <NavLink key={href} href={href} label={label} pathname={pathname} />
            ))}
            <LogoutButton />
          </div>
          {/* Mobile: just logout */}
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </div>
        {/* Row 2: mobile pill nav links — scrollable, hidden on desktop */}
        <div className="flex md:hidden overflow-x-auto gap-2 pb-3">
          {NAV_LINKS.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} pathname={pathname} />
          ))}
        </div>
      </div>
    </nav>
  );
}
