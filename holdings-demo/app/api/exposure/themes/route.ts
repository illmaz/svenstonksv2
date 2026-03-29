import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getCurrentUser } from "@/lib/auth/currentUser"
import { buildLookthroughExposure } from "@/lib/exposure/buildLookthroughExposure"
import { getIsharesHoldingsSnapshot } from "@/lib/exposure/providers/ishares"
import { getInvescoHoldingsSnapshot } from "@/lib/exposure/providers/invesco"
import { getVaneckHoldingsSnapshot } from "@/lib/exposure/providers/vaneck"
import { getVanguardHoldingsSnapshot } from "@/lib/exposure/providers/vanguard"
import { getSpdrHoldingsSnapshot } from "@/lib/exposure/providers/spdr"
import { getEtfProvider } from "@/lib/exposure/providers/registry"
import { companyThemes } from "@/lib/themes/companyThemes"
import { buildThemeExposure } from "@/lib/themes/buildThemeExposure"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Fetch holdings and build portfolio
    const holdings = await prisma.holding.findMany({ where: { userId: user.id }, orderBy: { executedAt: "asc" } })
    const portfolio = buildPortfolioFromHoldings(holdings)
    const openPositions = portfolio.openPositions

    // --- Begin snapshot-building block ---
    const settledSnapshotResults = await Promise.allSettled(
      openPositions.map(async (position) => {
        const provider = getEtfProvider({
          isin: position.isin,
          ticker: position.ticker,
        })

        if (provider === "ishares") {
          return {
            ticker: position.ticker,
            isin: position.isin,
            provider,
            snapshot: await getIsharesHoldingsSnapshot({
              isin: position.isin,
              ticker: position.ticker,
            }),
          }
        }

        if (provider === "vanguard") {
          return {
            ticker: position.ticker,
            isin: position.isin,
            provider,
            snapshot: await getVanguardHoldingsSnapshot({
              isin: position.isin,
              ticker: position.ticker,
            }),
          }
        }

        if (provider === "invesco") {
          return {
            ticker: position.ticker,
            isin: position.isin,
            provider,
            snapshot: await getInvescoHoldingsSnapshot({
              isin: position.isin,
              ticker: position.ticker,
            }),
          }
        }

        if (provider === "vaneck") {
          return {
            ticker: position.ticker,
            isin: position.isin,
            provider,
            snapshot: await getVaneckHoldingsSnapshot({
              isin: position.isin,
              ticker: position.ticker,
            }),
          }
        }

        if (provider === "spdr") {
          return {
            ticker: position.ticker,
            isin: position.isin,
            provider,
            snapshot: await getSpdrHoldingsSnapshot({
              isin: position.isin,
              ticker: position.ticker,
            }),
          }
        }

        // not supported yet
        return {
          ticker: position.ticker,
          isin: position.isin,
          provider,
          snapshot: null,
        }
      })
    )

    const rejectedIndices = new Set<number>()

    const snapshotResults = settledSnapshotResults.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value
      }

      const position = openPositions[index]
      const provider = getEtfProvider({
        isin: position?.isin,
        ticker: position?.ticker,
      })

      rejectedIndices.add(index)
      // logging omitted for brevity
      return {
        ticker: position?.ticker ?? null,
        isin: position?.isin ?? null,
        provider,
        snapshot: null,
      }
    })

    const snapshots = snapshotResults
      .map((result) => result.snapshot)
      .filter(
        (snapshot): snapshot is NonNullable<typeof snapshot> =>
          snapshot !== null
      )
    // --- End snapshot-building block ---

    // Build underlying exposure
    const underlyingExposure = buildLookthroughExposure(openPositions, snapshots)

    // Step 0: Build themeLookup from companyThemes array
    const themeLookup = new Map<string, string[]>()
    for (const c of companyThemes) {
      if (c.ticker && Array.isArray(c.themes)) {
        themeLookup.set(c.ticker.toUpperCase(), c.themes)
      }
    }

    // Step 1: Build company exposure map (ticker -> exposurePct)
    const companyExposureMap = new Map<string, number>()

    // Step 2A: Add direct holdings exposure
    const totalPortfolioInvested = openPositions.reduce(
      (sum, pos) => sum + (typeof pos.investedValue === "number" ? pos.investedValue : 0),
      0
    )
    if (totalPortfolioInvested > 0) {
      for (const pos of openPositions) {
        if (
          typeof pos.ticker === "string" &&
          pos.ticker.trim() !== "" &&
          typeof pos.investedValue === "number" &&
          pos.investedValue > 0
        ) {
          const ticker = pos.ticker.toUpperCase()
          const exposure = (pos.investedValue / totalPortfolioInvested) * 100
          companyExposureMap.set(
            ticker,
            (companyExposureMap.get(ticker) || 0) + exposure
          )
        }
      }
    }

    // Step 2B: Add underlying ETF exposure
    for (const row of underlyingExposure) {
      if (
        typeof row.ticker === "string" &&
        row.ticker.trim() !== "" &&
        typeof row.exposurePctOfPortfolio === "number" &&
        row.exposurePctOfPortfolio > 0
      ) {
        const ticker = row.ticker.toUpperCase()
        companyExposureMap.set(
          ticker,
          (companyExposureMap.get(ticker) || 0) + row.exposurePctOfPortfolio
        )
      }
    }

    // Step 3: Map company exposure to themes
    const themeExposureMap = new Map<string, number>()
    for (const [ticker, exposurePct] of companyExposureMap.entries()) {
      const themes = themeLookup.get(ticker) || []
      if (themes.length > 0) {
        const perThemeExposure = exposurePct / themes.length
        for (const theme of themes) {
          themeExposureMap.set(
            theme,
            (themeExposureMap.get(theme) || 0) + perThemeExposure
          )
        }
      }
    }

    // Step 4: Format response
    const themes = Array.from(themeExposureMap.entries())
      .map(([theme, exposurePct]) => ({ theme, exposurePct }))
      .sort((a, b) => b.exposurePct - a.exposurePct)

    return Response.json({ themes })
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch theme exposure" },
      { status: 500 }
    )
  }
}
