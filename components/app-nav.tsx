import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function AppNav() {
  return (
    <nav className="w-full border-b border-border">
      <div className="max-w-5xl mx-auto flex justify-between items-center p-4 px-5">
        <Link href="/" className="font-bold text-lg hover:opacity-80 transition-opacity">
          ⚽ Campo Caribe WC2026
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/bracket" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Bracket
          </Link>
          <Link href="/ride-or-die" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Ride or Die
          </Link>
          <Link href="/predictor" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Predictor
          </Link>
          <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Leaderboard
          </Link>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
