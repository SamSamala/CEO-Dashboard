"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { subHours } from "date-fns";

const sendMessageSchema = z.object({
  recipientId: z.string().optional(),
  toRole: z.string().optional(),
  teamId: z.string().optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  parentId: z.string().optional(),
});

export const sendMessage = authActionClient
  .metadata({ actionName: "sendMessage" })
  .schema(sendMessageSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!parsedInput.recipientId && !parsedInput.toRole && !parsedInput.teamId) {
      throw new Error("Specify a recipient, a role, or a team to broadcast to");
    }

    // Auto-cleanup messages older than 48 hours to keep storage light
    await prisma.message.deleteMany({
      where: {
        companyId: ctx.companyId,
        createdAt: { lt: subHours(new Date(), 48) },
      },
    });

    const message = await prisma.message.create({
      data: {
        companyId: ctx.companyId,
        senderId: ctx.userId,
        recipientId: parsedInput.recipientId ?? null,
        toRole: parsedInput.toRole ?? null,
        teamId: parsedInput.teamId ?? null,
        subject: parsedInput.subject,
        body: parsedInput.body,
        parentId: parsedInput.parentId ?? null,
      },
    });

    revalidatePath("/messages");
    return { id: message.id };
  });

const markReadSchema = z.object({ messageId: z.string() });

export const markMessageRead = authActionClient
  .metadata({ actionName: "markMessageRead" })
  .schema(markReadSchema)
  .action(async ({ parsedInput, ctx }) => {
    await prisma.message.updateMany({
      where: {
        id: parsedInput.messageId,
        companyId: ctx.companyId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    revalidatePath("/messages");
  });

const deleteMessageSchema = z.object({ messageId: z.string() });

export const deleteMessage = authActionClient
  .metadata({ actionName: "deleteMessage" })
  .schema(deleteMessageSchema)
  .action(async ({ parsedInput, ctx }) => {
    await prisma.message.deleteMany({
      where: {
        id: parsedInput.messageId,
        companyId: ctx.companyId,
        senderId: ctx.userId,
      },
    });
    revalidatePath("/messages");
  });
