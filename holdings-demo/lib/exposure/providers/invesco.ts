import { EtfHoldingsSnapshot } from "../types"

type InvescoLookupInput = {
  ticker?: string | null
  isin?: string | null
}

type InvescoFundReference = {
  productUrl: string
  productId: string | null
}

const FETCH_TIMEOUT_MS = 10_000

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

const INVESCO_FUND_REFERENCE_MAP: Record<string, InvescoFundReference> = {
  "TICKER:EQQQ": {
    productUrl:
      "https://etf.invesco.com/gb/private/en/product/invesco-eqqq-nasdaq-100-ucits-etf-acc",
    productId: null,
  },
}

export function getInvescoFundReference(
  input: InvescoLookupInput
): InvescoFundReference | null {
  const isin = normalize(input.isin)
  if (isin) {
    const byIsin = INVESCO_FUND_REFERENCE_MAP[`ISIN:${isin}`]
    if (byIsin) return byIsin
  }

  const ticker = normalize(input.ticker)
  if (ticker) {
    const byTicker = INVESCO_FUND_REFERENCE_MAP[`TICKER:${ticker}`]
    if (byTicker) return byTicker
  }

  return null
}

export async function getInvescoHoldingsSnapshot(
  input: InvescoLookupInput
): Promise<EtfHoldingsSnapshot | null> {
  const isin = normalize(input.isin)
  if (!isin) return null

  const url = `https://dng-api.invesco.com/cache/v1/accounts/en_GB/shareclasses/${isin}/holdings/index?idType=isin`

  let response: Response
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    return null
  }
  if (!response.ok) return null

  let data: any = null
  try {
    data = await response.json()
  } catch {
    return null
  }

  const candidateArrays = [
    data?.holdings,
    data?.data?.holdings,
    data?.results?.holdings,
    data?.fundHoldings,
    data?.data?.fundHoldings,
    data?.results?.fundHoldings,
    data?.topHoldings,
    data?.data?.topHoldings,
    data?.results?.topHoldings,
  ]

  const holdings = candidateArrays.find((value) => Array.isArray(value))
  if (!Array.isArray(holdings)) return null

  const constituents = holdings
    .map((holding: any) => {
      const name = holding?.issuerName ?? holding?.name ?? null
      if (!name) return null

      return {
        name,
        ticker: holding?.ticker ?? null,
        isin: holding?.isin ?? null,
        weightPct:
          typeof holding?.marketValuePercentage === "number"
            ? holding.marketValuePercentage
            : typeof holding?.weight === "number"
              ? holding.weight
              : 0,
        sector: holding?.sector ?? holding?.gicsSectorDescription ?? null,
        country: holding?.country ?? holding?.countryName ?? null,
      }
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)

  return {
    etfTicker: normalize(input.ticker),
    etfIsin: normalize(input.isin),
    etfName: data?.fundName ?? data?.name ?? "Invesco ETF",
    asOfDate: data?.asOfDate ?? null,
    source: url,
    constituents,
  }
}