import Link from "next/link";

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <Link
          href="/admin/teams"
          className="block border border-border rounded-lg p-6 hover:bg-muted/40 transition-colors"
        >
          <h2 className="font-semibold text-lg mb-1">🌍 Teams</h2>
          <p className="text-sm text-muted-foreground">
            View and edit all 48 qualified teams, groups, and Cinderella flags.
          </p>
        </Link>

        <Link
          href="/admin/matches"
          className="block border border-border rounded-lg p-6 hover:bg-muted/40 transition-colors"
        >
          <h2 className="font-semibold text-lg mb-1">⚽ Matches</h2>
          <p className="text-sm text-muted-foreground">
            Assign teams to bracket slots, enter scores, and update match
            status.
          </p>
        </Link>

        <Link
          href="/admin/settings"
          className="block border border-border rounded-lg p-6 hover:bg-muted/40 transition-colors"
        >
          <h2 className="font-semibold text-lg mb-1">⚙️ Settings</h2>
          <p className="text-sm text-muted-foreground">
            Set Ride or Die lock time, toggle registration, and manage
            tournament controls.
          </p>
        </Link>
      </div>
    </div>
  );
}
