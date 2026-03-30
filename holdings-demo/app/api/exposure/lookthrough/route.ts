import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getCurrentUser } from "@/lib/auth/currentUser"
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
import { fetchSnapshots } from "@/lib/exposure/fetchSnapshots"

function isImplementedProvider(provider: string | null): boolean {
  return (
    provider === "ishares" ||
    provider === "vanguard" ||
    provider === "invesco" ||
    provider === "vaneck" ||
    provider === "spdr"
  )
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(request.url)
    const mode = (url.searchParams.get("mode") ?? "total") as "total" | "direct" | "etf"

    const rows = await prisma.holding.findMany({ where: { userId: user.id } })
    const portfolio = buildPortfolioFromHoldings(rows)
    const openPositions = portfolio.openPositions
    const supportedPositions = openPositions.filter((position) => {
      const provider = getEtfProvider({
        isin: position.isin,
        ticker: position.ticker,
      })

      return isImplementedProvider(provider)
    })
    const unsupportedPositions = openPositions.map((position) => {
      const provider = getEtfProvider({
        isin: position.isin,
        ticker: position.ticker,
      })

      return {
        ticker: position.ticker,
        isin: position.isin,
        provider,
      }
    }).filter((position) => !isImplementedProvider(position.provider))

    const { snapshots: liveSnapshots, failedProviders } = await fetchSnapshots(openPositions)

    const positionsForMode = mode === "total"
      ? openPositions
      : openPositions.filter((position) => {
          const isEtf = getEtfProvider({ isin: position.isin, ticker: position.ticker }) !== null
          return mode === "etf" ? isEtf : !isEtf
        })

    const totalPortfolioInvested = positionsForMode.reduce((s, p) => s + p.investedValue, 0)
    const exposure = buildLookthroughExposure(positionsForMode, liveSnapshots)
    const sectorExposure = buildSectorExposure(exposure, totalPortfolioInvested)
    const countryExposure = buildCountryExposure(exposure, totalPortfolioInvested)
    const overlapExposure = buildOverlapExposure(positionsForMode, liveSnapshots)

    return Response.json({
      totalOpenPositions: positionsForMode.length,
      supportedPositionCount: supportedPositions.length,
      unsupportedPositions,
      failedProviders,
      matchedEtfCount: openPositions.filter((position) =>
        liveSnapshots.some((snapshot) => {
          const sameIsin =
            position.isin &&
            snapshot.etfIsin &&
            position.isin.trim().toUpperCase() ===
              snapshot.etfIsin.trim().toUpperCase()

          const sameTicker =
            position.ticker &&
            snapshot.etfTicker &&
            position.ticker.trim().toUpperCase() ===
              snapshot.etfTicker.trim().toUpperCase()

          return Boolean(sameIsin || sameTicker)
        })
      ).length,
      topExposure: exposure.slice(0, 10),
      allExposure: exposure,
      sectorExposure,
      countryExposure,
      overlapExposure,
    })
  } catch (error) {
    console.error("Lookthrough exposure error:", error)

    return Response.json(
      { error: "Failed to load lookthrough exposure" },
      { status: 500 }
    )
  }
}