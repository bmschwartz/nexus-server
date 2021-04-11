import { getTradableBitmexCurrencies, getBitmexCurrencyById } from "../../repository/BitmexRepository"
import { Context } from "../../context"

export const BitmexQueries = {
  async bitmexCurrencies(parent: any, args: any, ctx: Context) {
    return getTradableBitmexCurrencies(ctx)
  },
}

export const BitmexResolvers = {
  async __resolveReference(parent: any, args: any, ctx: Context) {
    return getBitmexCurrencyById(ctx, parent.id)
  },
}
