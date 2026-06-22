import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MessagesClient } from "@/components/messages/messages-client";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: userId, companyId, role } = session.user;

  // Get the user's teamId from DB (not in JWT since it can change)
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true },
  });
  const userTeamId = dbUser?.teamId ?? null;

  // Build inbox OR conditions without spread
  const inboxOrConditions: Array<{ recipientId?: string; toRole?: string; teamId?: string }> = [
    { recipientId: userId },
    { toRole: role },
  ];
  if (userTeamId) inboxOrConditions.push({ teamId: userTeamId });

  const [inbox, sent, companyUsers, userTeams] = await Promise.all([
    prisma.message.findMany({
      where: { companyId, parentId: null, OR: inboxOrConditions },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
        replies: {
          include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.findMany({
      where: { companyId, senderId: userId, parentId: null },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        recipient: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
        replies: {
          include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { companyId, isActive: true, id: { not: userId } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    // Teams available to this user (CEO/DEPT_HEAD see all, others see own team)
    role === "CEO" || role === "DEPT_HEAD"
      ? prisma.team.findMany({
          where: { companyId, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : userTeamId
        ? prisma.team.findMany({
            where: { id: userTeamId },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
  ]);

  return (
    <MessagesClient
      inbox={inbox as any}
      sent={sent as any}
      companyUsers={companyUsers}
      availableTeams={userTeams}
      currentUserId={userId}
      currentUserRole={role}
    />
  );
}
