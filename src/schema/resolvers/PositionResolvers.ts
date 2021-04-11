import {
  getPosition,
  getPositionSide,
  getExchangeAccountPositions,
} from "../../repository/PositionRepository"
import { getExchangeAccount } from "../../repository/ExchangeAccountRepository"
import { Context } from "../../context"

export const PositionQueries = {
  async position(parent: any, args: any, ctx: Context) {
    const {
      input: { id: positionId },
    } = args

    return getPosition(ctx, positionId)
  },

  // async exchangeAccountPositions(parent: any, args: any, ctx: Context) {
  //   const {
  //     input: { exchangeAccountId, limit, offset },
  //   } = args

  //   return getExchangeAccountPositions(ctx, { exchangeAccountId, limit, offset })
  // },
}

export const PositionResolvers = {
  async __resolveReference({ id: positionId }: any, args: any, ctx: Context) {
    return getPosition(ctx, positionId)
  },

  async side({ id: positionId }: any, args: any, ctx: Context) {
    return getPositionSide(ctx, positionId)
  },

  // async membership(position: any, args: any, ctx: Context) {
  //   return {
  //     id: position.membershipId,
  //   }
  // },

  async isOpen({ id: positionId }: any, args: any, ctx: Context) {
    const position = await getPosition(ctx, positionId)
    return position ? position.isOpen : false
  },

  async exchangeAccount(position: any, args: any, ctx: Context) {
    return getExchangeAccount(ctx, position.exchangeAccountId)
  },
}

export const PositionMutations = {
  async addStopToPositions(parent: any, args: any, ctx: Context) {
    const { input: { exchange, membershipIds, symbol, stopPrice, stopTriggerPriceType } } = args

    // return addStopToPositions(ctx, { exchange, membershipIds, symbol, stopPrice, stopTriggerPriceType })
  },

  async addTslToPositions(parent: any, args: any, ctx: Context) {
    const { input: { exchange, membershipIds, symbol, tslPercent, stopTriggerPriceType } } = args

    // return addTslToPositions(ctx, { exchange, membershipIds, symbol, tslPercent, stopTriggerPriceType })
  },
}
