import { Exchange, ExchangeAccount, OperationType, OrderSet, PrismaClient } from "@prisma/client";
import { MessageClient } from "src/services/messenger";
import { Context } from "../context";
import { getAllSettledResults } from "../helper"
import { createAsyncOperation, getPendingAccountOperations } from "./AsyncOperationRepository";
import { createOrder } from "./OrderRepository";
import { logger } from "../logger";

export const getExchangeAccount = async (ctx: Context, accountId: string) => {
  return ctx.prisma.exchangeAccount.findUnique({ where: { id: accountId } })
}

export const getExchangeAccounts = async (
  ctx: Context,
  membershipId: string,
  activeOnly?: boolean,
  exchange?: string,
) => {
  const whereClause = { membershipId }
  if (activeOnly) {
    whereClause["active"] = true
  }
  if (exchange) {
    whereClause["exchange"] = exchange
  }
  try {
    return ctx.prisma.exchangeAccount.findMany({ where: whereClause, orderBy: { exchange: "asc" } })
  } catch (e) {
    logger.info({ message: "[getExchangeAccounts] Error getting exchange accounts", membershipId, error: e })
    return null
  }
}

export const getOrders = async (ctx: Context, id: string) => {
  return ctx.prisma.order.findMany({
    where: { exchangeAccountId: id },
  })
}

export const createExchangeAccount = async (
  ctx: Context,
  membershipId: string,
  apiKey: string,
  apiSecret: string,
  exchange: Exchange,
) => {
  if (!ctx.userId) {
    return {
      error: "No user found!",
    }
  }

  const accountCount = await ctx.prisma.exchangeAccount.count({
    where: {
      AND: {
        exchange,
        membershipId,
      },
    },
  })

  if (accountCount > 0) {
    return {
      error: `${exchange} account already exists for this membership`,
    }
  }

  // TODO: Verify the api key and secret are valid with exchange
  const isValidApiKeyAndSecret = await validateApiKeyAndSecret(exchange, apiKey, apiSecret)

  if (!isValidApiKeyAndSecret) {
    return {
      error: `Invalid API key pair for ${exchange}`,
    }
  }

  const account = await ctx.prisma.exchangeAccount.create({
    data: {
      apiKey,
      exchange,
      apiSecret,
      membershipId,
      active: false,
    },
  })

  let opId = ""
  try {
    switch (exchange) {
      case Exchange.BINANCE:
        opId = await ctx.messenger.sendCreateBinanceAccount(account.id, apiKey, apiSecret)
        break
      case Exchange.BITMEX:
        opId = await ctx.messenger.sendCreateBitmexAccount(account.id, apiKey, apiSecret)
        break
    }
  } catch {
    await ctx.prisma.exchangeAccount.update({
      where: { id: account.id },
      data: {
        active: false,
        apiKey: null,
        apiSecret: null,
        updatedAt: new Date(),
      },
    })
    return {
      error: "Unable to connect to exchange",
    }
  }

  return {
    operationId: opId,
  }
}

export const validateApiKeyAndSecret = async (exchange: Exchange, apiKey: string, apiSecret: string): Promise<boolean> => {
  // TODO: This function
  return true
}

export const deleteExchangeAccountsForMembership = async (prisma: PrismaClient, messenger: MessageClient, membershipId: string) => {
  const accounts = await prisma.exchangeAccount.findMany({
    where: { membershipId },
  })

  if (!accounts || !accounts.length) {
    return
  }

  await Promise.allSettled(
    accounts.map(async (account: ExchangeAccount) => doDeleteExchangeAccount(prisma, messenger, account)),
  )
}

export const deleteExchangeAccount = async (ctx: Context, accountId: string) => {
  if (!ctx.userId) {
    return { error: "No user found!" }
  }
  const account = await ctx.prisma.exchangeAccount.findUnique({ where: { id: accountId } })

  if (!account) {
    return { error: "Could not find the account" }
  }

  return doDeleteExchangeAccount(ctx.prisma, ctx.messenger, account)
}

const doDeleteExchangeAccount = async (prisma: PrismaClient, messenger: MessageClient, account: ExchangeAccount) => {
  if (!account.active) {
    let opType: OperationType
    switch (account.exchange) {
      case Exchange.BINANCE:
        opType = OperationType.DELETE_BINANCE_ACCOUNT
        break
      case Exchange.BITMEX:
        opType = OperationType.DELETE_BITMEX_ACCOUNT
        break
    }

    await prisma.exchangeAccount.update({
      where: { id: account.id },
      data: {
        active: false,
        updatedAt: new Date(),
      },
    })
    const operation = await createAsyncOperation(
      prisma,
      { accountId: account.id, success: true, complete: true },
      opType,
    )

    if (!operation) {
      return { error: "Could not delete account" }
    }

    return { operationId: operation.id }
  }

  let opId = ""

  try {
    if (account.active) {
      switch (account.exchange) {
        case Exchange.BINANCE:
          opId = await messenger.sendDeleteBinanceAccount(account.id)
          break
        case Exchange.BITMEX:
          opId = await messenger.sendDeleteBitmexAccount(account.id, false, false)
          break
      }
    } else {
      return { error: "Account is inactive" }
    }
  } catch {
    return {
      error: "Unable to connect to exchange",
    }
  }

  await prisma.exchangeAccount.update({
    where: { id: account.id },
    data: {
      active: false,
      updatedAt: new Date(),
    },
  })

  return {
    operationId: opId,
  }
}

export const updateExchangeAccount = async (ctx: Context, accountId: string, apiKey: string, apiSecret: string) => {
  if (!ctx.userId) {
    return {
      error: "No user found!",
    }
  }

  const account = await ctx.prisma.exchangeAccount.findUnique({ where: { id: accountId } })

  if (!account) {
    return { success: false, error: new Error("Account not found") }
  }

  const pendingAccountOps = await getPendingAccountOperations(ctx.prisma, accountId)

  if (pendingAccountOps && pendingAccountOps.length > 0) {
    return { error: "Already updating account" }
  }

  // TODO: Verify the api key and secret are valid with exchange
  const isValidApiKeyAndSecret = await validateApiKeyAndSecret(account.exchange, apiKey, apiSecret)

  if (!isValidApiKeyAndSecret) {
    return { success: false, error: new Error(`Invalid API key pair for ${account.exchange}`) }
  }

  const updatedAccount = await ctx.prisma.exchangeAccount.update({
    where: { id: accountId },
    data: { apiKey, apiSecret, updatedAt: new Date() },
  })

  if (!updatedAccount) {
    return {
      success: false, error: new Error(`Unable to update ${account.exchange} account`),
    }
  }

  let opId = ""
  try {
    switch (account.exchange) {
      case Exchange.BINANCE:
        if (account.active) {
          opId = await ctx.messenger.sendUpdateBinanceAccount(account.id, apiKey, apiSecret)
        } else {
          opId = await ctx.messenger.sendCreateBinanceAccount(account.id, apiKey, apiSecret)
        }
        break
      case Exchange.BITMEX:
        if (account.active) {
          opId = await ctx.messenger.sendUpdateBitmexAccount(account.id, apiKey, apiSecret)
        } else {
          opId = await ctx.messenger.sendCreateBitmexAccount(account.id, apiKey, apiSecret)
        }
        break
    }
  } catch {
    await ctx.prisma.exchangeAccount.update({
      where: { id: account.id },
      data: {
        active: false,
        apiKey: null,
        apiSecret: null,
        updatedAt: new Date(),
      },
    })
    return {
      error: "Unable to connect to exchange",
    }
  }

  return {
    operationId: opId,
  }

}

export const toggleExchangeAccountActive = async (ctx: Context, accountId: string): Promise<any> => {
  if (!ctx.userId) {
    return { error: "No user found!" }
  }

  const account = await ctx.prisma.exchangeAccount.findUnique({ where: { id: accountId } })
  if (!account) {
    return { error: "Account not found" }
  }

  const pendingAccountOps = await getPendingAccountOperations(ctx.prisma, accountId)

  if (pendingAccountOps && pendingAccountOps.length > 0) {
    return { error: "Already updating account" }
  }

  const { apiKey, apiSecret } = account

  if (!apiKey || !apiSecret) {
    return { error: "API Key and Secret are required" }
  }

  let opId = ""
  try {
    switch (account.exchange) {
      case Exchange.BINANCE:
        if (account.active) {
          opId = await ctx.messenger.sendDeleteBinanceAccount(account.id, true)
        } else {
          opId = await ctx.messenger.sendCreateBinanceAccount(account.id, apiKey, apiSecret)
        }
        break
      case Exchange.BITMEX:
        if (account.active) {
          opId = await ctx.messenger.sendDeleteBitmexAccount(account.id, true, false)
        } else {
          opId = await ctx.messenger.sendCreateBitmexAccount(account.id, apiKey, apiSecret)
        }
        break
    }
  } catch {
    return {
      error: "Unable to connect to exchange",
    }
  }

  return { operationId: opId }
}

export const createOrdersForExchangeAccounts = async (
  ctx: Context,
  orderSet: OrderSet,
  exchangeAccountIds: string[],
): Promise<any> => {
  const {
    side, exchange, symbol, orderType, price,
    stopPrice, closeOrderSet, percent,
    trailingStopPercent, stopTriggerType, leverage,
  } = orderSet

  const closeOrder = closeOrderSet

  const exchangeAccounts = getAllSettledResults(await Promise.allSettled(
    exchangeAccountIds
      .map(async (accountId: string) =>
        ctx.prisma.exchangeAccount.findUnique({
          where: { id: accountId },
        }),
      ).filter(Boolean),
  ))

  if (!exchangeAccounts.length) {
    return
  }

  getAllSettledResults(await Promise.allSettled(
    exchangeAccountIds
      .map((accountId: string | null) =>
        accountId ? createOrder(
          ctx,
          orderSet.id,
          accountId,
          {
            side, exchange, symbol, orderType, closeOrder, price: Number(price),
            stopPrice: Number(stopPrice), percent, leverage, stopTriggerType, trailingStopPercent,
          },
        ) : null,
      )
      .filter(Boolean),
  ))

}
