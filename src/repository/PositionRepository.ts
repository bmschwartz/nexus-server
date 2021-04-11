import { Exchange, Position, StopTriggerType, PositionSide } from "prisma";
import { Context } from "src/context";
import { getAllSettledResults } from "../helper";

export interface MemberPositionsInput {
  membershipId: string
  exchange: Exchange
  symbol?: string
  limit?: number
  offset?: number
  side?: string
}

export interface MemberPositionsResult {
  totalCount: number
  positions: Position[]
}

export interface ClosePositionsInput {
  symbol: string
  price: number
  percent: number
  exchangeAccountIds: string[]
}

export interface AddStopToPositionsInput {
  symbol: string
  stopPrice: number
  stopTriggerPriceType: StopTriggerType
  exchangeAccountIds: string[]
}

export interface AddTslToPositionsInput {
  symbol: string
  tslPercent: number
  stopTriggerPriceType: StopTriggerType
  exchangeAccountIds: string[]
}

export interface ClosePositionsResult {
  positionIds: string[]
}

export interface ExchangeAccountPositionsInput {
  exchangeAccountId: string
  limit?: number
  offset?: number
}

export interface ExchangeAccountPositionsResult {
  totalCount: number
  positions: Position[]
}

export interface ExchangeAccountPositionInput {
  exchangeAccountId: string
  symbol: string
}

export const getPosition = async (ctx: Context, positionId: string) => {
  return ctx.prisma.position.findUnique({ where: { id: positionId } })
}

export const getPositionSide = async (ctx: Context, positionId: string) => {
  const position = await ctx.prisma.position.findUnique({ where: { id: positionId } })
  return position && position.side
}

export const createPosition = async (
  ctx: Context,
  exchangeAccountId: string,
  side: PositionSide,
  exchange: Exchange,
  symbol: string,
  avgPrice?: number | null,
  isOpen?: boolean | null,
  quantity?: number | null,
  leverage?: number | null,
  markPrice?: number | null,
  margin?: number | null,
  maintenanceMargin?: number | null,
) => {
  return ctx.prisma.position.create({
    data: {
      exchange,
      side,
      symbol,
      avgPrice,
      isOpen: isOpen || false,
      quantity,
      leverage,
      markPrice,
      margin,
      maintenanceMargin,
      exchangeAccount: { connect: { id: exchangeAccountId } },
    },
  })
}

export const getMemberPositions = async (
  ctx: Context,
  { symbol, exchange, membershipId, limit, offset, side }: MemberPositionsInput,
): Promise<MemberPositionsResult | Error> => {
  let accountIds: string[] = []

  if (exchange) {
    const exchangeAccount = await ctx.prisma.exchangeAccount.findUnique({
      where: { ExchangeAccount_exchange_membershipId_key: { exchange, membershipId } },
    })
    if (!exchangeAccount || !exchangeAccount.active) {
      return { positions: [], totalCount: 0 }
    }
    accountIds = [exchangeAccount.id]
  } else {
    const exchangeAccounts = await ctx.prisma.exchangeAccount.findMany({
      where: { membershipId },
    })

    if (!exchangeAccounts) {
      return { positions: [], totalCount: 0 }
    }
    accountIds = exchangeAccounts.map(account => account.id)
  }

  const whereClause = {
    exchangeAccountId: { in: accountIds },
    quantity: { not: 0 },
    exchangeAccount: {
      active: true,
    },
  }
  if (symbol) {
    whereClause["symbol"] = symbol
  }
  if (side) {
    whereClause["side"] = side
  }

  const positions: Position[] = await ctx.prisma.position.findMany({
    take: limit,
    skip: offset,
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })

  const totalCount = await ctx.prisma.position.count({
    where: whereClause,
  })

  return {
    positions,
    totalCount,
  }
}

export const closePositions = async (ctx: Context, { exchangeAccountIds, symbol, price, percent }: ClosePositionsInput): Promise<any> => {
  return getAllSettledResults(await Promise.allSettled(
    exchangeAccountIds.map(async (exchangeAccountId: string) => {
      const exchangeAccount = await ctx.prisma.exchangeAccount.findUnique({ where: { id: exchangeAccountId } })
      if (!exchangeAccount) {
        return {
          error: "No exchange account found",
        }
      }

      let opId = ""
      try {
        switch (exchangeAccount.exchange) {
          case Exchange.BINANCE:
            return {
              error: "Binance close position order not implemented",
            }
          case Exchange.BITMEX:
            opId = await ctx.messenger.sendCloseBitmexPosition(exchangeAccount.id, { symbol, price, percent })
            break
        }
      } catch {
        return {
          error: "Unable to connect to exchange",
        }
      }
      return {
        operationId: opId,
      }
    }),
  ))
}

export const addStopToPositions = async (
  ctx: Context,
  { exchangeAccountIds, symbol, stopPrice, stopTriggerPriceType }: AddStopToPositionsInput,
): Promise<any> => {
  const ops: any[] = getAllSettledResults(await Promise.allSettled(
    exchangeAccountIds.map(async (exchangeAccountId: string) => {
      const exchangeAccount = await ctx.prisma.exchangeAccount.findUnique({ where: { id: exchangeAccountId } })
      if (!exchangeAccount) {
        return {
          error: "No exchange account found",
        }
      }

      let opId = ""
      try {
        switch (exchangeAccount.exchange) {
          case Exchange.BINANCE:
            return {
              error: "Binance add stop to position not implemented",
            }
          case Exchange.BITMEX:
            opId = await ctx.messenger.sendAddStopBitmexPosition(exchangeAccount.id, { symbol, stopPrice, stopTriggerPriceType })
            break
        }
      } catch {
        return {
          error: "Unable to connect to exchange",
        }
      }
      return {
        operationId: opId,
      }
    }),
  ))
  console.log(ops)
  return ops
}

export const addTslToPositions = async (
  ctx: Context,
  { exchangeAccountIds, symbol, tslPercent, stopTriggerPriceType }: AddTslToPositionsInput,
): Promise<any> => {
  return getAllSettledResults(await Promise.allSettled(
    exchangeAccountIds.map(async (exchangeAccountId: string) => {
      const exchangeAccount = await ctx.prisma.exchangeAccount.findUnique({ where: { id: exchangeAccountId } })
      if (!exchangeAccount) {
        return {
          error: "No exchange account found",
        }
      }

      let opId = ""
      try {
        switch (exchangeAccount.exchange) {
          case Exchange.BINANCE:
            return {
              error: "Binance add tsl to position not implemented",
            }
          case Exchange.BITMEX:
            opId = await ctx.messenger.sendAddTslBitmexPosition(exchangeAccount.id, { symbol, tslPercent, stopTriggerPriceType })
            break
        }
      } catch {
        return {
          error: "Unable to connect to exchange",
        }
      }
      return {
        operationId: opId,
      }
    }),
  ))
}

export const getExchangeAccountPositions = async (
  ctx: Context,
  { exchangeAccountId, limit, offset }: ExchangeAccountPositionsInput,
): Promise<ExchangeAccountPositionsResult | Error> => {
  const whereClause = {
    exchangeAccount: {
      id: exchangeAccountId,
      active: true,
    },
  }

  const positions: Position[] = await ctx.prisma.position.findMany({
    take: limit,
    skip: offset,
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })
  const totalCount = await ctx.prisma.position.count({
    where: whereClause,
  })

  return {
    positions,
    totalCount,
  }
}

export const getExchangeAccountPosition = async (
  ctx: Context,
  { exchangeAccountId, symbol }: ExchangeAccountPositionInput,
): Promise<Position | null> => {
  const exchangeAccount = await ctx.prisma.exchangeAccount.findUnique({
    where: {id: exchangeAccountId},
  })

  if (!exchangeAccount || !exchangeAccount.active) {
    return null
  }

  return ctx.prisma.position.findUnique({
    where: { Position_symbol_exchangeAccountId_key: { exchangeAccountId, symbol } },
  })
}
