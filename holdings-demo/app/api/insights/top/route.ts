
import { buildThemeExposure } from "@/lib/themes/buildThemeExposure"
import { companyThemes } from "@/lib/themes/companyThemes"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/currentUser"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { buildLookthroughExposure } from "@/lib/exposure/buildLookthroughExposure"
import { buildSectorExposure } from "@/lib/exposure/buildSectorExposure"
import { buildCountryExposure } from "@/lib/exposure/buildCountryExposure"
import { buildOverlapExposure } from "@/lib/exposure/buildOverlapExposure"
import { getIsharesHoldingsSnapshot } from "@/lib/exposure/providers/ishares"
import { getInvescoHoldingsSnapshot } from "@/lib/exposure/providers/invesco"
import { getVaneckHoldingsSnapshot } from "@/lib/exposure/providers/vaneck"
import { getVanguardHoldingsSnapshot } from "@/lib/exposure/providers/vanguard"
import { getSpdrHoldingsSnapshot } from "@/lib/exposure/providers/spdr"
import { getEtfProvider } from "@/lib/exposure/providers/registry"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // fetch holdings
    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      orderBy: {
        executedAt: "asc",
      },
    })

    // build portfolio
    const portfolio = buildPortfolioFromHoldings(holdings)
    const openPositions = portfolio.openPositions

    // build ETF snapshots
    function isImplementedProvider(provider: string | null): boolean {
      return (
        provider === "ishares" ||
        provider === "vanguard" ||
        provider === "invesco" ||
        provider === "vaneck" ||
        provider === "spdr"
      )
    }

    const settledSnapshotResults = await Promise.allSettled(
      openPositions.map(async (position: any) => {
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
              // ...existing code...
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

    const snapshotResults = settledSnapshotResults.map((result: any, index: number) => {
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
      .map((result: any) => result.snapshot)
      .filter(
          (snapshot: any): snapshot is NonNullable<typeof snapshot> =>
            snapshot !== null
        )

    // Build underlying exposure
    const underlyingExposure = buildLookthroughExposure(openPositions, snapshots)

    // Build sector, country, overlap exposures
    const sectorExposure = buildSectorExposure(underlyingExposure)
    const countryExposure = buildCountryExposure(underlyingExposure)
    const overlapExposure = buildOverlapExposure(openPositions, snapshots)

    // Build theme exposure
    const themeExposure = buildThemeExposure(
      underlyingExposure,
      openPositions,
      companyThemes
    )

    // Build insights (example logic, replace with your actual logic)
    const insights = []
    if (themeExposure.length > 0) {
      insights.push({
        type: "theme",
        message: `Your portfolio is highly exposed to ${themeExposure[0].theme}`,
        exposurePct: themeExposure[0].exposurePct,
      })
    }
    if (sectorExposure.length > 0) {
      insights.push({
        type: "sector",
        message: `Top sector: ${sectorExposure[0].sector}`,
        exposurePct: sectorExposure[0].exposurePctOfPortfolio,
      })
    }
    if (countryExposure.length > 0) {
      insights.push({
        type: "country",
        message: `Top country: ${countryExposure[0].country}`,
        exposurePct: countryExposure[0].exposurePctOfPortfolio,
      })
    }
    if (overlapExposure.length > 0) {
      insights.push({
        type: "overlap",
        message: `${overlapExposure[0].name} appears in multiple ETFs`,
      })
    }

    return Response.json({ insights })
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch top insights" },
      { status: 500 }
    )
  }
}
