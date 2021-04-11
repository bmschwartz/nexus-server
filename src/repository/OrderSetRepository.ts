import { OrderSet, OrderSide, OrderType, Exchange, Order, BitmexCurrency, BinanceCurrency, StopTriggerType, OrderStatus } from "@prisma/client";
import { Context } from "src/context";
import { createOrdersForExchangeAccounts } from "./ExchangeAccountRepository";
import {cancelOrders} from "./OrderRepository";

export enum StopOrderType {
  NONE = "NONE",
  STOP_LIMIT = "STOP_LIMIT",
  TRAILING_STOP = "TRAILING_STOP",
}

interface CreateOrderSetInput {
  groupId: string;
  exchangeAccountIds: string[]
  percent: number;
  side: OrderSide;
  symbol: string;
  exchange: Exchange;
  orderType: OrderType;
  closeOrderSet: boolean;
  description?: string;
  price?: number;
  leverage: number;
  stopPrice?: number;
  trailingStopPercent?: number;
  stopTriggerType?: StopTriggerType;
}

interface UpdateOrderSetInput {
  orderSetId: string;
  description?: string;
}

interface CancelOrderSetInput {
  orderSetId: string;
  stopOrderTypes?: StopOrderType[];
}

interface OrdersInput {
  orderSetId: string
  orderStatus?: OrderStatus
  stopOrderType?: StopOrderType
  limit?: number
  offset?: number
}

export interface OrdersResult {
  totalCount: number
  orders: Order[]
}

type Currency =
  | BinanceCurrency
  | BitmexCurrency

export const getOrderSet = async (ctx: Context, orderSetId: string): Promise<OrderSet | null> => {
  return ctx.prisma.orderSet.findUnique({ where: { id: orderSetId } })
}

export const createOrderSet = async (ctx: Context, data: CreateOrderSetInput): Promise<any> => {
  const {
    groupId,
    description,
    side,
    exchange,
    symbol,
    orderType,
    closeOrderSet,
    price,
    leverage,
    stopPrice,
    percent,
    exchangeAccountIds,
    stopTriggerType,
    trailingStopPercent,
  } = data

  const error = await getOrderSetInputError(
    ctx,
    symbol,
    exchange,
    percent,
    side,
    closeOrderSet,
    leverage,
    price,
    stopPrice,
    stopTriggerType,
    trailingStopPercent,
  )

  if (error) {
    return { error }
  }

  const orderSet = await ctx.prisma.orderSet.create({
    data: {
      groupId,
      description,
      exchange,
      symbol,
      side,
      orderType,
      closeOrderSet,
      price,
      leverage,
      stopPrice,
      percent,
      stopTriggerType,
      trailingStopPercent,
    },
  })

  if (!orderSet) {
    return new Error("Unable to create the OrderSet")
  }

  await createOrdersForExchangeAccounts(ctx, orderSet, exchangeAccountIds)

  return orderSet
}

export const updateOrderSet = async (ctx: Context, data: UpdateOrderSetInput): Promise<OrderSet | null> => {
  const { orderSetId, description } = data
  const orderSet = ctx.prisma.orderSet.update({
    where: { id: orderSetId },
    data: { description, updatedAt: new Date() },
  })

  if (!orderSet) {
    return null
  }

  // TODO: emit orderset updated message

  return orderSet
}

export const cancelOrderSet = async (ctx: Context, data: CancelOrderSetInput) => {
  const { orderSetId, stopOrderTypes } = data

  const whereClause = {
    orderSetId,
    status: { in: [OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED] },
  }
  if (stopOrderTypes?.includes(StopOrderType.NONE)) {
    whereClause["AND"] = { stopPrice: null, trailingStopPercent: null }
  } else if (stopOrderTypes?.includes(StopOrderType.STOP_LIMIT)) {
    whereClause["NOT"] = { stopPrice: null }
  } else if (stopOrderTypes?.includes(StopOrderType.TRAILING_STOP)) {
    whereClause["NOT"] = { trailingStopPercent: null }
  }

  const orders = await ctx.prisma.order.findMany({
    where: whereClause,
  })

  await cancelOrders(ctx, orders)
}

export const getOrders = async (
  ctx: Context, { orderSetId, limit, offset, stopOrderType, orderStatus }: OrdersInput,
): Promise<OrdersResult> => {
  const whereClause = { orderSetId }

  switch (stopOrderType) {
    case StopOrderType.NONE:
      whereClause["stopPrice"] = null
      whereClause["trailingStopPercent"] = null
      break
    case StopOrderType.STOP_LIMIT:
      whereClause["NOT"] = { stopPrice: null }
      whereClause["trailingStopPercent"] = null
      break
    case StopOrderType.TRAILING_STOP:
      whereClause["NOT"] = { trailingStopPercent: null }
      break
    default:
      break
  }

  if (orderStatus) {
    whereClause["status"] = orderStatus
  }

  const orders = await ctx.prisma.order.findMany({
    take: limit,
    skip: offset,
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })
  const totalCount = await ctx.prisma.order.count({
    where: whereClause,
  })

  return {
    orders,
    totalCount,
  }
}

export const getOrderSide = async (ctx: Context, orderSetId: string): Promise<OrderSide | null> => {
  const orderSet = await ctx.prisma.orderSet.findUnique({ where: { id: orderSetId } })
  return orderSet ? orderSet.side : null
}

export const getOrderSetInputError = async (
  ctx: Context, symbol: string, exchange: Exchange, percent: number, side: OrderSide, closeOrder: boolean,
  leverage: number, price?: number, stopPrice?: number, stopTriggerType?: StopTriggerType,
  trailingStopPercent?: number,
): Promise<Error | undefined> => {
  if (!exchangeExists(exchange)) {
    return new Error("Exchange does not exist")
  }

  const currency = await getCurrency(ctx, exchange, symbol)
  if (!currency) {
    return new Error("Currency does not exist")
  }

  if (percent < 1 || percent > 100) {
    return new Error("Percent must be between 1 and 100")
  }

  if (price) {
    // limit order
    if (stopPrice) {
      if (side === OrderSide.BUY && stopPrice >= price) {
        return new Error(
          "Stop price must be lower than entry price for BUY orders",
        )
      } else if (side === OrderSide.SELL && stopPrice <= price) {
        return new Error(
          "Stop price must be higher than entry price for SELL orders",
        )
      }
    }

    if (closeOrder) {

    }
  } else {
    // market order
    if (stopPrice) {
      // if (side === OrderSide.BUY)
      //   currency.lastPrice
    }
  }

  // TODO: Close order validation?
  if (closeOrder) {

  }

  return
}

const getCurrency = async (ctx: Context, exchange: Exchange, symbol: string): Promise<Currency | null | undefined> => {
  switch (exchange) {
    case Exchange.BINANCE:
      return ctx.prisma.binanceCurrency.findUnique({ where: { symbol } })
    case Exchange.BITMEX:
      return ctx.prisma.bitmexCurrency.findUnique({ where: { symbol } })
    default:
      return
  }
}

const exchangeExists = (exchange: Exchange): boolean => {
  switch (exchange) {
    case Exchange.BINANCE:
    case Exchange.BITMEX:
      return true
    default:
      return false
  }
}
