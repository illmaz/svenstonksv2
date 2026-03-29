import { buildPortfolioFromTransactions } from "./buildPortfolio"
import { mapHoldingToTransaction } from "./mapHoldingToTransaction"

type HoldingLike = {
  id: string
  ticker: string | null
  isin: string | null
  productName: string | null
  exchange: string | null
  shares: number
  avgPrice: number
  executedAt: Date | null
  orderId: string | null
}

export function buildPortfolioFromHoldings(rows: HoldingLike[]) {
  const transactions = rows
    .map((row) => mapHoldingToTransaction(row))
    .filter((row): row is NonNullable<typeof row> => row !== null)

  return buildPortfolioFromTransactions(transactions)
}