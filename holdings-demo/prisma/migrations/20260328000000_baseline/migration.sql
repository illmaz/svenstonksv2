-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "ticker" TEXT,
    "shares" DOUBLE PRECISION NOT NULL,
    "avgPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exchange" TEXT,
    "isin" TEXT,
    "productName" TEXT,
    "executedAt" TIMESTAMP(3),
    "orderId" TEXT,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMapping" (
    "id" TEXT NOT NULL,
    "isin" TEXT,
    "productName" TEXT,
    "ticker" TEXT,
    "region" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmappedAsset" (
    "id" TEXT NOT NULL,
    "isin" TEXT,
    "productName" TEXT,
    "exchange" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnmappedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "exchange" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "priceAsOf" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetMapping_isin_key" ON "AssetMapping"("isin");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_ticker_exchange_key" ON "PriceCache"("ticker", "exchange");
