import { auth } from "@/lib/auth";
import { Bell } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";
import Link from "next/link";

interface AppHeaderProps {
  activeAlerts?: number;
}

export async function AppHeader({ activeAlerts = 0 }: AppHeaderProps) {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {activeAlerts > 0 && (
          <Link
            href="/alerts"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
              {activeAlerts > 9 ? "9+" : activeAlerts}
            </span>
          </Link>
        )}

        <UserMenu
          name={user?.name ?? "User"}
          email={user?.email ?? ""}
          image={user?.image}
          role={user?.role ?? ""}
        />
      </div>
    </header>
  );
}
