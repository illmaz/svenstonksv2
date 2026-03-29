import { getInvescoHoldingsSnapshot } from "./providers/invesco"

const INVESCO_HOLDINGS_URL =
  "https://dng-api.invesco.com/cache/v1/accounts/en_GB/shareclasses/IE00BFZXGZ54/holdings/index?idType=isin"

async function main() {
  const rawResponse = await fetch(INVESCO_HOLDINGS_URL)
  const rawData = await rawResponse.json()
  const rawHoldings = Array.isArray(rawData?.holdings) ? rawData.holdings : []
  const firstHolding = rawHoldings[0] ?? null

  console.log("raw response keys:", Object.keys(rawData ?? {}))
  console.log("raw first 3 holdings:", rawHoldings.slice(0, 3))
  console.log(
    "raw first holding keys:",
    firstHolding && typeof firstHolding === "object" ? Object.keys(firstHolding) : []
  )

  const snapshot = await getInvescoHoldingsSnapshot({
    ticker: "EQQQ",
    isin: "IE00BFZXGZ54",
  })

  console.log("snapshot found:", Boolean(snapshot))
  console.log("snapshot:", snapshot)
}

main().catch((error) => {
  console.error("INVESCO SNAPSHOT TEST ERROR:", error)
  process.exit(1)
})