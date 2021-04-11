import Binance, { Binance as BinanceT, ExchangeInfo, Ticker } from "binance-api-node"
import { BinanceSymbolStatus, PrismaClient, Prisma } from "@prisma/client"
import Bull, { Job } from "bull"
import { SETTINGS } from "../settings"

const VALID_QUOTE_ASSETS = [
  "BTC", "ETH", "USDT", "BNB",
  "XRP", "TRX", "BUSD", "DAI",
]

const FETCH_CURRENCIES_JOB = "fetchCurrencies"
const FETCH_CURRENCIES_INTERVAL = 300000 // ms

const CURRENCY_UPDATE_DELAY_MS = 10000

let _client: BinanceT
let _prisma: PrismaClient

export async function initBinance(prisma: PrismaClient) {
  _client = Binance()
  _prisma = prisma

  const binanceClient = new BinanceClient(_client, _prisma)

  await _fetchCurrencyData()
  binanceClient.startTickerSocket()
}

class BinanceClient {
  client: BinanceT
  prisma: PrismaClient
  _fetchCurrenciesQueue: Bull.Queue

  constructor(client: BinanceT, prisma: PrismaClient) {
    this.client = client
    this.prisma = prisma

    this._fetchCurrenciesQueue = new Bull(
      "fetchCurrenciesQueue",
      SETTINGS["REDIS_URL"],
      { defaultJobOptions: { removeOnFail: true, removeOnComplete: true } },
    )
    this._fetchCurrenciesQueue.process(FETCH_CURRENCIES_JOB, _fetchCurrencyData)

    this._start()
  }

  async _start() {
    await this._fetchCurrenciesQueue.empty()
    await this._fetchCurrenciesQueue.add(FETCH_CURRENCIES_JOB, {}, { repeat: { every: FETCH_CURRENCIES_INTERVAL } })
  }

  startTickerSocket() {
    let lastUpdateTime = 0
    this.client.ws.allTickers(async (tickers: Ticker[]) => {
      if (!tickers.length || (tickers[0].eventTime - lastUpdateTime) < CURRENCY_UPDATE_DELAY_MS) {
        return
      }

      lastUpdateTime = tickers[0].eventTime

      await Promise.allSettled(tickers.map(async (ticker: Ticker) => {
        const existingSymbolCount = await this.prisma.binanceCurrency.count({ where: { symbol: ticker.symbol } })
        if (existingSymbolCount === 0) {
          return
        }

        const { symbol, priceChange, open: openPrice, low: lowPrice, high: highPrice, curDayClose: lastPrice, priceChangePercent } = ticker

        const data: Prisma.BinanceCurrencyUpdateInput = {
          priceChange, priceChangePercent, lowPrice, highPrice, openPrice, lastPrice, updatedAt: new Date(),
        }

        await this.prisma.binanceCurrency.update({ where: { symbol }, data })
      }))

    })
  }

}

async function _fetchCurrencyData(job?: Job) {
  const exchangeInfo: ExchangeInfo = await _client.exchangeInfo()
  if (!exchangeInfo) {
    console.error("Error fetching Binance ExchangeInfo")
    return
  }

  const symbols = exchangeInfo.symbols.filter(sym => VALID_QUOTE_ASSETS.includes(sym.quoteAsset))

  await Promise.allSettled(symbols.map(async (symbolInfo: any) => {
    const existingSymbolCount = await _prisma.binanceCurrency.count({ where: { symbol: symbolInfo.symbol } })

    if (existingSymbolCount > 0) {
      await _prisma.binanceCurrency.delete({ where: { symbol: symbolInfo.symbol } })
    }
    const { status, orderTypes, filters, permissions, ...restSymbolinfo } = symbolInfo

    const data: Prisma.BinanceCurrencyCreateInput = {
      status: BinanceSymbolStatus[status],
      ...mapOrderTypes(orderTypes),
      ...mapFilterTypes(filters),
      ...mapPermissionTypes(permissions),
      ...restSymbolinfo,
    }

    await _prisma.binanceCurrency.create({ data })
  }))
}

function mapOrderTypes(orderTypes: string[]): object {
  return {
    allowsLimit: orderTypes.includes("LIMIT"),
    allowsMarket: orderTypes.includes("MARKET"),
    allowsStopLoss: orderTypes.includes("STOP_LOSS"),
    allowsStopLossLimit: orderTypes.includes("STOP_LOSS_LIMIT"),
    allowsTakeProfit: orderTypes.includes("TAKE_PROFIT"),
    allowsTakeProfitLimit: orderTypes.includes("TAKE_PROFIT_LIMIT"),
    allowsLimitMaker: orderTypes.includes("LIMIT_MAKER"),
  }
}

function mapFilterTypes(filters: any[]): object {
  const filterMap = {}

  filters.forEach((filter: any) => {
    switch (filter.filterType) {
      case "PRICE_FILTER":
        filterMap["minPrice"] = filter["minPrice"]
        filterMap["maxPrice"] = filter["maxPrice"]
        filterMap["tickSize"] = filter["tickSize"]
        break;
      case "PERCENT_PRICE":
        filterMap["multiplierUp"] = filter["multiplierUp"]
        filterMap["multiplierDown"] = filter["multiplierDown"]
        filterMap["percentAvgPriceMins"] = filter["avgPriceMins"]
        break;
      case "LOT_SIZE":
        filterMap["minQty"] = filter["minQty"]
        filterMap["maxQty"] = filter["maxQty"]
        filterMap["stepSize"] = filter["stepSize"]
        break;
      case "MIN_NOTIONAL":
        filterMap["minNotional"] = filter["minNotional"]
        filterMap["applyToMarket"] = filter["applyToMarket"]
        filterMap["minNotionalAvgPriceMins"] = filter["avgPriceMins"]
        break;
      case "ICEBERG_PARTS":
        filterMap["icebergLimit"] = filter["limit"]
        break;
      case "MARKET_LOT_SIZE":
        filterMap["marketMinQty"] = filter["minQty"]
        filterMap["marketMaxQty"] = filter["maxQty"]
        filterMap["marketStepSize"] = filter["stepSize"]
        break;
      case "MAX_NUM_ALGO_ORDERS":
        filterMap["maxNumAlgoOrders"] = filter["maxNumAlgoOrders"]
        break;
      case "MAX_NUM_ORDERS":
        filterMap["maxNumOrders"] = filter["maxNumOrders"]
        break;
    }
  })

  return filterMap
}

function mapPermissionTypes(permissions: string[]): object {
  return {
    spotPermission: permissions.includes("SPOT"),
    marginPermission: permissions.includes("MARGIN"),
    leveragedPermission: permissions.includes("LEVERAGED"),
  }
}
