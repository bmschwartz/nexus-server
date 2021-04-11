import { Context } from "../../context"
import { getBinanceCurrencyById, getTradableBinanceCurrencies } from "../../repository/BinanceRepository"

export const BinanceQueries = {
  async binanceCurrencies(parent: any, args: any, ctx: Context) {
    return getTradableBinanceCurrencies(ctx)
  },
}

export const BinanceResolvers = {
  async __resolveReference(parent: any, args: any, ctx: Context) {
    return getBinanceCurrencyById(ctx, parent.id)
  },
}
