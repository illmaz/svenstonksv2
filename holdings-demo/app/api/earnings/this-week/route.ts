import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getCurrentUser } from "@/lib/auth/currentUser"
import { buildLookthroughExposure } from "@/lib/exposure/buildLookthroughExposure"
import { upcomingEarnings, EarningsEvent } from "@/lib/earnings/upcoming"
import { fetchSnapshots } from "@/lib/exposure/fetchSnapshots"

export async function GET() {
  try {
    // Filter earnings for the next 7 days
    const today = new Date()
    const weekAhead = new Date(today)
    weekAhead.setDate(today.getDate() + 7)

    const filtered = upcomingEarnings.filter((event: EarningsEvent) => {
      const date = new Date(event.earningsDate)
      return date >= today && date <= weekAhead
    })

    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Fetch holdings and build portfolio
    const holdings = await prisma.holding.findMany({ where: { userId: user.id }, orderBy: { executedAt: "asc" } })
    const portfolio = buildPortfolioFromHoldings(holdings)

    const openPositions = portfolio.openPositions

    const { snapshots } = await fetchSnapshots(openPositions)

    // Build sets for fast matching and exposure lookup
    const openTickers = new Set(
      openPositions.map((pos) => (pos.ticker ? pos.ticker.toUpperCase() : null)).filter(Boolean)
    )

    // Build underlying exposure from openPositions and snapshots
    const underlyingExposure = buildLookthroughExposure(openPositions, snapshots)
    const exposureMap = new Map<string, number>()
    for (const row of underlyingExposure) {
      if (row.ticker && typeof row.exposurePctOfPortfolio === "number") {
        exposureMap.set(row.ticker.toUpperCase(), row.exposurePctOfPortfolio)
      }
    }

    // Only score and return portfolio-relevant earnings
    const matched = filtered.filter((event: EarningsEvent) => {
      const ticker = event.ticker ? event.ticker.toUpperCase() : null
      if (!ticker) return false
      return openTickers.has(ticker) || exposureMap.has(ticker)
    })

    // Deduplicate by ticker, prioritizing direct holdings
    const tickerMap = new Map<string, {
      name: string,
      ticker: string | null,
      isin: string | null,
      earningsDate: string,
      importance: number
    }>()
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
        // If already exists, keep the higher importance
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
    const topEarnings = scored.sort((a, b) => b.importance - a.importance).slice(0, 3)
    if (!topEarnings.length) {
      return Response.json({ earnings: [] })
    }
    return Response.json({ earnings: topEarnings })
  } catch (error) {
    console.error("Earnings endpoint error:", error)
    return Response.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    )
  }
}
