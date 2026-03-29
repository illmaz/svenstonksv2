import "dotenv/config"

import { prisma } from "../prisma"
import { buildPortfolioFromHoldings } from "../portfolio/buildPortfolioFromHoldings"
import { mockEtfHoldings } from "./mockEtfHoldings"
import { buildLookthroughExposure } from "./buildLookthroughExposure"
import { buildOverlapExposure } from "./buildOverlapExposure"
import { buildSectorExposure } from "./buildSectorExposure"

console.log("TEST LOOKTHROUGH STARTED")

async function main() {
  const rows = await prisma.holding.findMany()
  const portfolio = buildPortfolioFromHoldings(rows)

  const openPositionsForTest = [
    ...portfolio.openPositions,
    {
      assetKey: "isin:US000000QTEC",
      ticker: "QTEC",
      isin: "US000000QTEC",
      productName: "Mock Nasdaq Tech ETF",
      exchange: "XNAS",
      sharesOpen: 5,
      avgCost: 100,
      investedValue: 500,
      firstEverBuyAt: null,
      oldestOpenLotAt: null,
      lastActivityAt: null,
    },
  ]

  const exposure = buildLookthroughExposure(
    openPositionsForTest,
    mockEtfHoldings
  )

  const overlapExposure = buildOverlapExposure(
    openPositionsForTest,
    mockEtfHoldings
  )

  console.log("OPEN POSITIONS COUNT:", portfolio.openPositions.length)
  console.log("LOOKTHROUGH EXPOSURE COUNT:", exposure.length)

  console.log("\nTOP LOOKTHROUGH EXPOSURES:")
  console.dir(exposure.slice(0, 10), { depth: null })

  const sectorExposure = buildSectorExposure(exposure)

  console.log("\nTOP SECTOR EXPOSURES:")
  console.dir(sectorExposure.slice(0, 10), { depth: null })

  console.log("\nOVERLAP EXPOSURE:")
  console.dir(overlapExposure.slice(0, 10), { depth: null })
}

main()
  .catch((error) => {
    console.error("LOOKTHROUGH TEST ERROR:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log("DISCONNECTED")
  })