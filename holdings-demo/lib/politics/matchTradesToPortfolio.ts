// lib/politics/matchTradesToPortfolio.ts

type CongressTrade = {
  senator: string
  ticker: string
  transactionType: string
  transactionDate: string
  amount: string
  reportUrl: string
}

type MatchedTrade = CongressTrade & {
  exposurePct: number
}

export function matchTradesToPortfolio(
  trades: CongressTrade[],
  exposure: Array<{ ticker: string | null; exposurePctOfPortfolio: number }>
): MatchedTrade[] {
  // Build a lookup map from normalized ticker → exposurePct
  const exposureMap = new Map<string, number>()
  for (const e of exposure) {
    if (e.ticker) {
      exposureMap.set(e.ticker.toUpperCase(), e.exposurePctOfPortfolio)
    }
  }

  // Match, enrich, deduplicate
  const seen = new Set<string>()
  const matched: MatchedTrade[] = []

  for (const trade of trades) {
    const raw = trade.ticker?.trim()
    if (!raw || raw === '--') continue

    const ticker = raw.toUpperCase()
    const exposurePct = exposureMap.get(ticker)
    if (exposurePct === undefined) continue

    const dedupeKey = `${trade.senator}|${ticker}|${trade.transactionDate}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    matched.push({ ...trade, ticker, exposurePct })
  }

  // Sort: highest exposurePct first, then newest transactionDate
  matched.sort((a, b) => {
    if (b.exposurePct !== a.exposurePct) return b.exposurePct - a.exposurePct
    const dateA = new Date(a.transactionDate).getTime() || 0
    const dateB = new Date(b.transactionDate).getTime() || 0
    return dateB - dateA
  })

  return matched
}
