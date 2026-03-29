import "dotenv/config"
import { prisma } from "../prisma"
import { buildPortfolioFromHoldings } from "./buildPortfolioFromHoldings"

console.log("TEST REAL HOLDINGS STARTED")

async function main() {
  console.log("FETCHING HOLDINGS...")

  const rows = await prisma.holding.findMany()

  console.log("ROWS FETCHED:", rows.length)

  const result = buildPortfolioFromHoldings(rows)

  console.log("OPEN POSITIONS COUNT:", result.openPositions.length)
  console.log("CLOSED TRADES COUNT:", result.closedTrades.length)

  console.log("\nOPEN POSITIONS SAMPLE:")
  console.dir(result.openPositions.slice(0, 10), { depth: null })

  console.log("\nCLOSED TRADES SAMPLE:")
  console.dir(result.closedTrades.slice(0, 10), { depth: null })
}

main()
  .catch((error) => {
    console.error("TEST ERROR:", error)
    process.exit(1)
  })
  .finally(() => {
    console.log("DONE")
  })