import { getVanguardHoldingsSnapshot } from "./providers/vanguard"
import { buildLookthroughExposure } from "./buildLookthroughExposure"

async function main() {
  const snapshot = await getVanguardHoldingsSnapshot({
    ticker: "VUSA",
    isin: null,
  })

  console.log("snapshot found:", Boolean(snapshot))
  console.log("snapshot constituents:", snapshot?.constituents.length ?? 0)
  console.log("snapshot asOfDate:", snapshot?.asOfDate ?? null)
  console.log("snapshot etfName:", snapshot?.etfName ?? null)

  if (!snapshot) {
    return
  }

  const exposure = buildLookthroughExposure(
    [
      {
        ticker: "VUSA",
        isin: null,
        productName: "Vanguard S&P 500 UCITS ETF",
        investedValue: 10000,
      },
    ],
    [snapshot]
  )

  console.log("top exposure sample:")
  console.dir(exposure.slice(0, 5), { depth: null })
}

main().catch((error) => {
  console.error("VANGUARD TEST ERROR:", error)
  process.exit(1)
})