import { Prisma, PrismaClient } from "@prisma/client"
import Bull from "bull";
import schedule from "node-schedule"
import { Market, Ticker } from "ccxt";
import { bitmex as CcxtBitmex } from "ccxt.pro"

let _bitmexClient: BitmexClient

interface BitmexCurrencyUpsertData {
  create: Prisma.BitmexCurrencyCreateInput
  update: Prisma.BitmexCurrencyUpdateInput
}

export async function initBitmex(prisma: PrismaClient) {
  const ccxtClient = new CcxtBitmex()
  if (process.env.APP_ENV !== "production") {
    ccxtClient.urls["api"] = ccxtClient.urls["test"]
  }

  _bitmexClient = new BitmexClient(ccxtClient, prisma)
  await _bitmexClient.start()
}

class BitmexClient {
  client: CcxtBitmex
  prisma: PrismaClient
  _loadMarketsQueue: Bull.Queue
  _fetchTickersQueue: Bull.Queue

  _loadMarketsJob: schedule.Job
  _fetchTickersJob: schedule.Job

  constructor(client: CcxtBitmex, prisma: PrismaClient) {
    this.client = client
    this.prisma = prisma
  }

  async start() {
    // On initial start, run this once
    await _loadCurrencyData(this.client, this.prisma)()

    await this.setupJobs()
  }

  async setupJobs() {
    this._loadMarketsJob = schedule.scheduleJob(
      "loadMarkets",
      "*/60 * * * *",  // every X minutes in */X
      _loadCurrencyData(this.client, this.prisma),
    )

    this._fetchTickersJob = schedule.scheduleJob(
      "fetchTickers",
      "*/30 * * * * *", // every X seconds in */X
      _fetchTickers(this.client, this.prisma),
    )
  }
}

function _loadCurrencyData(client: CcxtBitmex, prisma: PrismaClient) {
  return async () => {
    const allMarkets = await client.loadMarkets()

    const marketUpserts = Object.values(allMarkets)
      .map((market: Market) => {
        const data = createMarketData(market)
        return prisma.bitmexCurrency.upsert({
          create: data.create,
          update: data.update,
          where: {symbol: String(data.update.symbol)},
        })
      })

    await Promise.allSettled(marketUpserts)
  }
}

function _fetchTickers(client: CcxtBitmex, prisma: PrismaClient) {
  return async () => {
    const tickers = await client.fetchTickers()

    const tickerUpserts = Object.values(tickers)
      .filter((ticker: Ticker) => {
        return ticker.info.lastPrice !== undefined
      })
      .map((ticker: Ticker) => {
        return prisma.bitmexCurrency.update({
          data: {lastPrice: Number(ticker.info.lastPrice), markPrice: Number(ticker.info.markPrice), updatedAt: new Date()},
          where: {symbol: ticker.info.symbol},
        })
      })

    await Promise.allSettled(tickerUpserts)
  }
}

function createMarketData(market: Market): BitmexCurrencyUpsertData {
  const { symbol, underlying, quoteCurrency, lastPrice, markPrice, tickSize, maxPrice } = market.info
  const fractionalDigits = 0

  const symbolData = {
    symbol, underlying, quoteCurrency, active: market.active,
    maxPrice, lastPrice, markPrice, tickSize, fractionalDigits,
  }

  return {
    create: symbolData,
    update: symbolData,
  }
}
