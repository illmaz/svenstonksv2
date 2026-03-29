import {
  fetchIsharesProductPageHtml,
  getIsharesHoldingsSnapshot,
} from "./providers/ishares"
import { buildLookthroughExposure } from "./buildLookthroughExposure"

async function main() {
  const html = await fetchIsharesProductPageHtml({
    ticker: "IWDA",
    isin: "IE00B4L5Y983",
  })

  console.log("html found:", Boolean(html))
  console.log("html length:", html?.length ?? 0)
  console.log("html first 500 chars:")
  console.log(html?.slice(0, 500))

  const snapshot = await getIsharesHoldingsSnapshot({
    ticker: "IWDA",
    isin: "IE00B4L5Y983",
  })

  console.log("snapshot found:", Boolean(snapshot))
  console.log("snapshot constituents:", snapshot?.constituents.length ?? 0)
  console.log("snapshot asOfDate:", snapshot?.asOfDate ?? null)

  if (!snapshot) {
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
    ],
    [snapshot]
  )

  console.log("top exposure sample:")
  console.dir(exposure.slice(0, 5), { depth: null })
}

main().catch((error) => {
  console.error("ISHARES TEST ERROR:", error)
  process.exit(1)
})