import { PrismaClient } from "@prisma/client";

export const getUser = async (prisma: PrismaClient, userId: string) => {
  return await prisma.user.findUnique({ where: { id: userId } })
}