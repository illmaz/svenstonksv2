import { getInvescoFundReference } from "./providers/invesco"

function snippetAroundMatch(
  source: string | null | undefined,
  pattern: RegExp
): string | null {
  if (!source) return null

  const match = source.match(pattern)
  if (!match || match.index == null) return null

  const start = Math.max(0, match.index - 300)
  const end = Math.min(source.length, match.index + 700)
  return source.slice(start, end)
}

async function main() {
  const fundReference = getInvescoFundReference({
    ticker: "EQQQ",
    isin: null,
  })

  if (!fundReference) {
    console.log("fund reference found:", false)
    return
  }

  const response = await fetch(fundReference.productUrl, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/html,application/xhtml+xml",
    },
  })

  const html = response.ok ? await response.text() : null

  console.log("fund reference found:", true)
  console.log("productUrl:", fundReference.productUrl)
  console.log("html found:", Boolean(html))
  console.log("html length:", html?.length ?? 0)
  console.log("html first 500 chars:")
  console.log(html?.slice(0, 500))
  console.log("contains 'holdings':", html?.toLowerCase().includes("holding"))
  console.log("contains 'download':", html?.toLowerCase().includes("download"))
  console.log("contains 'csv':", html?.toLowerCase().includes("csv"))
  console.log("contains 'xlsx':", html?.toLowerCase().includes("xlsx"))
  console.log("contains 'json':", html?.toLowerCase().includes("json"))
  console.log("contains 'graphql':", html?.toLowerCase().includes("graphql"))
  console.log("contains 'api':", html?.toLowerCase().includes("api"))

  console.log("snippet around '.csv':")
  console.log(snippetAroundMatch(html, /\.csv/i))

  console.log("snippet around '.xlsx':")
  console.log(snippetAroundMatch(html, /\.xlsx/i))

  console.log("snippet around 'download':")
  console.log(snippetAroundMatch(html, /download/i))

  console.log("snippet around 'topHoldings':")
  console.log(snippetAroundMatch(html, /topHoldings/i))

  console.log("snippet around 'holding':")
  console.log(snippetAroundMatch(html, /holding/i))

  console.log("snippet around 'issuerName':")
  console.log(snippetAroundMatch(html, /issuerName/i))

  console.log("snippet around 'marketValuePercentage':")
  console.log(snippetAroundMatch(html, /marketValuePercentage/i))

  console.log("snippet around 'portfolio':")
  console.log(snippetAroundMatch(html, /portfolio/i))

  console.log("snippet around 'fundHoldings':")
  console.log(snippetAroundMatch(html, /fundHoldings/i))

  console.log("snippet around 'portfolioId':")
  console.log(snippetAroundMatch(html, /portfolioId/i))

  console.log("snippet around 'shareclass':")
  console.log(snippetAroundMatch(html, /shareclass/i))

  console.log("snippet around 'accountId':")
  console.log(snippetAroundMatch(html, /accountId/i))

  console.log("snippet around 'S000138E':")
  console.log(snippetAroundMatch(html, /S000138E/i))
}

main().catch((error) => {
  console.error("INVESCO TEST ERROR:", error)
  process.exit(1)
})