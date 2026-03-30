import { CountryExposure, UnderlyingExposure } from "./types"

export function buildCountryExposure(
  underlyingExposure: UnderlyingExposure[],
  totalPortfolioInvested?: number
): CountryExposure[] {
  const countryMap = new Map<string, CountryExposure>()

  const totalPortfolioExposure =
    totalPortfolioInvested ??
    underlyingExposure.reduce((sum, row) => sum + row.exposureValue, 0)

  for (const row of underlyingExposure) {
    const country = row.country?.trim() || "Other"
    const existing = countryMap.get(country)

    if (!existing) {
      countryMap.set(country, {
        country,
        exposureValue: row.exposureValue,
        exposurePctOfPortfolio:
          totalPortfolioExposure > 0
            ? (row.exposureValue / totalPortfolioExposure) * 100
            : 0,
      })
      continue
    }

    const nextExposureValue = existing.exposureValue + row.exposureValue

    countryMap.set(country, {
      country,
      exposureValue: nextExposureValue,
      exposurePctOfPortfolio:
        totalPortfolioExposure > 0
          ? (nextExposureValue / totalPortfolioExposure) * 100
          : 0,
    })
  }

  return Array.from(countryMap.values()).sort(
    (a, b) => b.exposureValue - a.exposureValue
  )
}
