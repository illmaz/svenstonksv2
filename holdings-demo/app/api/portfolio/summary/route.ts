import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getCurrentUser } from "@/lib/auth/currentUser"

function normalizeTicker(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function normalizeExchange(value: string | null | undefined): string {
  const trimmed = value?.trim().toUpperCase()
  return trimmed ? trimmed : "UNKNOWN"
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const rows = await prisma.holding.findMany({ where: { userId: user.id } })
    const portfolio = buildPortfolioFromHoldings(rows)
    const openPositions = portfolio.openPositions
    const closedTrades = portfolio.closedTrades

    const openPositionKeys = Array.from(
      new Set(
        openPositions
          .map((position) => {
            const ticker = normalizeTicker(position.ticker)
            if (!ticker) return null
            const exchange = normalizeExchange(position.exchange)
            return `${ticker}:${exchange}`
          })
          .filter((value): value is string => Boolean(value))
      )
    )

    const cachedPrices =
      openPositionKeys.length > 0
        ? await prisma.priceCache.findMany({
            where: {
              OR: openPositionKeys.map((key) => {
                const [ticker, exchange] = key.split(":")
                return {
                  ticker,
                  exchange,
                }
              }),
            },
            orderBy: {
              fetchedAt: "desc",
            },
          })
        : []

    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000
    const now = Date.now()
    const staleAssets = cachedPrices
      .filter((p: { fetchedAt: Date | string; ticker: string }) => now - new Date(p.fetchedAt).getTime() > STALE_THRESHOLD_MS)
      .map((p: { fetchedAt: Date | string; ticker: string }) => p.ticker)

    const currencyByAssetKey = new Map<string, string>()
    for (const row of cachedPrices) {
      const ticker = normalizeTicker(row.ticker)
      if (!ticker) continue

      const exchange = normalizeExchange(row.exchange)
      const key = `${ticker}:${exchange}`

      if (!currencyByAssetKey.has(key) && row.currency) {
        currencyByAssetKey.set(key, row.currency)
      }
    }

    const mixedCurrencies = new Set(currencyByAssetKey.values()).size > 1

    const winningTrades = closedTrades.filter((trade) => trade.realizedPnL > 0)
    const losingTrades = closedTrades.filter((trade) => trade.realizedPnL < 0)
    const closedTradesWithExitAt = closedTrades.filter((trade) => trade.exitAt !== null)

    const lifetimeCapitalDeployed =
      openPositions.reduce((sum, position) => sum + position.investedValue, 0) +
      closedTrades.reduce((sum, trade) => sum + trade.costBasis, 0)

    const totalRealizedPnL = closedTrades.reduce(
      (sum, trade) => sum + trade.realizedPnL,
      0
    )

    const totalOpenInvestedValue = openPositions.reduce(
      (sum, position) => sum + position.investedValue,
      0
    )

    const openPositionsCount = openPositions.length
    const totalClosedTradesCount = closedTrades.length

    const winRate =
      winningTrades.length + losingTrades.length > 0
        ? (winningTrades.length / (winningTrades.length + losingTrades.length)) * 100
        : 0

    const averageGain =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, trade) => sum + trade.realizedPnL, 0) / winningTrades.length
        : 0

    const averageLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, trade) => sum + trade.realizedPnL, 0) / losingTrades.length
        : 0

    const bestTrade =
      closedTrades.length > 0
        ? closedTrades.reduce((best, trade) =>
            trade.realizedPnL > best.realizedPnL ? trade : best
          )
        : null

    const bestTradePct =
      bestTrade && bestTrade.costBasis > 0
        ? (bestTrade.realizedPnL / bestTrade.costBasis) * 100
        : null

    const worstTrade =
      closedTrades.length > 0
        ? closedTrades.reduce((worst, trade) =>
            trade.realizedPnL < worst.realizedPnL ? trade : worst
          )
        : null

    const worstTradePct =
      worstTrade && worstTrade.costBasis > 0
        ? (worstTrade.realizedPnL / worstTrade.costBasis) * 100
        : null

    const recentClosedTrades = [...closedTradesWithExitAt]
      .sort((a, b) => {
        const aTime = a.exitAt ? new Date(a.exitAt).getTime() : 0
        const bTime = b.exitAt ? new Date(b.exitAt).getTime() : 0

        return bTime - aTime
      })
      .slice(0, 10)

    // Build price map from cache: "TICKER:EXCHANGE" → price
    const priceMap = new Map<string, number>()
    for (const p of cachedPrices) {
      if (p.ticker && p.exchange && p.price !== null) {
        priceMap.set(`${p.ticker.toUpperCase()}:${p.exchange.toUpperCase()}`, p.price)
      }
    }

    // Compute current value for each open position
    let totalOpenCurrentValue = 0
    let totalPricedInvestedValue = 0
    let pricedOpenPositionsCount = 0
    for (const position of openPositions) {
      const key = `${(position.ticker ?? '').toUpperCase()}:${(position.exchange ?? '').toUpperCase()}`
      const price = priceMap.get(key)
      if (price !== undefined) {
        totalOpenCurrentValue += price * position.sharesOpen
        totalPricedInvestedValue += position.investedValue
        pricedOpenPositionsCount++
      }
    }

    const hasPricing = pricedOpenPositionsCount > 0 && totalOpenCurrentValue > 0
    const totalUnrealizedPnL = hasPricing ? totalOpenCurrentValue - totalPricedInvestedValue : null
    const netPnL = hasPricing ? totalRealizedPnL + (totalUnrealizedPnL ?? 0) : null
    const returnOnCapitalPct = hasPricing && lifetimeCapitalDeployed > 0
      ? ((netPnL ?? 0) / lifetimeCapitalDeployed) * 100
      : null

    return Response.json({
      meta: {
        pricingStatus: pricedOpenPositionsCount > 0 ? "partial" : "unavailable",
        mixedCurrencies,
        staleAssets,
      },
      lifetime: {
        lifetimeCapitalDeployed,
        totalRealizedPnL,
        totalUnrealizedPnL,
        netPnL,
        returnOnCapitalPct,
      },
      open: {
        totalOpenInvestedValue,
        totalOpenCurrentValue: hasPricing ? totalOpenCurrentValue : null,
        totalUnrealizedPnL,
        openPositionsCount,
        pricedOpenPositionsCount,
      },
      closed: {
        totalClosedTradesCount,
        winRate,
        averageGain,
        averageLoss,
        bestTrade,
        bestTradePct,
        worstTrade,
        worstTradePct,
      },
      activity: {
        recentClosedTrades,
      },
    })
  } catch (error) {
    console.error("Portfolio summary error:", error)

    return Response.json(
      { error: "Failed to load portfolio summary" },
      { status: 500 }
    )
  }
}
