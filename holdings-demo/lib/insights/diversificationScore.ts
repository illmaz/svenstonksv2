import { OpenPosition } from "@/lib/portfolio/types"
import { EtfHoldingsSnapshot } from "@/lib/exposure/types"
import { buildLookthroughExposure } from "@/lib/exposure/buildLookthroughExposure"
import { buildSectorExposure } from "@/lib/exposure/buildSectorExposure"
import { buildCountryExposure } from "@/lib/exposure/buildCountryExposure"
import { buildOverlapExposure } from "@/lib/exposure/buildOverlapExposure"
import { buildThemeExposure } from "@/lib/themes/buildThemeExposure"
import { companyThemes } from "@/lib/themes/companyThemes"

export type DimensionScore = {
  score: number
  label: "good" | "watch" | "risk"
  insight: string
}

export type DiversificationResult = {
  overall: number
  dimensions: {
    companySpread: DimensionScore
    sectorBalance: DimensionScore
    countrySpread: DimensionScore
    etfOverlap: DimensionScore
    themeSpread: DimensionScore
  }
  actions: string[]
}

function labelFromScore(score: number): "good" | "watch" | "risk" {
  if (score >= 70) return "good"
  if (score >= 40) return "watch"
  return "risk"
}

export async function getDiversificationScore(
  openPositions: OpenPosition[],
  snapshots: EtfHoldingsSnapshot[]
): Promise<DiversificationResult> {
  const totalPortfolioInvested = openPositions.reduce((s, p) => s + p.investedValue, 0)
  const underlyingExposure = buildLookthroughExposure(openPositions, snapshots)

  // 1. Company spread — Herfindahl index
  const herfindahl = underlyingExposure.reduce((sum, row) => {
    const weight = row.exposurePctOfPortfolio / 100
    return sum + weight * weight
  }, 0)
  const companySpreadScore = Math.max(0, Math.round(100 - herfindahl * 2000))
  const topHolding = underlyingExposure[0]
  const companySpread: DimensionScore = {
    score: companySpreadScore,
    label: labelFromScore(companySpreadScore),
    insight:
      companySpreadScore >= 70
        ? "Company exposure is well spread across holdings."
        : topHolding
        ? `Top holding ${topHolding.ticker ?? topHolding.name} represents ${topHolding.exposurePctOfPortfolio.toFixed(1)}% of the portfolio.`
        : "Company concentration is high.",
  }

  // 2. Sector balance
  const SECTOR_BENCHMARK: Record<string, number> = {
    Technology: 22,
    Financials: 13,
    Healthcare: 11,
    "Consumer Discretionary": 11,
    Industrials: 10,
  }
  const sectorExposure = buildSectorExposure(underlyingExposure, totalPortfolioInvested)
  const sectorMap = new Map(sectorExposure.map((s) => [s.sector, s.exposurePctOfPortfolio]))
  let sectorPenalty = 0
  let mostOverweightSector = ""
  let mostOverweightBy = 0
  for (const [sector, benchmark] of Object.entries(SECTOR_BENCHMARK)) {
    const actual = sectorMap.get(sector) ?? 0
    const over = Math.max(0, actual - benchmark - 10)
    sectorPenalty += over
    if (over > mostOverweightBy) {
      mostOverweightBy = over
      mostOverweightSector = sector
    }
  }
  const sectorBalanceScore = Math.max(0, Math.round(100 - sectorPenalty * 3))
  const sectorBalance: DimensionScore = {
    score: sectorBalanceScore,
    label: labelFromScore(sectorBalanceScore),
    insight:
      sectorBalanceScore >= 70
        ? "Sector allocation is broadly in line with the benchmark."
        : mostOverweightSector
        ? `${mostOverweightSector} is overweight by ${mostOverweightBy.toFixed(1)}% vs the benchmark.`
        : "Sector concentration detected.",
  }

  // 3. Country spread
  const countryExposure = buildCountryExposure(underlyingExposure, totalPortfolioInvested)
  const usEntry = countryExposure.find(
    (c) => c.country === "United States" || c.country === "US"
  )
  const usPct = usEntry?.exposurePctOfPortfolio ?? 0
  const countryPenalty = Math.max(0, usPct - 70)
  const countrySpreadScore = Math.max(0, Math.round(100 - countryPenalty * 2))
  const countrySpread: DimensionScore = {
    score: countrySpreadScore,
    label: labelFromScore(countrySpreadScore),
    insight:
      countrySpreadScore >= 70
        ? "Geographic exposure is reasonably diversified."
        : `US exposure is ${usPct.toFixed(1)}%, above the 70% watch threshold.`,
  }

  // 4. ETF overlap
  const overlapExposure = buildOverlapExposure(openPositions, snapshots)
  const totalOverlapPct = overlapExposure.reduce(
    (sum, row) => sum + row.exposurePctOfPortfolio,
    0
  )
  const etfOverlapScore = Math.max(0, Math.round(100 - totalOverlapPct * 2))
  const etfOverlap: DimensionScore = {
    score: etfOverlapScore,
    label: labelFromScore(etfOverlapScore),
    insight:
      etfOverlapScore >= 70
        ? "Minimal overlap detected across ETF holdings."
        : `${overlapExposure.length} companies appear in multiple ETFs, totalling ${totalOverlapPct.toFixed(1)}% overlap.`,
  }

  // 5. Theme spread
  const themeExposure = buildThemeExposure(underlyingExposure, openPositions, companyThemes)
  const topTheme = themeExposure[0] as { theme: string; exposurePct: number } | undefined
  const topThemePct = topTheme?.exposurePct ?? 0
  const themeSpreadScore = Math.max(0, Math.round(100 - Math.max(0, topThemePct - 15) * 3))
  const themeSpread: DimensionScore = {
    score: themeSpreadScore,
    label: labelFromScore(themeSpreadScore),
    insight:
      themeSpreadScore >= 70
        ? "Theme exposure is spread across multiple areas."
        : topTheme
        ? `${topTheme.theme} is the dominant theme at ${topThemePct.toFixed(1)}% of exposure.`
        : "No theme data available.",
  }

  // Overall weighted score
  const overall = Math.round(
    companySpread.score * 0.2 +
    sectorBalance.score * 0.25 +
    countrySpread.score * 0.2 +
    etfOverlap.score * 0.2 +
    themeSpread.score * 0.15
  )

  // Actions: up to 3, worst dimensions first
  const ranked = [
    { key: "companySpread", dim: companySpread },
    { key: "sectorBalance", dim: sectorBalance },
    { key: "countrySpread", dim: countrySpread },
    { key: "etfOverlap", dim: etfOverlap },
    { key: "themeSpread", dim: themeSpread },
  ]
    .filter((d) => d.dim.label === "risk" || d.dim.label === "watch")
    .sort((a, b) => a.dim.score - b.dim.score)
    .slice(0, 3)

  const actions = ranked.map(({ key, dim }) => {
    if (key === "companySpread") return `Reduce single-company concentration — top holding is ${topHolding?.ticker ?? "unknown"} at ${topHolding?.exposurePctOfPortfolio.toFixed(1) ?? "?"}%.`
    if (key === "sectorBalance") return `Reduce ${mostOverweightSector} exposure toward the ${SECTOR_BENCHMARK[mostOverweightSector]}% benchmark.`
    if (key === "countrySpread") return `Consider adding non-US exposure to bring US allocation below 70% (currently ${usPct.toFixed(1)}%).`
    if (key === "etfOverlap") return `Consolidate overlapping ETFs — ${overlapExposure.length} holdings appear in multiple funds (${totalOverlapPct.toFixed(1)}% total overlap).`
    if (key === "themeSpread") return `Diversify away from ${topTheme?.theme ?? "dominant theme"} (${topThemePct.toFixed(1)}% exposure).`
    return dim.insight
  })

  return {
    overall,
    dimensions: {
      companySpread,
      sectorBalance,
      countrySpread,
      etfOverlap,
      themeSpread,
    },
    actions,
  }
}
