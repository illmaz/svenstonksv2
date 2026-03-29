import { getIsharesHoldingsSnapshot } from "./providers/ishares"
import { getVanguardHoldingsSnapshot } from "./providers/vanguard"
import { buildLookthroughExposure } from "./buildLookthroughExposure"

async function main() {
  const snapshotIshares = await getIsharesHoldingsSnapshot({
    ticker: "IWDA",
    isin: "IE00B4L5Y983",
  })

  const snapshotVanguard = await getVanguardHoldingsSnapshot({
    ticker: "VUSA",
    isin: null,
  })

  console.log("iShares snapshot found:", Boolean(snapshotIshares))
  console.log(
    "iShares constituent count:",
    snapshotIshares?.constituents.length ?? 0
  )

  console.log("Vanguard snapshot found:", Boolean(snapshotVanguard))
  console.log(
    "Vanguard constituent count:",
    snapshotVanguard?.constituents.length ?? 0
  )

  if (!snapshotIshares || !snapshotVanguard) {
    return
  }

  const exposure = buildLookthroughExposure(
    [
      {
        ticker: "IWDA",
        isin: "IE00B4L5Y983",
        productName: "iShares Core MSCI World UCITS ETF",
        investedValue: 10000,
      },
      {
        ticker: "VUSA",
        isin: null,
        productName: "Vanguard S&P 500 UCITS ETF",
        investedValue: 5000,
      },
    ],
    [snapshotIshares, snapshotVanguard]
  )

  console.log("top exposure sample:")
  console.log(exposure.slice(0, 10))
}

main().catch((error) => {
  console.error("MULTI PROVIDER TEST ERROR:", error)
  process.exit(1)
})