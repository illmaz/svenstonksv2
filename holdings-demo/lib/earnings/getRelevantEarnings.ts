import { fetchUpcomingEarnings } from "@/lib/earnings/fetchUpcomingEarnings"
import { OpenPosition } from "@/lib/portfolio/types"
import { EtfHoldingsSnapshot } from "@/lib/exposure/types"
import { buildLookthroughExposure } from "@/lib/exposure/buildLookthroughExposure"
import { EarningsEvent } from "@/lib/earnings/upcoming"

export type RelevantEarningsEvent = {
  name: string
  ticker: string | null
  isin: string | null
  earningsDate: string
  importance: number
}

export async function getRelevantEarnings(
  openPositions: OpenPosition[],
  snapshots: EtfHoldingsSnapshot[]
): Promise<RelevantEarningsEvent[]> {
  // 1. Date bounds
  const today = new Date()
  const weekAhead = new Date(today)
  weekAhead.setDate(today.getDate() + 30)

  // 2. Build openTickers set
  const openTickers = new Set(
    openPositions
      .map((pos) => (pos.ticker ? pos.ticker.toUpperCase() : null))
      .filter((t): t is string => !!t)
  )

  // 3. Build underlying exposure and exposureMap
  const underlyingExposure = buildLookthroughExposure(openPositions, snapshots)
  const exposureMap = new Map<string, number>()
  for (const row of underlyingExposure) {
    if (row.ticker && typeof row.exposurePctOfPortfolio === "number") {
      exposureMap.set(row.ticker.toUpperCase(), row.exposurePctOfPortfolio)
    }
  }

  // 4. Fetch live earnings for all relevant tickers
  const allTickers = [
    ...Array.from(openTickers),
    ...Array.from(exposureMap.keys()),
  ].slice(0, 30)
  const upcomingEarnings = await fetchUpcomingEarnings(allTickers)

  // 5. Filter to date window
  const filtered = upcomingEarnings.filter((event: EarningsEvent) => {
    const date = new Date(event.earningsDate)
    return date >= today && date <= weekAhead
  })

  // 6. Match, score, deduplicate, sort, return
  const matched = filtered.filter((event: EarningsEvent) => {
    const ticker = event.ticker ? event.ticker.toUpperCase() : null
    if (!ticker) return false
    return openTickers.has(ticker) || exposureMap.has(ticker)
  })

  const tickerMap = new Map<string, RelevantEarningsEvent>()
  for (const event of matched) {
    const ticker = event.ticker ? event.ticker.toUpperCase() : null
    if (!ticker) continue
    let importance = 0
    if (openTickers.has(ticker)) {
      importance = 1
    } else if (exposureMap.has(ticker)) {
      importance = exposureMap.get(ticker)! / 100
    }
    if (!tickerMap.has(ticker)) {
      tickerMap.set(ticker, {
        name: event.name,
        ticker: event.ticker,
        isin: event.isin,
        earningsDate: event.earningsDate,
        importance,
      })
    } else {
      const existing = tickerMap.get(ticker)!
      if (importance > existing.importance) {
        tickerMap.set(ticker, {
          name: event.name,
          ticker: event.ticker,
          isin: event.isin,
          earningsDate: event.earningsDate,
          importance,
        })
      }
    }
  }

  const scored = Array.from(tickerMap.values())
  return scored.sort((a, b) => b.importance - a.importance).slice(0, 3)
}
