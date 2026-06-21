import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MessagesClient } from "@/components/messages/messages-client";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: userId, companyId, role } = session.user;

  // Fetch inbox: messages sent directly to me OR broadcast to my role
  const inbox = await prisma.message.findMany({
    where: {
      companyId,
      parentId: null, // top-level threads only
      OR: [
        { recipientId: userId },
        { toRole: role },
      ],
    },
    include: {
      sender: { select: { id: true, name: true, email: true, role: true } },
      replies: {
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch sent messages (top-level only)
  const sent = await prisma.message.findMany({
    where: { companyId, senderId: userId, parentId: null },
    include: {
      sender: { select: { id: true, name: true, email: true, role: true } },
      recipient: { select: { id: true, name: true, email: true, role: true } },
      replies: {
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all users in the company to populate the recipient picker
  const companyUsers = await prisma.user.findMany({
    where: { companyId, isActive: true, id: { not: userId } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <MessagesClient
      inbox={inbox as any}
      sent={sent as any}
      companyUsers={companyUsers}
      currentUserId={userId}
      currentUserRole={role}
    />
  );
}
