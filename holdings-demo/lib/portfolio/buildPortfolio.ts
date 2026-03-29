import { groupTransactionsByAsset } from "./group"
import { buildPositionsFromTransactions } from "./fifo"
import { ClosedTrade, OpenPosition, TransactionRow } from "./types"

export function buildPortfolioFromTransactions(
  transactions: TransactionRow[]
): {
  openPositions: OpenPosition[]
  closedTrades: ClosedTrade[]
} {
  const groups = groupTransactionsByAsset(transactions)

  const openPositions: OpenPosition[] = []
  const closedTrades: ClosedTrade[] = []

  for (const assetTransactions of groups.values()) {
    const result = buildPositionsFromTransactions(assetTransactions)

    if (result.openPosition) {
      openPositions.push(result.openPosition)
    }

    closedTrades.push(...result.closedTrades)
  }

  return {
    openPositions,
    closedTrades,
  }
}