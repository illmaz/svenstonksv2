import { TransactionRow } from "./types"

export function groupTransactionsByAsset(
  transactions: TransactionRow[]
): Map<string, TransactionRow[]> {
  const groups = new Map<string, TransactionRow[]>()

  for (const tx of transactions) {
    const key = tx.assetKey

    if (!groups.has(key)) {
      groups.set(key, [])
    }

    groups.get(key)!.push(tx)
  }

  return groups
}