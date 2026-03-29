import { EtfHoldingsSnapshot } from "../types"
import Papa from "papaparse"

type IsharesLookupInput = {
  ticker?: string | null
  isin?: string | null
}

type IsharesFundReference = {
  productUrl: string
  productId: string | null
}

const ISHARES_CSV_ENDPOINT_TOKEN = "1506575576011"
const isharesSnapshotCache = new Map<string, EtfHoldingsSnapshot>()
const FETCH_TIMEOUT_MS = 10_000


function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function getIsharesCacheKey(input: IsharesLookupInput): string | null {
  const isin = normalize(input.isin)
  if (isin) return `ISIN:${isin}`

  const ticker = normalize(input.ticker)
  if (ticker) return `TICKER:${ticker}`

  return null
}

const ISHARES_FUND_REFERENCE_MAP: Record<string, IsharesFundReference> = {
  "ISIN:IE00B4L5Y983": {
    productUrl:
      "https://www.ishares.com/uk/individual/en/products/251882/ishares-msci-world-ucits-etf-acc-fund",
    productId: "251882",
  },
  "TICKER:IWDA": {
    productUrl:
      "https://www.ishares.com/uk/individual/en/products/251882/ishares-msci-world-ucits-etf-acc-fund",
    productId: "251882",
  },
  "TICKER:SWDA": {
    productUrl:
      "https://www.ishares.com/uk/individual/en/products/251882/ishares-msci-world-ucits-etf-acc-fund",
    productId: "251882",
  },

  "TICKER:CSPX": {
    productUrl:
    "https://www.ishares.com/uk/individual/en/products/253743/ishares-sp-500-b-ucits-etf-acc-fund",
    productId: "253743",
  },
  "TICKER:EIMI": {
    productUrl:
      "https://www.ishares.com/uk/individual/en/products/264659/ishares-core-msci-emerging-markets-imi-ucits-etf",
    productId: "264659",
  },
  "TICKER:IEMA": {
    productUrl:
      "https://www.ishares.com/uk/individual/en/products/251858/ishares-msci-emerging-markets-ucits-etf",
    productId: "251858",
  },
  "TICKER:IUIT": {
    productUrl:
      "https://www.ishares.com/uk/individual/en/products/280510/ishares-sp-500-information-technology-sector-ucits-etf",
    productId: "280510",
  },
  "TICKER:CNDX": {
    productUrl:
      "https://www.ishares.com/uk/individual/en/products/253741/ishares-nasdaq-100-ucits-etf",
    productId: "253741",
  },
  "TICKER:IAEX": {
    productUrl: "https://www.ishares.com/uk/individual/en/products/251712/",
    productId: "251712",
  },
  "ISIN:IE00B1YZSC51": {
    productUrl: "https://www.ishares.com/uk/individual/en/products/251861/",
    productId: "251861",
  },
  "TICKER:IDVY": {
    productUrl:
      "https://www.ishares.com/uk/individual/en/products/251787/ishares-euro-dividend-ucits-etf",
    productId: "251787",
  },
}

export function getIsharesFundReference(
  input: IsharesLookupInput
): IsharesFundReference | null {
  const isin = normalize(input.isin)
  const ticker = normalize(input.ticker)

  if (isin) {
    const byIsin = ISHARES_FUND_REFERENCE_MAP[`ISIN:${isin}`]
    if (byIsin) return byIsin
  }

  if (ticker) {
    const byTicker = ISHARES_FUND_REFERENCE_MAP[`TICKER:${ticker}`]
    if (byTicker) return byTicker
  }

  return null
}

function toNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === "-") return null
  return trimmed
}

function parseWeightPct(value: unknown): number {
  if (typeof value !== "string") return 0
  const numeric = Number.parseFloat(value.replace(/,/g, "").trim())
  return Number.isFinite(numeric) ? numeric : 0
}

function parseAsOfDate(csv: string): string | null {
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? ""
  const match = firstLine.match(/Fund Holdings as of,\"([^\"]+)\"/i)
  return match?.[1]?.trim() || null
}

function buildIsharesCsvUrl(fundReference: IsharesFundReference): string | null {
  if (!fundReference.productId) return null

  return `https://www.ishares.com/uk/individual/en/products/${fundReference.productId}/fund/${ISHARES_CSV_ENDPOINT_TOKEN}.ajax?fileType=csv&fileName=holdings&dataType=fund`
}

function parseIsharesHoldingsCsv(
  csv: string,
  input: IsharesLookupInput,
  sourceUrl: string
): EtfHoldingsSnapshot {
  const parsed = Papa.parse<string[]>(csv, {
    skipEmptyLines: true,
  })

  const rows = parsed.data
  const headerRowIndex = rows.findIndex(
    (row) => row[0]?.trim().toLowerCase() === "ticker"
  )

  if (headerRowIndex < 0) {
    throw new Error("Unable to find holdings header row in iShares CSV")
  }

  const headerRow = rows[headerRowIndex] ?? []
  

  const isinColumnIndex = headerRow.findIndex((cell) =>
    cell?.trim().toLowerCase().includes("isin")
  )

  const constituents = rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const name = toNullableText(row[1])
      if (!name) return null

      const assetClass = toNullableText(row[3])
      if (assetClass && assetClass.toLowerCase() !== "equity") {
        return null
      }

      const ticker = toNullableText(row[0])
      const sector = toNullableText(row[2])
      const country = toNullableText(row[9])
      const weightPct = parseWeightPct(row[5])

      return {
        name,
        ticker,
        isin:
          isinColumnIndex >= 0 ? toNullableText(row[isinColumnIndex]) : null,
        weightPct,
        sector,
        country,
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  return {
    etfTicker: normalize(input.ticker),
    etfIsin: normalize(input.isin),
    etfName: null,
    asOfDate: parseAsOfDate(csv),
    source: sourceUrl,
    constituents,
  }
}

export async function fetchIsharesProductPageHtml(
  input: IsharesLookupInput
): Promise<string | null> {
  const fundReference = getIsharesFundReference(input)
  if (!fundReference) return null

  let response: Response
  try {
    response = await fetch(fundReference.productUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; holdings-demo/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  return response.text()
}

export async function getIsharesHoldingsSnapshot(
  input: IsharesLookupInput
): Promise<EtfHoldingsSnapshot | null> {
  const cacheKey = getIsharesCacheKey(input)
  if (cacheKey) {
  const cachedSnapshot = isharesSnapshotCache.get(cacheKey)
  if (cachedSnapshot) {
    return cachedSnapshot
  }
}
  const fundReference = getIsharesFundReference(input)

  if (!fundReference) {
    return null
  }

  const csvUrl = buildIsharesCsvUrl(fundReference)
  if (!csvUrl) return null

  let response: Response
  try {
    response = await fetch(csvUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; holdings-demo/1.0)",
        accept: "text/csv,text/plain,*/*",
        referer: fundReference.productUrl,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  const csv = await response.text()
  if (!csv.trim()) {
    return null
  }

  const snapshot = parseIsharesHoldingsCsv(csv, input, csvUrl)

  if (cacheKey) {
    isharesSnapshotCache.set(cacheKey, snapshot)
  }

  return snapshot
}