import { Context } from "../../context"
import { getOrders } from "../../repository/ExchangeAccountRepository"
import {
  getExchangeAccount,
  getExchangeAccounts,
  createExchangeAccount as runCreateExchangeAccount,
  deleteExchangeAccount as runDeleteExchangeAccount,
  updateExchangeAccount as runUpdateExchangeAccount,
  toggleExchangeAccountActive as runToggleExchangeAccountActive,
} from "../../repository/ExchangeAccountRepository"
import { getExchangeAccountPosition, getExchangeAccountPositions } from "../../repository/PositionRepository";

export const ExchangeAccountQueries = {
  async exchangeAccount(parent: any, args: any, ctx: Context) {
    const { input: { id: accountId } } = args
    return getExchangeAccount(ctx, accountId)
  },
  async exchangeAccounts(parent: any, args: any, ctx: Context) {
    const { input: { membershipId } } = args
    return getExchangeAccounts(ctx, membershipId)
  },
}

export const ExchangeAccountResolvers = {
  async __resolveReference({ id: accountId }: any, args: any, ctx: Context) {
    return getExchangeAccount(ctx, accountId)
  },
  async membership(account: any, args: any, ctx: Context) {
    return ctx.prisma.groupMembership.findUnique({
      where: { id: account.membershipId },
    })
  },
  async orders(account: any, args: any, ctx: Context) {
    return getOrders(ctx, account.id)
  },
  async positions(account: any, args: any, ctx: Context) {
    const { id: exchangeAccountId } = account
    const { input } = args

    const limit = input?.limit
    const offset = input?.offset

    return getExchangeAccountPositions(ctx, { exchangeAccountId, limit, offset })
  },
  async position(account: any, args: any, ctx: Context) {
    const { id: exchangeAccountId } = account
    const {
      input: { symbol },
    } = args
    return getExchangeAccountPosition(ctx, { exchangeAccountId, symbol })
  },
}

export const ExchangeAccountMutations = {
  async createExchangeAccount(parent: any, args: any, ctx: Context) {
    const {
      input: {
        membershipId, apiKey, apiSecret, exchange, groupId,
      },
    } = args

    return runCreateExchangeAccount(ctx, membershipId, apiKey, apiSecret, exchange, groupId)
  },

  async deleteExchangeAccount(parent: any, args: any, ctx: Context) {
    const { input: { id: accountId } } = args

    return runDeleteExchangeAccount(ctx, accountId)
  },

  async updateExchangeAccount(parent: any, args: any, ctx: Context) {
    const { input: { id: accountId, apiKey, apiSecret } } = args

    return runUpdateExchangeAccount(ctx, accountId, apiKey, apiSecret)
  },

  async toggleExchangeAccountActive(parent: any, args: any, ctx: Context) {
    const { input: { id: accountId } } = args

    return runToggleExchangeAccountActive(ctx, accountId)
  },
}
