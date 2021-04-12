import * as jwt from "jsonwebtoken"
import * as dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"
import { BillingClient } from "./services/billing"
import { MessageClient } from "./services/messenger"
import { initSettings } from "./settings"

dotenv.config()

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
  const { authorization } = req.headers
  let userId: string
  let userType: string

  if (authorization) {
    const token = authorization.split(" ")[1]

    try {
      const decoded: any = jwt.verify(token, String(process.env.APP_SECRET), { complete: true })
      userId = decoded.payload.userId
      userType = decoded.payload.userType
    } catch (e) {
      userId = undefined
      userType = undefined
    }
  }
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
