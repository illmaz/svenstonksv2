import { getSpdrFundReference } from "./providers/spdr"

function snippetAroundMatch(
  source: string | null | undefined,
  pattern: RegExp
): string | null {
  if (!source) return null

  const match = source.match(pattern)
  if (!match || match.index == null) return null

  const start = Math.max(0, match.index - 400)
  const end = Math.min(source.length, match.index + 1200)
  return source.slice(start, end)
}

function extractUrls(source: string): string[] {
  const matches = source.match(/https?:\/\/[^\s"'<>]+/g) || []
  return Array.from(new Set(matches))
}

function extractDownloadLinks(html: string): string[] {
  const matches = html.match(/href="([^"]+\.(xlsx|csv))"/gi) || []
  return matches.map((m) =>
    m.replace(/href="/i, "").replace(/"/g, "")
  )
}

function extractAllUrls(html: string): string[] {
  const matches = html.match(/https?:\/\/[^"\s]+/gi) || []
  return [...new Set(matches)]
}

async function main() {
  const fundReference = getSpdrFundReference({ ticker: "USDV", isin: null })

  if (!fundReference) {
    console.log("fund reference found: false")
    return
  }

  console.log("fund reference found: true")
  console.log("productUrl:", fundReference.productUrl)

  const response = await fetch(fundReference.productUrl, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "text/html,application/xhtml+xml",
    },
  })

  const html = await response.text()

  console.log("status:", response.status)
  console.log("html found:", html.length > 0)
  console.log("html length:", html.length)
  console.log("html first 500 chars:", html.slice(0, 500))

  console.log("contains 'holdings':", html?.toLowerCase().includes("holdings"))
  console.log("contains 'download':", html?.toLowerCase().includes("download"))
  console.log("contains 'csv':", html?.toLowerCase().includes("csv"))
  console.log("contains 'xlsx':", html?.toLowerCase().includes("xlsx"))
  console.log("contains 'json':", html?.toLowerCase().includes("json"))
  console.log("contains 'api':", html?.toLowerCase().includes("api"))

  console.log("snippet around 'holdings':")
  console.log(snippetAroundMatch(html, /holdings/i))

  console.log("snippet around 'download':")
  console.log(snippetAroundMatch(html, /download/i))

  console.log("snippet around '.csv':")
  console.log(snippetAroundMatch(html, /\.csv/i))

  console.log("snippet around '.xlsx':")
  console.log(snippetAroundMatch(html, /\.xlsx/i))

  console.log("snippet around 'json':")
  console.log(snippetAroundMatch(html, /json/i))

  console.log("snippet around 'api':")
  console.log(snippetAroundMatch(html, /api/i))

  console.log("contains 'childCompCodes':", html?.includes("childCompCodes"))
  console.log("contains 'fundComponent':", html?.includes("fundComponent"))
  console.log("contains 'holdings\"':", html?.includes('holdings'))
  console.log("contains 'input type=\"hidden\"':", html?.includes('input type="hidden"'))
  console.log("contains 'fundcomps':", html?.includes("fundcomps"))

  console.log("snippet around 'childCompCodes':")
  console.log(snippetAroundMatch(html, /childCompCodes/i))

  console.log("snippet around 'holdings':")
  console.log(snippetAroundMatch(html, /holdings/i))

  console.log("snippet around 'input type=\"hidden\"':")
  console.log(snippetAroundMatch(html, /input type="hidden"/i))

  console.log("snippet around 'fundComponent':")
  console.log(snippetAroundMatch(html, /fundComponent/i))

  console.log("snippet around 'fundcomps':")
  console.log(snippetAroundMatch(html, /fundcomps/i))

  const urls = extractUrls(html || "")

  console.log("total urls found:", urls.length)

  const filteredUrls = urls.filter((url) =>
    /api|json|data|fund|holding|component|download/i.test(url)
  )

  console.log("filtered urls:")
  filteredUrls.slice(0, 50).forEach((url) => console.log(url))

  const downloadLinks = extractDownloadLinks(html || "")

  console.log("download links:")
  downloadLinks.forEach((link) => console.log(link))

  const allUrls = extractAllUrls(html || "")

  console.log("all urls:")
  allUrls.forEach((url) => console.log(url))

  const candidateUrls = allUrls.filter((url) =>
    /holdings|portfolio|fund|data|download|xlsx|json/i.test(url)
  )

  console.log("candidate urls:")
  candidateUrls.forEach((url) => console.log(url))
}

main().catch((error) => {
  console.error("SPDR TEST ERROR:", error)
  process.exit(1)
})
