import { getAssetKey } from "./keys"
import { TransactionRow } from "./types"

type HoldingLike = {
  ticker: string | null
  isin: string | null
  productName: string | null
  exchange: string | null
  shares: number
  avgPrice: number
  executedAt: Date | null
  orderId: string | null
  id: string
}

export function mapHoldingToTransaction(row: HoldingLike): TransactionRow | null {
  const quantity = Number(row.shares)
  const price = Number(row.avgPrice)

  if (!Number.isFinite(quantity) || quantity === 0) {
    return null
  }

  if (!Number.isFinite(price) || price < 0) {
    return null
  }

  if (!(row.executedAt instanceof Date) || Number.isNaN(row.executedAt.getTime())) {
    return null
  }

  const assetKey = getAssetKey(
    {
      isin: row.isin,
      ticker: row.ticker,
      productName: row.productName,
      exchange: row.exchange,
    },
    row.orderId ?? row.id
  )

  return {
    assetKey,
    ticker: row.ticker,
    isin: row.isin,
    productName: row.productName,
    exchange: row.exchange,
    timestamp: row.executedAt,
    quantity,
    price,
    source: "DEGIRO",
  }
}