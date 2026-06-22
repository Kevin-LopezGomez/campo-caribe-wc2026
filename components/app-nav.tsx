import Link from "next/link";
import Image from "next/image";
import { LogoutButton } from "@/components/logout-button";

export function AppNav() {
  return (
    <nav className="w-full border-b border-border">
      <div className="max-w-5xl mx-auto px-5">
        {/* Row 1: logo + name on left, desktop links + logout on right */}
        <div className="flex justify-between items-center py-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Campo Caribe" width={32} height={32} className="shrink-0" />
            <span className="font-bold text-lg">Campo Caribe WC2026</span>
          </Link>
          {/* Desktop: nav links + logout inline */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/bracket" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Bracket</Link>
            <Link href="/ride-or-die" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ride or Die</Link>
            <Link href="/predictor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Predictor</Link>
            <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Leaderboard</Link>
            <LogoutButton />
          </div>
          {/* Mobile: just logout */}
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </div>
        {/* Row 2: mobile nav links — scrollable, hidden on desktop */}
        <div className="flex md:hidden overflow-x-auto gap-5 pb-3">
          <Link href="/bracket" className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Bracket</Link>
          <Link href="/ride-or-die" className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Ride or Die</Link>
          <Link href="/predictor" className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Predictor</Link>
          <Link href="/leaderboard" className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Leaderboard</Link>
        </div>
      </div>
    </nav>
  );
}
