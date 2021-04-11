import { getExchangeAccount } from "../../repository/ExchangeAccountRepository"
import {
  cancelOrder,
  getFilledPrice,
  getOrder,
  getOrderSet,
  getOrderSide,
  getOrderType,
} from "../../repository/OrderRepository"
import { Context } from "../../context"

export const OrderQueries = {
  async order(parent: any, args: any, ctx: Context) {
    const {
      input: { id: orderId },
    } = args

    return getOrder(ctx, orderId)
  },
}

export const OrderResolvers = {
  async __resolveReference({ id: orderId }: any, args: any, ctx: Context) {
    return getOrder(ctx, orderId)
  },
  async orderSet({ id: orderId }: any, args: any, ctx: Context) {
    return getOrderSet(ctx, orderId)
  },

  async side({ id: orderId }: any, args: any, ctx: Context) {
    return getOrderSide(ctx, orderId)
  },

  async filledPrice({ id: orderId }: any, args: any, ctx: Context) {
    return getFilledPrice(ctx, orderId)
  },

  async orderType({ id: orderId }: any, args: any, ctx: Context) {
    return getOrderType(ctx, orderId)
  },

  // async membership(order: any, args: any, ctx: Context) {
  //   return {
  //     id: order.membershipId,
  //   }
  // },

  async exchangeAccount(order: any, args: any, ctx: Context) {
    return getExchangeAccount(ctx, order.exchangeAccountId)
  },
}

export const OrderMutations = {
  async cancelOrder(parent: any, args: any, ctx: Context) {
    const { input: { id: orderId } } = args

    return cancelOrder(ctx, orderId)
  },
}
