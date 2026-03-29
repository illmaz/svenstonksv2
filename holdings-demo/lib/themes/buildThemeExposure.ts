export function buildThemeExposure(
  underlyingExposure: any[],
  openPositions: any[],
  companyThemes: any[]
) {
  // Build theme lookup
  const themeLookup = new Map<string, string[]>()
  for (const c of companyThemes) {
    themeLookup.set(c.ticker.toUpperCase(), c.themes)
  }
  const themeExposureMap = new Map<string, number>()
  // Add ETF underlying exposure
  for (const row of underlyingExposure) {
    if (!row.ticker || typeof row.exposurePctOfPortfolio !== "number") continue
    const ticker = row.ticker.toUpperCase()
    const themes = themeLookup.get(ticker)
    if (!themes) continue
    for (const theme of themes) {
      themeExposureMap.set(theme, (themeExposureMap.get(theme) || 0) + row.exposurePctOfPortfolio)
    }
  }
  // Add direct holdings exposure (ONLY if exposurePctOfPortfolio exists)
  for (const pos of openPositions) {
    const ticker = pos.ticker ? pos.ticker.toUpperCase() : null
    if (!ticker) continue
    const themes = themeLookup.get(ticker)
    if (!themes) continue
    if (typeof pos.exposurePctOfPortfolio !== "number") continue
    let exposure = pos.exposurePctOfPortfolio
    for (const theme of themes) {
      themeExposureMap.set(theme, (themeExposureMap.get(theme) || 0) + exposure)
    }
  }
  return Array.from(themeExposureMap.entries())
    .map(([theme, exposurePct]) => ({ theme, exposurePct }))
    .sort((a, b) => b.exposurePct - a.exposurePct)
}
