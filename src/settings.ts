import { exit } from "process"
import * as dotenv from "dotenv"

dotenv.config()

export const SETTINGS = {}

export function initSettings() {
  // Redis
  assignEnvVar("REDIS_URL", process.env.REDIS_URL)

  // RabbitMQ
  assignEnvVar("AMQP_URL", process.env.AMQP_URL)

  // RabbitMQ - Binance
  assignEnvVar("BINANCE_EXCHANGE", process.env.BINANCE_EXCHANGE)

  assignEnvVar("BINANCE_CREATE_ACCOUNT_QUEUE", process.env.BINANCE_CREATE_ACCOUNT_QUEUE)
  assignEnvVar("BINANCE_ACCOUNT_CREATED_QUEUE", process.env.BINANCE_ACCOUNT_CREATED_QUEUE)
  assignEnvVar("BINANCE_CREATE_ACCOUNT_CMD_KEY", process.env.BINANCE_CREATE_ACCOUNT_CMD_KEY)
  assignEnvVar("BINANCE_EVENT_ACCOUNT_CREATED_KEY", process.env.BINANCE_EVENT_ACCOUNT_CREATED_KEY)

  assignEnvVar("BINANCE_ACCOUNT_UPDATED_QUEUE", process.env.BINANCE_ACCOUNT_UPDATED_QUEUE)
  assignEnvVar("BINANCE_EVENT_ACCOUNT_UPDATED_KEY", process.env.BINANCE_EVENT_ACCOUNT_UPDATED_KEY)
  assignEnvVar("BINANCE_UPDATE_ACCOUNT_CMD_KEY_PREFIX", process.env.BINANCE_UPDATE_ACCOUNT_CMD_KEY_PREFIX)

  assignEnvVar("BINANCE_ACCOUNT_DELETED_QUEUE", process.env.BINANCE_ACCOUNT_DELETED_QUEUE)
  assignEnvVar("BINANCE_EVENT_ACCOUNT_DELETED_KEY", process.env.BINANCE_EVENT_ACCOUNT_DELETED_KEY)
  assignEnvVar("BINANCE_DELETE_ACCOUNT_CMD_KEY_PREFIX", process.env.BINANCE_DELETE_ACCOUNT_CMD_KEY_PREFIX)

  assignEnvVar("BINANCE_ACCOUNT_HEARTBEAT_QUEUE", process.env.BINANCE_ACCOUNT_HEARTBEAT_QUEUE)
  assignEnvVar("BINANCE_EVENT_ACCOUNT_HEARTBEAT_KEY", process.env.BINANCE_EVENT_ACCOUNT_HEARTBEAT_KEY)

  // RabbitMQ - Bitmex
  assignEnvVar("BITMEX_EXCHANGE", process.env.BITMEX_EXCHANGE)

  assignEnvVar("BITMEX_CREATE_ACCOUNT_QUEUE", process.env.BITMEX_CREATE_ACCOUNT_QUEUE)
  assignEnvVar("BITMEX_ACCOUNT_CREATED_QUEUE", process.env.BITMEX_ACCOUNT_CREATED_QUEUE)
  assignEnvVar("BITMEX_CREATE_ACCOUNT_CMD_KEY", process.env.BITMEX_CREATE_ACCOUNT_CMD_KEY)
  assignEnvVar("BITMEX_EVENT_ACCOUNT_CREATED_KEY", process.env.BITMEX_EVENT_ACCOUNT_CREATED_KEY)

  assignEnvVar("BITMEX_ACCOUNT_UPDATED_QUEUE", process.env.BITMEX_ACCOUNT_UPDATED_QUEUE)
  assignEnvVar("BITMEX_EVENT_ACCOUNT_UPDATED_KEY", process.env.BITMEX_EVENT_ACCOUNT_UPDATED_KEY)
  assignEnvVar("BITMEX_UPDATE_ACCOUNT_CMD_KEY_PREFIX", process.env.BITMEX_UPDATE_ACCOUNT_CMD_KEY_PREFIX)

  assignEnvVar("BITMEX_ACCOUNT_DELETED_QUEUE", process.env.BITMEX_ACCOUNT_DELETED_QUEUE)
  assignEnvVar("BITMEX_EVENT_ACCOUNT_DELETED_KEY", process.env.BITMEX_EVENT_ACCOUNT_DELETED_KEY)
  assignEnvVar("BITMEX_DELETE_ACCOUNT_CMD_KEY_PREFIX", process.env.BITMEX_DELETE_ACCOUNT_CMD_KEY_PREFIX)

  assignEnvVar("BITMEX_ACCOUNT_HEARTBEAT_QUEUE", process.env.BITMEX_ACCOUNT_HEARTBEAT_QUEUE)
  assignEnvVar("BITMEX_EVENT_ACCOUNT_HEARTBEAT_KEY", process.env.BITMEX_EVENT_ACCOUNT_HEARTBEAT_KEY)

  assignEnvVar("BITMEX_ORDER_CREATED_QUEUE", process.env.BITMEX_ORDER_CREATED_QUEUE)
  assignEnvVar("BITMEX_CREATE_ORDER_CMD_PREFIX", process.env.BITMEX_CREATE_ORDER_CMD_PREFIX)
  assignEnvVar("BITMEX_EVENT_ORDER_CREATED_KEY", process.env.BITMEX_EVENT_ORDER_CREATED_KEY)
  assignEnvVar("BITMEX_ORDER_UPDATED_QUEUE", process.env.BITMEX_ORDER_UPDATED_QUEUE)
  assignEnvVar("BITMEX_EVENT_ORDER_UPDATED_KEY", process.env.BITMEX_EVENT_ORDER_UPDATED_KEY)
  assignEnvVar("BITMEX_UPDATE_ORDER_CMD_KEY_PREFIX", process.env.BITMEX_UPDATE_ORDER_CMD_KEY_PREFIX)
  assignEnvVar("BITMEX_ORDER_CANCELED_QUEUE", process.env.BITMEX_ORDER_CANCELED_QUEUE)
  assignEnvVar("BITMEX_EVENT_ORDER_CANCELED_KEY", process.env.BITMEX_EVENT_ORDER_CANCELED_KEY)
  assignEnvVar("BITMEX_CANCEL_ORDER_CMD_KEY_PREFIX", process.env.BITMEX_CANCEL_ORDER_CMD_KEY_PREFIX)

  assignEnvVar("BITMEX_POSITION_UPDATED_QUEUE", process.env.BITMEX_POSITION_UPDATED_QUEUE)
  assignEnvVar("BITMEX_EVENT_POSITION_UPDATED_KEY", process.env.BITMEX_EVENT_POSITION_UPDATED_KEY)
  assignEnvVar("BITMEX_POSITION_CLOSED_QUEUE", process.env.BITMEX_POSITION_CLOSED_QUEUE)
  assignEnvVar("BITMEX_CLOSE_POSITION_CMD_PREFIX", process.env.BITMEX_CLOSE_POSITION_CMD_PREFIX)
  assignEnvVar("BITMEX_EVENT_POSITION_CLOSED_KEY", process.env.BITMEX_EVENT_POSITION_CLOSED_KEY)
  assignEnvVar("BITMEX_POSITION_ADDED_STOP_QUEUE", process.env.BITMEX_POSITION_ADDED_STOP_QUEUE)
  assignEnvVar("BITMEX_ADD_STOP_POSITION_CMD_PREFIX", process.env.BITMEX_ADD_STOP_POSITION_CMD_PREFIX)
  assignEnvVar("BITMEX_EVENT_POSITION_ADDED_STOP_KEY", process.env.BITMEX_EVENT_POSITION_ADDED_STOP_KEY)
  assignEnvVar("BITMEX_POSITION_ADDED_TSL_QUEUE", process.env.BITMEX_POSITION_ADDED_TSL_QUEUE)
  assignEnvVar("BITMEX_ADD_TSL_POSITION_CMD_PREFIX", process.env.BITMEX_ADD_TSL_POSITION_CMD_PREFIX)
  assignEnvVar("BITMEX_EVENT_POSITION_ADDED_TSL_KEY", process.env.BITMEX_EVENT_POSITION_ADDED_TSL_KEY)

  // RabbitMQ - Group
  assignEnvVar("GROUP_EXCHANGE", process.env.GROUP_EXCHANGE)

  assignEnvVar("GROUP_MEMBERSHIP_DELETED_QUEUE", process.env.GROUP_MEMBERSHIP_DELETED_QUEUE)
  assignEnvVar("GROUP_EVENT_MEMBERSHIP_DELETED_KEY", process.env.GROUP_EVENT_MEMBERSHIP_DELETED_KEY)
}

function assignEnvVar(name: string, envKey?: any) {
  const value: string | undefined = envKey
  if (!value) {
    console.error(`Missing ${name}!`)
    exit(1)
  } else {
    SETTINGS[name] = value
  }
}
