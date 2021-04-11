import * as _ from "lodash"
import * as Amqp from "amqp-ts"
import { PrismaClient, OperationType, Prisma, PositionSide, OrderStatus } from "@prisma/client";
import { SETTINGS } from "../settings";
import { createAsyncOperation, completeAsyncOperation } from "../repository/AsyncOperationRepository";
import { deleteExchangeAccountsForMembership } from "../repository/ExchangeAccountRepository";
import { logger } from "../logger";

export const ASYNC_OPERATION_TTL = 10 * 60 * 1000 // ms

interface Order {
  orderId: string
  status: string
  clOrderId: string
  remoteOrderId: string
  orderQty: number
  filled: number
  price: number
  avgPrice: number
  stopPrice: number
  pegOffsetValue: number
  timestamp: string
}

interface OrderOperationResponse {
  success: boolean
  errors?: string[]
  orders?: object
}

interface CancelOrderOperationResponse {
  success: boolean
  order?: Order
  error?: string
}

interface OrderUpdateMessage {
  order: Order
}

let _db: PrismaClient

export class MessageClient {
  _db: PrismaClient
  _recvConn: Amqp.Connection
  _sendConn: Amqp.Connection

  // Command Queues
  _createBinanceAccountQueue?: Amqp.Queue
  _createBitmexAccountQueue?: Amqp.Queue

  /* Order Queues */
  _bitmexOrderCreatedQueue?: Amqp.Queue
  _bitmexOrderUpdatedQueue?: Amqp.Queue
  _bitmexOrderCanceledQueue?: Amqp.Queue

  /* Position Queues */
  _bitmexPositionUpdatedQueue?: Amqp.Queue
  _bitmexPositionClosedQueue?: Amqp.Queue
  _bitmexPositionAddedStopQueue?: Amqp.Queue
  _bitmexPositionAddedTslQueue?: Amqp.Queue

  /* Group Queues */
  _groupMembershipDeletedQueue?: Amqp.Queue

  // Exchanges
  _recvBinanceExchange?: Amqp.Exchange
  _sendBinanceExchange?: Amqp.Exchange

  _recvBitmexExchange?: Amqp.Exchange
  _sendBitmexExchange?: Amqp.Exchange

  _recvGroupExchange?: Amqp.Exchange

  constructor(prisma: PrismaClient) {
    _db = prisma
    this._db = prisma
    this._recvConn = new Amqp.Connection(SETTINGS["AMQP_URL"])
    this._sendConn = new Amqp.Connection(SETTINGS["AMQP_URL"])

    this._connectBinanceMessaging()
    this._connectBitmexMessaging()
    this._connectGroupMessaging()
  }

  async _connectBitmexMessaging() {
    /* Exchanges */
    this._recvBitmexExchange = this._recvConn.declareExchange(SETTINGS["BITMEX_EXCHANGE"], "topic", { durable: true })
    this._sendBitmexExchange = this._sendConn.declareExchange(SETTINGS["BITMEX_EXCHANGE"], "topic", { durable: true })

    /* Command queues */
    this._createBitmexAccountQueue = this._sendConn.declareQueue(SETTINGS["BITMEX_CREATE_ACCOUNT_QUEUE"], { durable: true })

    /* Event queues */
    /* Order Events */
    this._bitmexOrderCreatedQueue = this._recvConn.declareQueue(SETTINGS["BITMEX_ORDER_CREATED_QUEUE"], { durable: true })
    await this._bitmexOrderCreatedQueue.bind(this._recvBitmexExchange, SETTINGS["BITMEX_EVENT_ORDER_CREATED_KEY"])
    await this._bitmexOrderCreatedQueue.activateConsumer(
      async (message: Amqp.Message) => await this._orderCreatedConsumer(this._db, message),
    )

    this._bitmexOrderUpdatedQueue = this._recvConn.declareQueue(SETTINGS["BITMEX_ORDER_UPDATED_QUEUE"], { durable: true })
    await this._bitmexOrderUpdatedQueue.bind(this._recvBitmexExchange, SETTINGS["BITMEX_EVENT_ORDER_UPDATED_KEY"])
    await this._bitmexOrderUpdatedQueue.activateConsumer(
      async (message: Amqp.Message) => await this._orderUpdatedConsumer(this._db, message),
    )

    this._bitmexOrderCanceledQueue = this._recvConn.declareQueue(SETTINGS["BITMEX_ORDER_CANCELED_QUEUE"], { durable: true })
    await this._bitmexOrderCanceledQueue.bind(this._recvBitmexExchange, SETTINGS["BITMEX_EVENT_ORDER_CANCELED_KEY"])
    await this._bitmexOrderCanceledQueue.activateConsumer(
      async (message: Amqp.Message) => await this._orderCanceledConsumer(this._db, message),
    )

    /* Position Events */
    this._bitmexPositionUpdatedQueue = this._recvConn.declareQueue(SETTINGS["BITMEX_POSITION_UPDATED_QUEUE"], { durable: true })
    await this._bitmexPositionUpdatedQueue.bind(this._recvBitmexExchange, SETTINGS["BITMEX_EVENT_POSITION_UPDATED_KEY"])
    await this._bitmexPositionUpdatedQueue.activateConsumer(
      async (message: Amqp.Message) => await this._positionUpdatedConsumer(this._db, message),
    )

    this._bitmexPositionClosedQueue = this._recvConn.declareQueue(SETTINGS["BITMEX_POSITION_CLOSED_QUEUE"], { durable: true })
    await this._bitmexPositionClosedQueue.bind(this._recvBitmexExchange, SETTINGS["BITMEX_EVENT_POSITION_CLOSED_KEY"])
    await this._bitmexPositionClosedQueue.activateConsumer(
      async (message: Amqp.Message) => await this._positionClosedConsumer(this._db, message),
    )

    this._bitmexPositionAddedStopQueue = this._recvConn.declareQueue(SETTINGS["BITMEX_POSITION_ADDED_STOP_QUEUE"], { durable: true })
    await this._bitmexPositionAddedStopQueue.bind(this._recvBitmexExchange, SETTINGS["BITMEX_EVENT_POSITION_ADDED_STOP_KEY"])
    await this._bitmexPositionAddedStopQueue.activateConsumer(
      async (message: Amqp.Message) => await this._positionAddedStopConsumer(this._db, message),
    )

    this._bitmexPositionAddedTslQueue = this._recvConn.declareQueue(SETTINGS["BITMEX_POSITION_ADDED_TSL_QUEUE"], { durable: true })
    await this._bitmexPositionAddedTslQueue.bind(this._recvBitmexExchange, SETTINGS["BITMEX_EVENT_POSITION_ADDED_TSL_KEY"])
    await this._bitmexPositionAddedTslQueue.activateConsumer(
      async (message: Amqp.Message) => await this._positionAddedTslConsumer(this._db, message),
    )
  }

  async _connectBinanceMessaging() {
    /* Exchanges */
    this._recvBinanceExchange = this._recvConn.declareExchange(SETTINGS["BINANCE_EXCHANGE"], "topic", { durable: true })
    this._sendBinanceExchange = this._sendConn.declareExchange(SETTINGS["BINANCE_EXCHANGE"], "topic", { durable: true })

    /* Command queues */
    this._createBinanceAccountQueue = this._sendConn.declareQueue(SETTINGS["BINANCE_CREATE_ACCOUNT_QUEUE"], { durable: true })
  }

  async _connectGroupMessaging() {
    /* Exchanges */
    this._recvGroupExchange = this._recvConn.declareExchange(SETTINGS["GROUP_EXCHANGE"], "topic", { durable: true })

    /* Event queues */
    this._groupMembershipDeletedQueue = this._recvConn.declareQueue(SETTINGS["GROUP_MEMBERSHIP_DELETED_QUEUE"], { durable: true })
    await this._groupMembershipDeletedQueue.bind(this._recvGroupExchange, SETTINGS["GROUP_EVENT_MEMBERSHIP_DELETED_KEY"])
    await this._groupMembershipDeletedQueue.activateConsumer(
      async (message: Amqp.Message) => await this._groupMembershipDeletedConsumer(this._db, message),
    )
  }

  async _orderCreatedConsumer(prisma: PrismaClient, message: Amqp.Message) {
    const { success, orders, errors }: OrderOperationResponse = message.getContent()
    const { correlationId: operationId } = message.properties

    logger.debug({ message: "[_orderCreatedConsumer] Received message" })

    if (!operationId) {
      logger.info({ message: "[_orderCreatedConsumer] Missing operationId" })
      message.reject(false)
      return
    }

    const op = await completeAsyncOperation(prisma, operationId, success, errors)

    if (!op) {
      message.reject(false)
      return
    }

    if (success && orders && op) {
      for (const order of Object.values(orders)) {
        const {
          status: orderStatus, clOrderId, orderQty: quantity, filled, remoteOrderId,
          stopPrice, avgPrice, price, pegOffsetValue, timestamp: lastTimestamp,
        }: Order = order

        let status: OrderStatus
        if (orderStatus === "Filled") {
          status = OrderStatus.FILLED
        } else if (orderStatus === "PartiallyFilled") {
          status = OrderStatus.PARTIALLY_FILLED
        } else if (orderStatus === "Canceled") {
          status = OrderStatus.CANCELED
        } else if (orderStatus === "Rejected") {
          status = OrderStatus.REJECTED
        } else {
          status = OrderStatus.NEW
        }
        try {
          const existingOrder = await prisma.order.findUnique({ where: { clOrderId }, select: { lastTimestamp: true } })

          if (!existingOrder) {
            return
          }

          const currentLastTimestamp = existingOrder.lastTimestamp

          if (currentLastTimestamp && currentLastTimestamp > new Date(lastTimestamp)) {
            return
          }

          await prisma.order.update({
            where: { clOrderId },
            data: {
              status, remoteOrderId, quantity, filledQty: filled, price, avgPrice,
              stopPrice, pegOffsetValue, lastTimestamp, updatedAt: new Date(),
            },
          })
        } catch (e) {
          logger.error({ message: "[_orderCreatedConsumer] Update error", error: e })
        }
      }
    } else if (errors && op) {
      try {
        if (!op.payload) {
          return
        }
        const ordersPayload = op.payload["orders"]
        if (!ordersPayload) {
          return
        }

        const orderUpdates = Object.entries(errors).map(([key, error]) => {
          const orderData = ordersPayload[key]
          if (!orderData) {
            return null
          }
          const orderId: string = orderData["id"]
          return this._db.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.REJECTED, error, updatedAt: new Date() },
          })
        }).filter(Boolean)

        await Promise.all(orderUpdates)

      } catch (e) {
        logger.error({ message: "[_orderCreatedConsumer] Update error", error: e })
      }
    }

    message.ack()
  }

  async _orderUpdatedConsumer(prisma: PrismaClient, message: Amqp.Message) {
    const { order }: OrderUpdateMessage = message.getContent()

    logger.debug({ message: "[_orderUpdatedConsumer] Received message" })

    if (order) {
      const { status: orderStatus, clOrderId, remoteOrderId, orderQty: quantity, filled,
        stopPrice, avgPrice, price, pegOffsetValue, timestamp: lastTimestamp,
      }: Order = order

      let status: OrderStatus
      if (orderStatus === "Filled") {
        status = OrderStatus.FILLED
      } else if (orderStatus === "PartiallyFilled") {
        status = OrderStatus.PARTIALLY_FILLED
      } else if (orderStatus === "Canceled") {
        status = OrderStatus.CANCELED
      } else if (orderStatus === "Rejected") {
        status = OrderStatus.REJECTED
      } else {
        status = OrderStatus.NEW
      }

      try {
        const existingOrder = await prisma.order.findUnique({ where: { clOrderId }, select: { lastTimestamp: true } })

        if (!existingOrder) {
          message.reject()
          return
        }

        const currentLastTimestamp = existingOrder?.lastTimestamp
        if (currentLastTimestamp === undefined || currentLastTimestamp === null) {
          message.reject(true)
          return
        }

        let updateData
        switch (status) {
          case OrderStatus.CANCELED:
          case OrderStatus.REJECTED:
            updateData = { status, lastTimestamp }
            break
          default:
            const updateFields = {
              status, clOrderId, remoteOrderId, quantity, filledQty: filled,
              stopPrice, avgPrice, price, pegOffsetValue, lastTimestamp,
            }

            updateData = _.pickBy(updateFields, (val, key) => {
              return !(val === undefined || val === null)
            })
        }

        await prisma.order.update({
          where: { clOrderId },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        })
      } catch (e) {
        logger.error({ message: "[_orderUpdatedConsumer] Error", order })
      }
    }

    message.ack()
  }

  async _orderCanceledConsumer(prisma: PrismaClient, message: Amqp.Message) {
    const { success, order, error }: CancelOrderOperationResponse = message.getContent()
    const { correlationId: operationId } = message.properties

    logger.debug({ message: "[_orderCanceledConsumer] Received message" })

    if (!operationId) {
      logger.error({ message: "[_orderCanceledConsumer] Missing operationId" })
      message.reject(false)
      return
    }

    const op = await completeAsyncOperation(prisma, operationId, success, [error])

    if (!op) {
      message.reject(false)
      return
    }

    if (op && order) {
      const {
        status: orderStatus, clOrderId, remoteOrderId, orderQty: quantity, filled,
        stopPrice, avgPrice, price, pegOffsetValue, timestamp: lastTimestamp,
      }: Order = order

      let status: OrderStatus
      if (orderStatus === "Filled") {
        status = OrderStatus.FILLED
      } else if (orderStatus === "PartiallyFilled") {
        status = OrderStatus.PARTIALLY_FILLED
      } else if (orderStatus === "Canceled") {
        status = OrderStatus.CANCELED
      } else if (orderStatus === "Rejected") {
        status = OrderStatus.REJECTED
      } else {
        status = OrderStatus.NEW
      }

      let updateData

      try {
        const existingOrder = await prisma.order.findUnique({ where: { clOrderId }, select: { lastTimestamp: true } })

        if (!existingOrder) {
          message.reject()
          return
        }

        const currentLastTimestamp = existingOrder?.lastTimestamp
        if (currentLastTimestamp === undefined || currentLastTimestamp === null) {
          message.reject(true)
          return
        }

        switch (status) {
          case OrderStatus.CANCELED:
          case OrderStatus.REJECTED:
            updateData = { status, lastTimestamp }
            break
          default:
            updateData = {
              status, remoteOrderId, quantity, filledQty: filled, price, stopPrice, pegOffsetValue, avgPrice, lastTimestamp,
            }
        }

        await prisma.order.update({
          where: { clOrderId },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        })
      } catch (e) {
        logger.error({ message: "[_orderCanceledConsumer] Update error", error: e, clOrderId, data: updateData })
      }
    } else if (error && op) {
      try {
        if (!op.payload) {
          message.reject()
          return
        }
        const orderId = op.payload["orderId"]

        if (!orderId) {
          message.reject()
          return
        }

        await prisma.order.update({
          where: { remoteOrderId: orderId },
          data: {
            error,
            updatedAt: new Date(),
          },
        })
      } catch (e) {
        logger.error({ message: "[_orderCanceledConsumer] Update error", error: e })
      }
    }

    message.ack()
  }

  async _positionUpdatedConsumer(prisma: PrismaClient, message: Amqp.Message) {
    const { success, positions: rawPositions, accountId, exchange, error } = message.getContent()

    logger.debug({ message: "[_positionUpdatedConsumer] Received messasge" })

    if (error) {
      message.reject(false)
      return
    }

    if (success) {
      const exchangeAccountId = accountId
      const positions = rawPositions.map(JSON.parse)

      const upserts = positions.map(async (position) => {
        const {
          symbol,
          is_open: isOpen,
          current_quantity: quantity,
          leverage,
          mark_price: markPrice,
          margin,
          average_entry_price: avgPrice,
          maintenance_margin: maintenanceMargin,
        } = position
        const existingPosition = await prisma.position.findUnique({
          where: {
            Position_symbol_exchangeAccountId_key: { symbol, exchangeAccountId },
          },
        })

        const side = (
          (quantity !== undefined ? quantity : existingPosition?.quantity)) >= 0
          ? PositionSide.LONG
          : PositionSide.SHORT

        const inputData = {
          side,
          symbol,
          avgPrice: !!avgPrice ? avgPrice : existingPosition?.avgPrice,
          quantity: quantity !== undefined ? quantity : existingPosition?.quantity,
          exchange: exchange || existingPosition?.exchange,
          isOpen: isOpen !== undefined ? isOpen : existingPosition?.isOpen,
          leverage: (leverage !== undefined && leverage !== null) ? leverage : existingPosition?.leverage,
          markPrice: markPrice !== undefined ? markPrice : existingPosition?.markPrice,
          margin: margin !== undefined ? margin : existingPosition?.margin,
          maintenanceMargin: maintenanceMargin !== undefined ? maintenanceMargin : existingPosition?.maintenanceMargin,
        }
        const create: Prisma.PositionCreateInput = {
          ...inputData,
          exchangeAccount: { connect: { id: exchangeAccountId } },
        }
        const update: Prisma.PositionUpdateInput = {
          ...inputData,
          updatedAt: new Date(),
          exchangeAccount: { connect: { id: exchangeAccountId } },
        }

        return prisma.position.upsert({
          create,
          update,
          where: { Position_symbol_exchangeAccountId_key: { exchangeAccountId, symbol } },
        })
      })

      await Promise.allSettled(upserts)
    }

    message.ack()
  }

  async _positionClosedConsumer(prisma: PrismaClient, message: Amqp.Message) {
    await this._orderCreatedConsumer(prisma, message)
  }

  async _positionAddedStopConsumer(prisma: PrismaClient, message: Amqp.Message) {
    message.ack()
  }

  async _positionAddedTslConsumer(prisma: PrismaClient, message: Amqp.Message) {
    message.ack()
  }

  async _groupMembershipDeletedConsumer(prisma: PrismaClient, message: Amqp.Message) {
    const { membershipId } = message.getContent()

    await deleteExchangeAccountsForMembership(prisma, this, membershipId)
    message.ack()
  }

  async sendCreateBitmexAccount(accountId: string, apiKey: string, apiSecret: string): Promise<string> {
    const payload = { accountId, apiKey, apiSecret }

    logger.info({
      message: "[sendCreateBitmexAccount] Sending message",
      accountId,
      apiKey: apiKey.length > 0 ? `${apiKey.length} characters` : "Not Present",
      apiSecret: apiSecret.length > 0 ? `${apiSecret.length} characters` : "Not Present",
    })
    const op = await createAsyncOperation(this._db, { payload }, OperationType.CREATE_BITMEX_ACCOUNT)

    if (!op) {
      logger.error({ message: "[sendCreateBitmexAccount] Error creating async op", accountId })
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, SETTINGS["BITMEX_CREATE_ACCOUNT_CMD_KEY"])

    return op.id
  }

  async sendUpdateBitmexAccount(accountId: string, apiKey: string, apiSecret: string) {
    const payload = { accountId, apiKey, apiSecret }

    logger.info({
      message: "[sendUpdateBitmexAccount] Sending message",
      accountId,
      apiKey: apiKey.length > 0 ? `${apiKey.length} characters` : "Not Present",
      apiSecret: apiSecret.length > 0 ? `${apiSecret.length} characters` : "Not Present",
    })
    const op = await createAsyncOperation(this._db, { payload }, OperationType.UPDATE_BITMEX_ACCOUNT)

    if (!op) {
      logger.error({ message: "[sendUpdateBitmexAccount] Error creating async op", accountId })
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, `${SETTINGS["BITMEX_UPDATE_ACCOUNT_CMD_KEY_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendDeleteBitmexAccount(accountId: string, disabling: boolean, clearing: boolean) {
    const payload = { accountId }

    let opType: OperationType
    if (disabling) {
      opType = OperationType.DISABLE_BITMEX_ACCOUNT
    } else if (clearing) {
      opType = OperationType.CLEAR_BITMEX_NODE
    } else {
      opType = OperationType.DELETE_BITMEX_ACCOUNT
    }

    logger.info({
      message: "[sendDeleteBitmexAccount] Sending message",
      accountId,
      opType,
    })

    const op = await createAsyncOperation(this._db, { payload }, opType)

    if (!op) {
      logger.error({ message: "[sendDeleteBitmexAccount] Error creating async op", accountId })
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, `${SETTINGS["BITMEX_DELETE_ACCOUNT_CMD_KEY_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendCreateBinanceAccount(accountId: string, apiKey: string, apiSecret: string): Promise<string> {
    const payload = { accountId, apiKey, apiSecret }

    logger.info({
      message: "[sendCreateBinanceAccount] Sending message",
      accountId,
      apiKey: apiKey.length > 0 ? `${apiKey.length} characters` : "Not Present",
      apiSecret: apiSecret.length > 0 ? `${apiSecret.length} characters` : "Not Present",
    })

    const op = await createAsyncOperation(this._db, { payload }, OperationType.CREATE_BINANCE_ACCOUNT)

    if (!op) {
      logger.error({ message: "[sendCreateBinanceAccount] Error creating async op", accountId })
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBinanceExchange?.send(message, SETTINGS["BINANCE_CREATE_ACCOUNT_CMD_KEY"])

    return op.id
  }

  async sendUpdateBinanceAccount(accountId: string, apiKey: string, apiSecret: string) {
    const payload = { accountId, apiKey, apiSecret }

    logger.info({
      message: "[sendUpdateBinanceAccount] Sending message",
      accountId,
      apiKey: apiKey.length > 0 ? `${apiKey.length} characters` : "Not Present",
      apiSecret: apiSecret.length > 0 ? `${apiSecret.length} characters` : "Not Present",
    })

    const op = await createAsyncOperation(this._db, { payload }, OperationType.UPDATE_BINANCE_ACCOUNT)

    if (!op) {
      logger.error({ message: "[sendUpdateBinanceAccount] Error creating async op", accountId })
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBinanceExchange?.send(message, `${SETTINGS["BINANCE_UPDATE_ACCOUNT_CMD_KEY_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendDeleteBinanceAccount(accountId: string, disabling?: boolean) {
    const payload = { accountId }

    const opType = disabling ? OperationType.DISABLE_BINANCE_ACCOUNT : OperationType.DELETE_BINANCE_ACCOUNT

    logger.info({
      message: "[sendDeleteBinanceAccount] Sending message",
      accountId,
      opType,
    })

    const op = await createAsyncOperation(this._db, { payload }, opType)

    if (!op) {
      logger.error({ message: "[sendDeleteBinanceAccount] Error creating async op", accountId })
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBinanceExchange?.send(message, `${SETTINGS["BINANCE_DELETE_ACCOUNT_CMD_KEY_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendCreateBitmexOrder(accountId: string, orders: any): Promise<string> {
    const payload = { accountId, orders }

    logger.info({
      message: "[sendCreateBitmexOrder] Sending message",
      accountId,
    })

    const op = await createAsyncOperation(this._db, { payload }, OperationType.CREATE_BITMEX_ORDER)

    if (!op) {
      logger.error({ message: "[sendCreateBitmexOrder] Error creating async op", accountId })
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, `${SETTINGS["BITMEX_CREATE_ORDER_CMD_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendUpdateBitmexOrder(accountId: string, data: any) {
    const { orderId } = data
    const payload = { accountId, orderId }

    const op = await createAsyncOperation(this._db, { payload }, OperationType.UPDATE_BITMEX_ORDER)

    logger.info({
      message: "[sendUpdateBitmexOrder] Sending message",
      accountId,
    })

    if (!op) {

      logger.error({
        message: "[sendCreateBitmexOrder] Error creating async op",
        accountId,
      })

      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, `${SETTINGS["BITMEX_UPDATE_ORDER_CMD_KEY_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendCancelBitmexOrder(accountId: string, orderId: string) {
    const payload = { accountId, orderId }

    logger.info({
      message: "[sendCancelBitmexOrder] Sending message",
      accountId,
      orderId,
    })

    const opType = OperationType.CANCEL_BITMEX_ORDER

    const op = await createAsyncOperation(this._db, { payload }, opType)

    if (!op) {
      logger.error({
        message: "[sendCancelBitmexOrder] Error creating async op",
        accountId,
        orderId,
      })

      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, `${SETTINGS["BITMEX_CANCEL_ORDER_CMD_KEY_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendCloseBitmexPosition(accountId: string, orders: any) {
    const payload = { accountId, orders }

    logger.info({
      message: "[sendCloseBitmexPosition] Sending message",
      accountId,
    })

    const op = await createAsyncOperation(this._db, { payload }, OperationType.CLOSE_BITMEX_POSITION)

    if (!op) {
      logger.error({
        message: "[sendCloseBitmexPosition] Error creating async op",
        accountId,
      })

      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, `${SETTINGS["BITMEX_CLOSE_POSITION_CMD_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendAddStopBitmexPosition(accountId: string, data: any) {
    const payload = { accountId, ...data }

    logger.info({
      message: "[sendAddStopBitmexPosition] Sending message",
      accountId,
    })

    const op = await createAsyncOperation(this._db, { payload }, OperationType.ADD_STOP_BITMEX_POSITION)

    if (!op) {
      logger.error({
        message: "[sendAddStopBitmexPosition] Error creating async op",
        accountId,
      })
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, `${SETTINGS["BITMEX_ADD_STOP_POSITION_CMD_PREFIX"]}${accountId}`)

    return op.id
  }

  async sendAddTslBitmexPosition(accountId: string, data: any) {
    const payload = { accountId, ...data }

    logger.info({
      message: "[sendAddTslBitmexPosition] Sending message",
      accountId,
    })

    const op = await createAsyncOperation(this._db, { payload }, OperationType.ADD_TSL_BITMEX_POSITION)

    if (!op) {
      throw new Error("Could not create asyncOperation")
    }

    const message = new Amqp.Message(JSON.stringify({ ...payload, timestamp: new Date().getTime() }),
      { persistent: true, correlationId: String(op.id), expiration: ASYNC_OPERATION_TTL },
    )
    this._sendBitmexExchange?.send(message, `${SETTINGS["BITMEX_ADD_TSL_POSITION_CMD_PREFIX"]}${accountId}`)

    return op.id
  }
}
