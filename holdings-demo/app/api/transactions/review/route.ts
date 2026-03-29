import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getCurrentUser } from "@/lib/auth/currentUser"

// Round to 2 decimal places — applied consistently to all money values in the response.
function r2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const rows = await prisma.holding.findMany({
      where: { userId: user.id },
      orderBy: { executedAt: "asc" },
    })

    const portfolio = buildPortfolioFromHoldings(rows)

    // --- Transactions (all activity) ---

    const transactions = rows
      .map((r) => ({
        id: r.id,
        ticker: r.ticker,
        productName: r.productName,
        shares: r.shares,
        avgPrice: r.avgPrice,
        executedAt: r.executedAt,
        type: r.shares < 0 ? "sell" : "buy",
      }))
      .sort((a, b) => (b.executedAt?.getTime() ?? 0) - (a.executedAt?.getTime() ?? 0))

    // --- Closed trades (internal — keeps all fields needed for calculations) ---

    const closedTrades = portfolio.closedTrades
      .map((t) => {
        const holdingDays =
          t.entryAt && t.exitAt
            ? Math.round((t.exitAt.getTime() - t.entryAt.getTime()) / (1000 * 60 * 60 * 24))
            : null
        return {
          assetKey: t.assetKey,
          ticker: t.ticker,
          productName: t.productName,
          exchange: t.exchange,        // used server-side for price lookup only
          sharesClosed: t.sharesClosed, // used server-side for exit price calc
          costBasis: t.costBasis,       // used server-side for totalDeployed + pct
          proceeds: t.proceeds,         // used server-side for exit price calc
          realizedPnL: t.realizedPnL,
          realizedPnLPct: t.costBasis > 0 ? (t.realizedPnL / t.costBasis) * 100 : null,
          entryAt: t.entryAt,
          exitAt: t.exitAt,
          holdingDays,
        }
      })
      .sort((a, b) => (b.exitAt?.getTime() ?? 0) - (a.exitAt?.getTime() ?? 0))

    // --- Summary stats ---

    const wins = closedTrades.filter((t) => t.realizedPnL > 0)
    const losses = closedTrades.filter((t) => t.realizedPnL < 0)
    const winCount = wins.length
    const lossCount = losses.length
    const totalRealizedPnL = r2(closedTrades.reduce((sum, t) => sum + t.realizedPnL, 0))

    const winRate =
      closedTrades.length > 0
        ? (winCount / closedTrades.length) * 100
        : null

    const tradesWithDays = closedTrades.filter((t) => t.holdingDays !== null)
    const averageHoldingDays =
      tradesWithDays.length > 0
        ? Math.round(tradesWithDays.reduce((sum, t) => sum + (t.holdingDays ?? 0), 0) / tradesWithDays.length)
        : null

    const avgWin =
      wins.length > 0
        ? r2(wins.reduce((sum, t) => sum + t.realizedPnL, 0) / wins.length)
        : null

    const avgLoss =
      losses.length > 0
        ? r2(losses.reduce((sum, t) => sum + t.realizedPnL, 0) / losses.length)
        : null

    const totalDeployed = r2(closedTrades.reduce((sum, t) => sum + t.costBasis, 0))

    // --- Phase 3: Trading Personality ---

    const winsWithDays = wins.filter((t) => t.holdingDays !== null)
    const lossesWithDays = losses.filter((t) => t.holdingDays !== null)

    const avgWinHoldingDaysRaw =
      winsWithDays.length >= 2
        ? winsWithDays.reduce((sum, t) => sum + (t.holdingDays ?? 0), 0) / winsWithDays.length
        : null

    const avgLossHoldingDaysRaw =
      lossesWithDays.length >= 2
        ? lossesWithDays.reduce((sum, t) => sum + (t.holdingDays ?? 0), 0) / lossesWithDays.length
        : null

    const avgWinHoldingDays = avgWinHoldingDaysRaw !== null ? Math.round(avgWinHoldingDaysRaw) : null
    const avgLossHoldingDays = avgLossHoldingDaysRaw !== null ? Math.round(avgLossHoldingDaysRaw) : null

    let personality: { statements: string[]; avgWinHoldingDays: number | null; avgLossHoldingDays: number | null } | null = null

    if (closedTrades.length >= 4) {
      const statements: string[] = []

      if (avgWinHoldingDaysRaw !== null && avgLossHoldingDaysRaw !== null) {
        const ratio = avgLossHoldingDaysRaw / avgWinHoldingDaysRaw
        if (ratio >= 1.5) {
          statements.push("You tend to hold losing trades longer than profitable ones.")
        } else if (ratio <= 0.7) {
          statements.push("You tend to cut losing trades faster than winning ones.")
        }
      }

      if (winRate !== null) {
        if (winRate === 0) {
          statements.push("None of your closed trades have ended profitable yet.")
        } else if (winRate < 40) {
          const n = Math.round(100 / winRate)
          statements.push(`Roughly 1 in ${n} of your trades ends profitable.`)
        } else if (winRate < 55) {
          statements.push("About half your trades end profitable.")
        } else {
          statements.push("More than half your trades end profitable.")
        }
      }

      if (statements.length < 3) {
        if (lossCount >= winCount * 2 && winCount > 0) {
          statements.push(`Losing trades outnumber winning ones — ${lossCount} to ${winCount}.`)
        } else if (winCount >= lossCount * 2 && lossCount > 0) {
          statements.push(`Winning trades outnumber losing ones — ${winCount} to ${lossCount}.`)
        } else if (
          avgWinHoldingDays !== null &&
          avgLossHoldingDays !== null &&
          avgWinHoldingDays < 90 &&
          avgLossHoldingDays > 180
        ) {
          statements.push("Your profitable trades tend to close quickly. Your losing ones stretch on.")
        }
      }

      if (statements.length > 0) {
        personality = { statements, avgWinHoldingDays, avgLossHoldingDays }
      }
    }

    // --- Phase 4: Cost of Holding Losers ---

    const validLosers = closedTrades.filter(
      (t) => t.realizedPnL < 0 && t.holdingDays !== null && t.holdingDays > 0
    ) as Array<typeof closedTrades[number] & { holdingDays: number }>

    let losersCost: {
      averageDailyCost: number
      worstOffender: {
        ticker: string | null
        productName: string | null
        dailyCost: number
        holdingDays: number
        realizedPnL: number
        exitAt: Date | null
      } | null
      items: Array<{
        ticker: string | null
        productName: string | null
        dailyCost: number
        holdingDays: number
        realizedPnL: number
        exitAt: Date | null
      }>
    } | null = null

    if (validLosers.length > 0) {
      const withDailyCost = validLosers.map((t) => ({
        ticker: t.ticker,
        productName: t.productName,
        dailyCost: r2(Math.abs(t.realizedPnL / t.holdingDays)),
        holdingDays: t.holdingDays,
        realizedPnL: r2(t.realizedPnL),
        exitAt: t.exitAt,
      }))

      const averageDailyCost = r2(
        withDailyCost.reduce((sum, t) => sum + t.dailyCost, 0) / withDailyCost.length
      )

      const sorted = [...withDailyCost].sort((a, b) => b.dailyCost - a.dailyCost)

      losersCost = {
        averageDailyCost,
        worstOffender: sorted[0] ?? null,
        items: sorted,
      }
    }

    // --- Shared price lookup for Phase 5 + Phase 6 ---

    const eligibleForPriceLookup = closedTrades.filter(
      (t) => t.ticker !== null && t.sharesClosed > 0
    )

    const allTickers = [...new Set(eligibleForPriceLookup.map((t) => t.ticker as string))]

    const sharedPriceMap = new Map<string, { ticker: string; exchange: string | null; price: number }>()

    if (allTickers.length > 0) {
      const cachedPrices = await prisma.priceCache.findMany({
        where: { ticker: { in: allTickers } },
        select: { ticker: true, exchange: true, price: true },
      })
      for (const p of cachedPrices) {
        const key = `${p.ticker.trim().toUpperCase()}:${p.exchange?.trim().toUpperCase() ?? "UNKNOWN"}`
        sharedPriceMap.set(key, p)
      }
    }

    // --- Phase 5: Best Move You Didn't Make ---

    const winningTrades = eligibleForPriceLookup.filter((t) => t.realizedPnL > 0)

    let bestMissedMove: {
      ticker: string | null
      productName: string | null
      exitPrice: number
      currentPrice: number
      realizedPnL: number
      missedUpside: number
      exitAt: Date | null
    } | null = null

    let bestUpside = 0

    for (const trade of winningTrades) {
      const normalizedTicker = (trade.ticker as string).trim().toUpperCase()
      const normalizedExchange = trade.exchange?.trim().toUpperCase() ?? "UNKNOWN"
      const cached = sharedPriceMap.get(`${normalizedTicker}:${normalizedExchange}`)
      if (!cached) continue

      const exitPrice = trade.proceeds / trade.sharesClosed
      const currentPrice = cached.price
      if (currentPrice <= exitPrice) continue

      const missedUpside = (currentPrice - exitPrice) * trade.sharesClosed
      if (missedUpside <= bestUpside) continue

      bestUpside = missedUpside
      bestMissedMove = {
        ticker: trade.ticker,
        productName: trade.productName,
        exitPrice: r2(exitPrice),
        currentPrice: r2(currentPrice),
        realizedPnL: r2(trade.realizedPnL),
        missedUpside: r2(missedUpside),
        exitAt: trade.exitAt,
      }
    }

    // --- Phase 6: What Happened After You Sold ---

    type PostSaleItem = {
      ticker: string | null
      productName: string | null
      exitPrice: number
      currentPrice: number
      realizedPnL: number
      deltaSinceExit: number
      deltaSinceExitPct: number
      outcome: "continued_up" | "reversed_down" | "roughly_flat"
      exitAt: Date | null
    }

    const postSaleItems: PostSaleItem[] = []

    for (const trade of eligibleForPriceLookup) {
      const normalizedTicker = (trade.ticker as string).trim().toUpperCase()
      const normalizedExchange = trade.exchange?.trim().toUpperCase() ?? "UNKNOWN"
      const cached = sharedPriceMap.get(`${normalizedTicker}:${normalizedExchange}`)
      if (!cached) continue

      const exitPrice = trade.proceeds / trade.sharesClosed
      if (exitPrice <= 0) continue

      const currentPrice = cached.price
      const deltaSinceExit = (currentPrice - exitPrice) * trade.sharesClosed
      const deltaSinceExitPct = ((currentPrice - exitPrice) / exitPrice) * 100

      const outcome: PostSaleItem["outcome"] =
        deltaSinceExitPct >= 10 ? "continued_up" :
        deltaSinceExitPct <= -10 ? "reversed_down" :
        "roughly_flat"

      postSaleItems.push({
        ticker: trade.ticker,
        productName: trade.productName,
        exitPrice: r2(exitPrice),
        currentPrice: r2(currentPrice),
        realizedPnL: r2(trade.realizedPnL),
        deltaSinceExit: r2(deltaSinceExit),
        deltaSinceExitPct: r2(deltaSinceExitPct),
        outcome,
        exitAt: trade.exitAt,
      })
    }

    postSaleItems.sort((a, b) => Math.abs(b.deltaSinceExit) - Math.abs(a.deltaSinceExit))

    // Filter out likely split/reverse-split artifacts (>1000% price move).
    const reliableItems = postSaleItems.filter((t) => Math.abs(t.deltaSinceExitPct) <= 1000)
    const excludedCount = postSaleItems.length - reliableItems.length

    const postSaleOutcomes =
      reliableItems.length > 0 ? { items: reliableItems, excludedCount } :
      excludedCount > 0 ? { items: [], excludedCount } :
      null

    // --- Response ---
    // closedTrades are slimmed here — internal fields (exchange, sharesClosed,
    // costBasis, proceeds) are used above but not sent to the client.

    return Response.json({
      transactions,
      closedTrades: closedTrades.map((t) => ({
        assetKey: t.assetKey,
        ticker: t.ticker,
        productName: t.productName,
        realizedPnL: r2(t.realizedPnL),
        realizedPnLPct: t.realizedPnLPct !== null ? r2(t.realizedPnLPct) : null,
        entryAt: t.entryAt,
        exitAt: t.exitAt,
        holdingDays: t.holdingDays,
      })),
      summary: {
        totalTransactions: transactions.length,
        totalClosed: closedTrades.length,
        totalRealizedPnL,
        winCount,
        lossCount,
        winRate,
        averageHoldingDays,
        avgWin,
        avgLoss,
        totalDeployed,
      },
      personality,
      losersCost,
      bestMissedMove,
      postSaleOutcomes,
    })
  } catch (error) {
    console.error("Transaction review error:", error)
    return Response.json({ error: "Failed to load transactions" }, { status: 500 })
  }
}
