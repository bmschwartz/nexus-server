import { PrismaClient } from "@prisma/client"
import { BillingClient } from "./services/billing"
import { MessageClient } from "./services/messenger"
import { initSettings } from "./settings"

initSettings()

export const prisma = new PrismaClient()
export const messenger = new MessageClient(prisma)
export const billing = new BillingClient({ prisma, messenger })

export interface Context {
  userId?: string
  userType?: string
  prisma: PrismaClient
  messenger: MessageClient
  billing: BillingClient
}

export function createContext({ req }: any): Context {
  let { userid: userId, usertype: userType } = req.headers

  userId = (userId !== "undefined" && userId !== undefined) ? userId : undefined
  userType = (userType !== "undefined" && userType !== undefined) ? userType : undefined

  return {
    prisma,
    userId,
    userType,
    messenger,
    billing,
  }
}
