import { ClosedTrade, Lot, OpenPosition, TransactionRow } from "./types"

export function buildPositionsFromTransactions(
  transactions: TransactionRow[]
): {
  openPosition: OpenPosition | null
  closedTrades: ClosedTrade[]
} {
  const sorted = [...transactions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  const openLots: Lot[] = []
  const closedTrades: ClosedTrade[] = []

  let firstEverBuyAt: Date | null = null

  for (const tx of sorted) {
    if (tx.quantity > 0) {
      if (!firstEverBuyAt || tx.timestamp < firstEverBuyAt) {
        firstEverBuyAt = tx.timestamp
      }
      openLots.push({
        assetKey: tx.assetKey,
        ticker: tx.ticker,
        isin: tx.isin,
        productName: tx.productName,
        exchange: tx.exchange,
        quantityRemaining: tx.quantity,
        price: tx.price,
        openedAt: tx.timestamp,
      })
        } else if (tx.quantity < 0) {
      let sharesToSell = Math.abs(tx.quantity)
      let costBasis = 0
      let entryAt: Date | null = null

      while (sharesToSell > 0 && openLots.length > 0) {
        const lot = openLots[0]

        if (!entryAt) {
          entryAt = lot.openedAt
        }

        const sharesFromLot = Math.min(lot.quantityRemaining, sharesToSell)

        costBasis += sharesFromLot * lot.price
        lot.quantityRemaining -= sharesFromLot
        sharesToSell -= sharesFromLot

        if (lot.quantityRemaining === 0) {
          openLots.shift()
        }
      }

      const sharesClosed = Math.abs(tx.quantity) - sharesToSell
      const proceeds = sharesClosed * tx.price
      const realizedPnL = proceeds - costBasis

      if (sharesClosed > 0) {
        closedTrades.push({
          assetKey: tx.assetKey,
          ticker: tx.ticker,
          isin: tx.isin,
          productName: tx.productName,
          exchange: tx.exchange,
          sharesClosed,
          costBasis,
          proceeds,
          realizedPnL,
          entryAt,
          exitAt: tx.timestamp,
        })
      }
    }
  }

  if (openLots.length === 0) {
    return {
      openPosition: null,
      closedTrades,
    }
  }

  const sharesOpen = openLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0)
  const investedValue = openLots.reduce(
    (sum, lot) => sum + lot.quantityRemaining * lot.price,
    0
  )

  const avgCost = sharesOpen > 0 ? investedValue / sharesOpen : 0

  const oldestOpenLotAt = openLots[0]?.openedAt ?? null
  const lastActivityAt = sorted[sorted.length - 1]?.timestamp ?? null
  const sample = openLots[0]

  return {
    openPosition: {
      assetKey: sample.assetKey,
      ticker: sample.ticker,
      isin: sample.isin,
      productName: sample.productName,
      exchange: sample.exchange,
      sharesOpen,
      avgCost,
      investedValue,
      firstEverBuyAt,
      oldestOpenLotAt,
      lastActivityAt,
    },
    closedTrades,
  }
}