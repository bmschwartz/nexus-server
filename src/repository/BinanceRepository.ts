import { BinanceCurrency } from "@prisma/client"
import { Context } from "src/context"

export const getTradableBinanceCurrencies = async (ctx: Context): Promise<BinanceCurrency[]> => {
  return ctx.prisma.binanceCurrency.findMany({ where: { status: "TRADING" } })
}

export const getBinanceCurrencyById = async (ctx: Context, id: string): Promise<BinanceCurrency | null> => {
  return ctx.prisma.binanceCurrency.findUnique({
    where: { id },
  })
}

export const getBinanceCurrency = async (ctx: Context, symbol: string): Promise<BinanceCurrency | null> => {
  return ctx.prisma.binanceCurrency.findUnique({ where: { symbol } })
}
