import { EtfHoldingsSnapshot } from "../types"

type VaneckLookupInput = {
  ticker?: string | null
  isin?: string | null
}

type VaneckFundReference = {
  productUrl: string
  productId: string | null
  blockId: string
  pageId: string
  tickerCode: string
}

const FETCH_TIMEOUT_MS = 10_000

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

const VANECK_FUND_REFERENCE_MAP: Record<string, VaneckFundReference> = {
  "TICKER:VVSM": {
    productUrl:
      "https://www.vaneck.com/nl/en/investments/semiconductor-etf/?cken=true",
    productId: null,
    blockId: "329515",
    pageId: "329500",
    tickerCode: "UCTSMH",
  },
}

export function getVaneckFundReference(
  input: VaneckLookupInput
): VaneckFundReference | null {
  const isin = normalize(input.isin)
  if (isin) {
    const byIsin = VANECK_FUND_REFERENCE_MAP[`ISIN:${isin}`]
    if (byIsin) return byIsin
  }

  const ticker = normalize(input.ticker)
  if (ticker) {
    const byTicker = VANECK_FUND_REFERENCE_MAP[`TICKER:${ticker}`]
    if (byTicker) return byTicker
  }

  return null
}

export async function getVaneckHoldingsSnapshot(
  input: VaneckLookupInput
): Promise<EtfHoldingsSnapshot | null> {
  const reference = getVaneckFundReference(input)
  if (!reference) return null

  const apiUrl = `https://www.vaneck.com/Main/HoldingsBlock/GetContent/?blockid=${reference.blockId}&pageid=${reference.pageId}&ticker=${reference.tickerCode}&reactlang=en&reactctr=offshore&epieditmode=false&latest=false&contextmode=Default`

  let response: Response
  try {
    response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    return null
  }
  if (!response.ok) return null

  let json: any = null
  try {
    json = await response.json()
  } catch {
    return null
  }

  const holdings = json?.data?.Holdings
  if (!Array.isArray(holdings)) return null

  const constituents = holdings
    .map((row: any) => {
      const name = typeof row?.HoldingName === "string" ? row.HoldingName.trim() : ""
      if (!name || name === "Other/Cash") return null

      const label = typeof row?.Label === "string" ? row.Label.trim() : ""
      const labelParts = label.split(/\s+/).filter(Boolean)
      const ticker = labelParts.length >= 2 ? labelParts[0] : null

      const weightValue = Number.parseFloat(String(row?.Weight ?? ""))

      return {
        name,
        ticker,
        isin: row?.ISIN ?? null,
        weightPct: Number.isFinite(weightValue) ? weightValue : 0,
        sector: row?.Sector ?? null,
        country: row?.Country ?? null,
      }
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)

  return {
    etfTicker: normalize(input.ticker),
    etfIsin: normalize(input.isin),
    etfName: "VanEck Semiconductor UCITS ETF",
    asOfDate: json?.data?.AsOfDate ?? null,
    source: apiUrl,
    constituents,
  }
}