"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const ADMIN_LINKS = [
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/employees", label: "Employees" },
] as const;

function AdminNavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
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

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b border-border">
      <div className="max-w-6xl mx-auto px-5">
        {/* Row 1: breadcrumb on left, desktop links + logout on right */}
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-1.5">
            <Link href="/" className="font-bold text-base hover:opacity-80 transition-opacity">
              ⚽ Campo Caribe
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-semibold">Admin</span>
          </div>
          {/* Desktop: pill links inline */}
          <div className="hidden md:flex items-center gap-2">
            {ADMIN_LINKS.map(({ href, label }) => (
              <AdminNavLink
                key={href}
                href={href}
                label={label}
                active={pathname === href || pathname.startsWith(href + "/")}
              />
            ))}
            <LogoutButton />
          </div>
          {/* Mobile: just logout */}
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </div>
        {/* Row 2: mobile scrollable pill links with right-side fade mask */}
        <div
          className="flex md:hidden overflow-x-auto gap-2 pb-3"
          style={{ maskImage: "linear-gradient(to right, black 85%, transparent)" }}
        >
          {ADMIN_LINKS.map(({ href, label }) => (
            <AdminNavLink
              key={href}
              href={href}
              label={label}
              active={pathname === href || pathname.startsWith(href + "/")}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
