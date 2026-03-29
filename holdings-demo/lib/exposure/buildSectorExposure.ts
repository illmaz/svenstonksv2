import { UnderlyingExposure, SectorExposure } from "./types"

export function buildSectorExposure(
  underlyingExposure: UnderlyingExposure[]
): SectorExposure[] {
  const sectorMap = new Map<string, SectorExposure>()

  const totalPortfolioExposure = underlyingExposure.reduce(
    (sum, row) => sum + row.exposureValue,
    0
  )

  for (const row of underlyingExposure) {
    const sector = row.sector?.trim() || "Other"
    const existing = sectorMap.get(sector)

    if (!existing) {
      sectorMap.set(sector, {
        sector,
        exposureValue: row.exposureValue,
        exposurePctOfPortfolio:
          totalPortfolioExposure > 0
            ? (row.exposureValue / totalPortfolioExposure) * 100
            : 0,
      })
      continue
    }

    const nextExposureValue = existing.exposureValue + row.exposureValue

    sectorMap.set(sector, {
      sector,
      exposureValue: nextExposureValue,
      exposurePctOfPortfolio:
        totalPortfolioExposure > 0
          ? (nextExposureValue / totalPortfolioExposure) * 100
          : 0,
    })
  }

  return Array.from(sectorMap.values()).sort(
    (a, b) => b.exposureValue - a.exposureValue
  )
}