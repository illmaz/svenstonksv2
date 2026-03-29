import { getVaneckFundReference } from "./providers/vaneck"

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
  const fundReference = getVaneckFundReference({
    ticker: "VVSM",
    isin: null,
  })

  if (!fundReference) {
    console.log("fund reference found:", false)
    return
  }

  const response = await fetch(fundReference.productUrl, {
    redirect: "manual",
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/html,application/xhtml+xml",
    },
  })

  const html = response.ok ? await response.text() : null

  console.log("fund reference found:", true)
  console.log("productUrl:", fundReference.productUrl)
  console.log("status:", response.status)
  console.log("location:", response.headers.get("location"))
  console.log("html found:", Boolean(html))
  console.log("html length:", html?.length ?? 0)
  console.log("html first 500 chars:")
  console.log(html?.slice(0, 500))
  console.log("contains 'csv':", html?.toLowerCase().includes("csv"))
  console.log("contains 'xlsx':", html?.toLowerCase().includes("xlsx"))
  console.log("contains 'download':", html?.toLowerCase().includes("download"))
  console.log("contains 'href':", html?.toLowerCase().includes("href"))
  console.log("contains 'excel':", html?.toLowerCase().includes("excel"))

  console.log("snippet around '.csv':")
  console.log(snippetAroundMatch(html, /\.csv/i))

  console.log("snippet around '.xlsx':")
  console.log(snippetAroundMatch(html, /\.xlsx/i))

  console.log("snippet around 'download':")
  console.log(snippetAroundMatch(html, /download/i))

  console.log("snippet around 'href':")
  console.log(snippetAroundMatch(html, /href=/i))

  console.log("snippet around 'excel':")
  console.log(snippetAroundMatch(html, /excel/i))
}

main().catch((error) => {
  console.error("VANECK TEST ERROR:", error)
  process.exit(1)
})