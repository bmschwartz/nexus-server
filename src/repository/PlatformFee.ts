import {PrismaClient, PlatformFee} from "@prisma/client"

export const getActivePlatformFee = (prisma: PrismaClient): Promise<PlatformFee> => {
  return prisma.platformFee.findFirst({
    where: { active: true },
  })
}
