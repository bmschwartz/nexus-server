import { v4 as uuid4 } from "uuid"
import { Exchange, Order, OrderSide, OrderStatus, OrderType, StopTriggerType } from "@prisma/client";
import { Context } from "../context";

export interface MemberOrdersInput {
  membershipId: string
  limit?: number
  offset?: number
}

export interface MemberOrdersResult {
  totalCount: number
  orders: Order[]
}

interface CreateOrdersContainer {
  [key: string]: object;
}

export const getOrder = async (ctx: Context, orderId: string) => {
  return ctx.prisma.order.findUnique({ where: { id: orderId } })
}

export const getOrderSet = async (ctx: Context, orderId: string) => {
  const order = await ctx.prisma.order.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    return new Error("Could not find order!")
  }

  return ctx.prisma.orderSet.findUnique({
    where: { id: order.id },
  })
}

export const getOrderSide = async (ctx: Context, orderId: string) => {
  const order = await ctx.prisma.order.findUnique({ where: { id: orderId } })
  return order && order.side
}

export const getOrderType = async (ctx: Context, orderId: string) => {
  const order = await ctx.prisma.order.findUnique({ where: { id: orderId } })
  return order && order.orderType
}

export const getFilledPrice = async (ctx: Context, orderId: string): Promise<number> => {
  const order = await ctx.prisma.order.findUnique({ where: { id: orderId } })
  return order ? Number(order.avgPrice) : null
}

export const cancelOrder = async (ctx: Context, orderId: string) => {
  const order = await ctx.prisma.order.findUnique({
    where: { id: orderId },
  })
  if (!order) {
    return { success: false, error: "Order not found" }
  }

  if (order.status !== OrderStatus.NEW && order.status !== OrderStatus.PARTIALLY_FILLED) {
    return { success: false, error: "Order can't be canceled" }
  }

  await cancelOrders(ctx, [order])

  return { success: true, error: null }
}

interface CreateOrderData {
  side: OrderSide;
  exchange: Exchange;
  symbol: string;
  orderType: OrderType;
  closeOrder: boolean;
  percent: number;
  leverage: number;
  price: number | null;
  stopPrice: number | null;
  trailingStopPercent: number | null;
  stopTriggerType: StopTriggerType | null;
}

export const createOrder = async (
  ctx: Context,
  orderSetId: string,
  exchangeAccountId: string,
  orderData: CreateOrderData,
) => {
  const { percent, stopPrice, trailingStopPercent, stopTriggerType, side, ...realOrderData } = orderData

  let mainOrder: object
  let stopOrder: object
  let tslOrder: object
  const orders: CreateOrdersContainer = {}

  const selectedFields = {
    id: true, clOrderId: true, symbol: true, side: true, orderType: true, closeOrder: true, price: true,
    stopPrice: true, leverage: true, stopTriggerType: true, trailingStopPercent: true,
  }
  const sharedId = uuid4().replace("-", "").slice(0, 24)

  try {
    mainOrder = await ctx.prisma.order.create({
      data: {
        side,
        ...realOrderData,
        clOrderId: `${sharedId}_order`,
        status: OrderStatus.NEW,
        exchangeAccount: { connect: { id: exchangeAccountId } },
        orderSet: { connect: { id: orderSetId } },
      },
      select: selectedFields,
    })

    mainOrder["percent"] = percent
    orders["main"] = mainOrder

    if (stopPrice) {
      stopOrder = await ctx.prisma.order.create({
        data: {
          stopPrice,
          stopTriggerType,
          ...realOrderData,
          side: side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY,
          clOrderId: `${sharedId}_stop`,
          status: OrderStatus.NEW,
          exchangeAccount: { connect: { id: exchangeAccountId } },
          orderSet: { connect: { id: orderSetId } },
        },
        select: selectedFields,
      })

      stopOrder["percent"] = null
      orders["stop"] = stopOrder
    }
    if (trailingStopPercent) {
      tslOrder = await ctx.prisma.order.create({
        data: {
          trailingStopPercent,
          stopTriggerType,
          ...realOrderData,
          side: side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY,
          clOrderId: `${sharedId}_tsl`,
          status: OrderStatus.NEW,
          exchangeAccount: { connect: { id: exchangeAccountId } },
          orderSet: { connect: { id: orderSetId } },
        },
        select: selectedFields,
      })

      tslOrder["percent"] = null
      orders["tsl"] = tslOrder
    }
  } catch (e) {
    console.error(e)
    return
  }

  if (!mainOrder) {
    return null
  }

  let opId: string
  try {
    switch (orderData.exchange) {
      case Exchange.BINANCE:
        opId = ""  // TODO: Fix me
        break
      case Exchange.BITMEX:
        if (mainOrder["closeOrder"]) {
          opId = await ctx.messenger.sendCloseBitmexPosition(exchangeAccountId, orders)
        } else {
          opId = await ctx.messenger.sendCreateBitmexOrder(exchangeAccountId, orders)
        }
        break
    }
  } catch {
    const deleteOperations = Object.values(orders).map(
      (toDelete: object) => ctx.prisma.order.delete({ where: { id: toDelete["id"] } }),
    )
    await Promise.all(deleteOperations)

    return {
      error: "Unable to connect to exchange",
    }
  }

  return mainOrder
}

export const getMemberOrders = async (
  ctx: Context,
  { membershipId, limit, offset }: MemberOrdersInput,
): Promise<MemberOrdersResult | Error> => {
  const exchangeAccounts = await ctx.prisma.exchangeAccount.findMany({
    where: { membershipId },
  })

  if (!exchangeAccounts) {
    return { orders: [], totalCount: 0 }
  }

  const accountIds = exchangeAccounts.map(account => account.id)

  const orders: Order[] = await ctx.prisma.order.findMany({
    take: limit,
    skip: offset,
    where: { exchangeAccountId: { in: accountIds } },
    orderBy: { createdAt: "desc" },
  })
  const orderCount = await ctx.prisma.order.count({
    where: { exchangeAccountId: { in: accountIds } },
  })

  return {
    orders,
    totalCount: orderCount,
  }
}

export const cancelOrders = async (ctx: Context, orders: Order[]) => {
  const cancelMessages = orders.map(
    async ({remoteOrderId, exchangeAccountId}: Order) => {
      if (!remoteOrderId) {
        return null
      }
      return ctx.messenger.sendCancelBitmexOrder(exchangeAccountId, remoteOrderId)
    },
  ).filter(Boolean)

  await Promise.allSettled(cancelMessages)
}
