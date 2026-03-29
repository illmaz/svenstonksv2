export {}

const INVESCO_HOLDINGS_URL =
  "https://dng-api.invesco.com/cache/v1/accounts/en_GB/shareclasses/IE00BFZXGZ54/holdings/index?idType=isin"

async function main() {
  const response = await fetch(INVESCO_HOLDINGS_URL)

  console.log("status:", response.status)
  console.log("ok:", response.ok)

  const text = await response.text()
  console.log("sample:", text.slice(0, 800))

  let data: unknown = null
  try {
    data = JSON.parse(text)
  } catch (error) {
    console.error("failed to parse json:", error)
    return
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.log("keys:", [])
    console.log("first holding:", null)
    return
  }

  const record = data as Record<string, unknown>
  console.log("keys:", Object.keys(record))

  const firstHolding =
    Array.isArray(record.holdings) && record.holdings.length > 0
      ? record.holdings[0]
      : null

  console.log("first holding:", firstHolding)
}

main().catch((error) => {
  console.error("INVESCO API TEST ERROR:", error)
  process.exit(1)
})
