import {
  getOrderSet,
  createOrderSet,
  updateOrderSet,
  getOrders,
  getOrderSide,
  cancelOrderSet,
} from "../../repository/OrderSetRepository"
import { Context } from "src/context"

export const OrderSetQueries = {
  async orderSet(parent: any, args: any, ctx: Context) {
    const {
      input: { id: orderSetId },
    } = args
    return getOrderSet(ctx, orderSetId)
  },
}

export const OrderSetMutations = {
  async createOrderSet(parent: any, args: any, ctx: Context) {
    const {
      input: {
        groupId,
        exchangeAccountIds,
        symbol,
        exchange,
        description,
        side,
        orderType,
        closeOrderSet,
        price,
        stopPrice,
        percent,
        leverage,
        stopTriggerType,
        trailingStopPercent,
      },
    } = args

    const orderSet = await createOrderSet(ctx,
      {
        groupId, exchangeAccountIds, symbol, exchange, description,
        side, orderType, closeOrderSet, leverage, price, stopPrice,
        percent, stopTriggerType, trailingStopPercent,
      },
    )

    return { orderSet }
  },

  async updateOrderSet(parent: any, args: any, ctx: Context) {
    const {
      input: { orderSetId, description },
    } = args

    return updateOrderSet(ctx, { orderSetId, description })
  },

  async cancelOrderSet(parent: any, args: any, ctx: Context) {
    const {
      input: { orderSetId, stopOrderTypes },
    } = args

    try {
      await cancelOrderSet(ctx, { orderSetId, stopOrderTypes })
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
}

export const OrderSetResolvers = {
  async __resolveReference(orderSet: any, args: any, ctx: Context) {
    return getOrderSet(ctx, orderSet.id)
  },

  async orders({ id: orderSetId }: any, args, ctx: Context) {
    const {
      input: { limit, offset, stopOrderType, orderStatus },
    } = args

    return getOrders(ctx, { limit, offset, orderSetId, stopOrderType, orderStatus })
  },

  async side({ id: orderSetId }: any, args: any, ctx: Context) {
    return getOrderSide(ctx, orderSetId)
  },
}
