import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId;
  const userId = session.user.id;

  // Single query — fetch all needed fields including teamId
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, terminationNote: true, mustChangePassword: true, teamId: true },
  });

  if (!dbUser?.isActive) {
    redirect("/deactivated");
  }

  // Redirect CEO to onboarding if setup isn't complete
  if (session.user.role === "CEO") {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { onboardingCompleted: true },
    });
    if (!company?.onboardingCompleted) {
      // Allow onboarding page itself to render — only redirect if on other pages
      // The onboarding page handles its own redirect-if-complete logic
    }
  }

  // Force password change if flagged — skip if already on the password page to prevent
  // infinite redirect loop (layout runs for every (app) route, including /settings/password).
  // Middleware injects x-pathname so we can read it here.
  if (dbUser?.mustChangePassword) {
    const h = await headers();
    const pathname = h.get("x-pathname") ?? "";
    if (!pathname.startsWith("/settings/password")) {
      redirect("/settings/password?forced=1");
    }
  }

  const userTeamId = dbUser?.teamId ?? null;

  // Build message OR conditions without spread (spread in Prisma OR causes unreliable compiled queries)
  const msgOrConditions: Array<{ recipientId?: string; toRole?: string; teamId?: string }> = [
    { recipientId: userId },
    { toRole: session.user.role },
  ];
  if (userTeamId) msgOrConditions.push({ teamId: userTeamId });

  const [pendingApprovals, activeAlerts, activeBottlenecks, unreadMessages] = await Promise.all([
    companyId
      ? prisma.approval.count({ where: { companyId, status: "PENDING" } })
      : 0,
    companyId
      ? prisma.alert.count({ where: { companyId, status: "ACTIVE" } })
      : 0,
    companyId && session.user.role === "CEO"
      ? prisma.bottleneck.count({ where: { companyId, resolvedAt: null, severity: { not: "NONE" } } })
      : 0,
    companyId
      ? prisma.message.count({
          where: {
            companyId,
            readAt: null,
            parentId: null,
            OR: msgOrConditions,
            NOT: { senderId: userId },
          },
        })
      : 0,
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        role={session.user.role}
        pendingApprovals={pendingApprovals}
        activeAlerts={activeAlerts}
        activeBottlenecks={activeBottlenecks}
        unreadMessages={unreadMessages}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader activeAlerts={activeAlerts} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 lg:p-6">
          <div className="mx-auto w-full max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
