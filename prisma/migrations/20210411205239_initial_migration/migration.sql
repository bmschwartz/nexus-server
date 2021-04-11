-- CreateEnum
CREATE TYPE "BinanceSymbolStatus" AS ENUM ('PRE_TRADING', 'TRADING', 'POST_TRADING', 'END_OF_DAY', 'HALT', 'AUCTION_MATCH', 'BREAK');

-- CreateEnum
CREATE TYPE "Exchange" AS ENUM ('BINANCE', 'BITMEX');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'FILLED', 'PARTIALLY_FILLED', 'CANCELED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT');

-- CreateEnum
CREATE TYPE "PositionSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "StopTriggerType" AS ENUM ('LAST_PRICE', 'MARK_PRICE');

-- CreateEnum
CREATE TYPE "PegPriceType" AS ENUM ('LastPeg', 'MidPricePeg', 'MarketPeg', 'PrimaryPeg', 'TrailingStopPeg');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('CREATE_BINANCE_ORDER', 'UPDATE_BINANCE_ORDER', 'CANCEL_BINANCE_ORDER', 'CREATE_BINANCE_ACCOUNT', 'UPDATE_BINANCE_ACCOUNT', 'DELETE_BINANCE_ACCOUNT', 'DISABLE_BINANCE_ACCOUNT', 'CREATE_BITMEX_ORDER', 'UPDATE_BITMEX_ORDER', 'CANCEL_BITMEX_ORDER', 'CREATE_BITMEX_ACCOUNT', 'UPDATE_BITMEX_ACCOUNT', 'DELETE_BITMEX_ACCOUNT', 'DISABLE_BITMEX_ACCOUNT', 'CLOSE_BITMEX_POSITION', 'ADD_STOP_BITMEX_POSITION', 'ADD_TSL_BITMEX_POSITION', 'CLEAR_BITMEX_NODE');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('OWNER', 'TRADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('MEMBER', 'ADMIN', 'TRADER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "PayoutCurrency" AS ENUM ('BTC', 'ETH', 'LTC');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('NEW', 'PAID', 'CONFIRMED', 'COMPLETE', 'EXPIRED', 'INVALID');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userType" "UserType" NOT NULL DEFAULT E'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "telegram" TEXT,
    "discord" TEXT,
    "email" TEXT,
    "payoutAddress" TEXT,
    "payInPlatform" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "memberId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "role" "MembershipRole" NOT NULL DEFAULT E'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT E'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" UUID NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupSubscriptionId" UUID NOT NULL,
    "groupMembershipId" UUID NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscriptionId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "btcPaid" DECIMAL(65,30),
    "btcPrice" DECIMAL(65,30),
    "usdPrice" DECIMAL(65,30) NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "remoteId" TEXT,
    "token" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinanceCurrency" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "symbol" TEXT NOT NULL,
    "status" "BinanceSymbolStatus" NOT NULL,
    "baseAsset" TEXT NOT NULL,
    "baseAssetPrecision" INTEGER,
    "quoteAsset" TEXT NOT NULL,
    "quotePrecision" INTEGER,
    "quoteAssetPrecision" INTEGER,
    "baseCommissionPrecision" INTEGER,
    "quoteCommissionPrecision" INTEGER,
    "allowsLimit" BOOLEAN DEFAULT false,
    "allowsMarket" BOOLEAN DEFAULT false,
    "allowsStopLoss" BOOLEAN DEFAULT false,
    "allowsStopLossLimit" BOOLEAN DEFAULT false,
    "allowsTakeProfit" BOOLEAN DEFAULT false,
    "allowsTakeProfitLimit" BOOLEAN DEFAULT false,
    "allowsLimitMaker" BOOLEAN DEFAULT false,
    "icebergAllowed" BOOLEAN DEFAULT false,
    "ocoAllowed" BOOLEAN DEFAULT false,
    "quoteOrderQtyMarketAllowed" BOOLEAN DEFAULT false,
    "isSpotTradingAllowed" BOOLEAN DEFAULT false,
    "isMarginTradingAllowed" BOOLEAN DEFAULT false,
    "spotPermission" BOOLEAN DEFAULT false,
    "leveragedPermission" BOOLEAN DEFAULT false,
    "marginPermission" BOOLEAN DEFAULT false,
    "lastPrice" TEXT,
    "openPrice" TEXT,
    "highPrice" TEXT,
    "lowPrice" TEXT,
    "priceChange" TEXT,
    "priceChangePercent" TEXT,
    "minPrice" TEXT,
    "maxPrice" TEXT,
    "tickSize" TEXT,
    "multiplierUp" TEXT,
    "multiplierDown" TEXT,
    "percentAvgPriceMins" DOUBLE PRECISION,
    "minQty" TEXT,
    "maxQty" TEXT,
    "stepSize" TEXT,
    "minNotional" TEXT,
    "applyToMarket" BOOLEAN DEFAULT false,
    "minNotionalAvgPriceMins" DOUBLE PRECISION,
    "icebergLimit" DOUBLE PRECISION,
    "marketMinQty" TEXT,
    "marketMaxQty" TEXT,
    "marketStepSize" TEXT,
    "maxNumOrders" INTEGER,
    "maxNumAlgoOrders" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitmexCurrency" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "active" BOOLEAN DEFAULT false,
    "symbol" TEXT NOT NULL,
    "underlying" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "fractionalDigits" INTEGER,
    "lastPrice" DECIMAL(65,30),
    "markPrice" DECIMAL(65,30),
    "maxPrice" DECIMAL(65,30),
    "tickSize" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exchange" "Exchange" NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "groupId" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "price" DECIMAL(65,30),
    "percent" DOUBLE PRECISION NOT NULL,
    "side" "OrderSide" NOT NULL,
    "closeOrderSet" BOOLEAN NOT NULL,
    "leverage" DOUBLE PRECISION NOT NULL,
    "stopPrice" DECIMAL(65,30),
    "trailingStopPercent" DOUBLE PRECISION,
    "stopTriggerType" "StopTriggerType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "active" BOOLEAN NOT NULL DEFAULT false,
    "exchange" "Exchange" NOT NULL,
    "groupId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "remoteAccountId" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsyncOperation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "opType" "OperationType" NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN DEFAULT false,
    "error" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderSetId" UUID NOT NULL,
    "exchangeAccountId" UUID NOT NULL,
    "clOrderId" TEXT,
    "remoteOrderId" TEXT,
    "clOrderLinkId" TEXT,
    "symbol" TEXT NOT NULL,
    "exchange" "Exchange" NOT NULL,
    "side" "OrderSide" NOT NULL,
    "closeOrder" BOOLEAN NOT NULL,
    "lastTimestamp" TIMESTAMP(3),
    "orderType" "OrderType",
    "price" DECIMAL(65,30),
    "avgPrice" DECIMAL(65,30),
    "quantity" DECIMAL(65,30),
    "filledQty" DECIMAL(65,30),
    "status" "OrderStatus" NOT NULL,
    "leverage" DOUBLE PRECISION NOT NULL,
    "stopPrice" DECIMAL(65,30),
    "trailingStopPercent" DOUBLE PRECISION,
    "stopTriggerType" "StopTriggerType",
    "pegOffsetValue" DECIMAL(65,30),
    "pegPriceType" "PegPriceType",
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exchangeAccountId" UUID NOT NULL,
    "symbol" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "exchange" "Exchange" NOT NULL,
    "side" "PositionSide" NOT NULL,
    "avgPrice" DECIMAL(65,30),
    "quantity" DECIMAL(65,30),
    "leverage" DOUBLE PRECISION,
    "markPrice" DECIMAL(65,30),
    "margin" DECIMAL(65,30),
    "maintenanceMargin" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User.email_unique" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User.username_unique" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Group.name_unique" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_memberId_groupId_key" ON "GroupMembership"("memberId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupSubscription_id_groupId_key" ON "GroupSubscription"("id", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSubscription_groupMembershipId_groupSubscriptionId_key" ON "MemberSubscription"("groupMembershipId", "groupSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSubscription_groupMembershipId_unique" ON "MemberSubscription"("groupMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "BinanceCurrency.symbol_unique" ON "BinanceCurrency"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "BitmexCurrency.symbol_unique" ON "BitmexCurrency"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeAccount_exchange_membershipId_key" ON "ExchangeAccount"("exchange", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Order.clOrderId_unique" ON "Order"("clOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order.remoteOrderId_unique" ON "Order"("remoteOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_symbol_exchangeAccountId_key" ON "Position"("symbol", "exchangeAccountId");

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSubscription" ADD FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSubscription" ADD FOREIGN KEY ("groupSubscriptionId") REFERENCES "GroupSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSubscription" ADD FOREIGN KEY ("groupMembershipId") REFERENCES "GroupMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD FOREIGN KEY ("subscriptionId") REFERENCES "MemberSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD FOREIGN KEY ("exchangeAccountId") REFERENCES "ExchangeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD FOREIGN KEY ("orderSetId") REFERENCES "OrderSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD FOREIGN KEY ("exchangeAccountId") REFERENCES "ExchangeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
