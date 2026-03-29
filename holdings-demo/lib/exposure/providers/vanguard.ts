import { EtfHoldingsSnapshot } from "../types"

type VanguardLookupInput = {
  ticker?: string | null
  isin?: string | null
}

type VanguardFundReference = {
  productUrl: string
  productId: string | null
}

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

const VANGUARD_FUND_REFERENCE_MAP: Record<string, VanguardFundReference> = {
  "TICKER:VUSA": {
    productUrl:
      "https://www.vanguard.co.uk/professional/product/etf/equity/9503/sp-500-ucits-etf-usd-distributing",
    productId: "9503",
  },
}

const VANGUARD_GRAPHQL_URL = "https://www.vanguard.co.uk/gpx/graphql"
const FETCH_TIMEOUT_MS = 10_000

const VANGUARD_SECURITY_TYPES = [
  "FI.ABS","FI.CONV","FI.CORP","FI.IP","FI.LOAN","FI.MBS","FI.MUNI",
  "FI.NONUS_GOV","FI.US_GOV","MM.AGC","MM.BACC","MM.CD","MM.CP","MM.MCP",
  "MM.RE","MM.TBILL","MM.TD","MM.TFN","EQ.DRCPT","EQ.ETF","EQ.FSH",
  "EQ.PREF","EQ.PSH","EQ.REIT","EQ.STOCK","EQ.RIGHT","EQ.WRT","MF.MF"
]

const VANGUARD_HOLDINGS_QUERY = `
query FundsHoldingsQuery($portIds: [String!], $securityTypes: [String!], $lastItemKey: String) {
  funds(portIds: $portIds) {
    profile {
      fundFullName
      fundCurrency
      primarySectorEquityClassification
      __typename
    }
    __typename
  }
  borHoldings(portIds: $portIds) {
    holdings(limit: 1500, securityTypes: $securityTypes, lastItemKey: $lastItemKey) {
      items {
        issuerName
        securityLongDescription
        gicsSectorDescription
        icbSectorDescription
        icbIndustryDescription
        marketValuePercentage
        sedol1
        quantity
        ticker
        securityType
        finalMaturity
        effectiveDate
        marketValueBaseCurrency
        bloombergIsoCountry
        couponRate
        __typename
      }
      totalHoldings
      lastItemKey
      __typename
    }
    __typename
  }
}
`

export function getVanguardFundReference(
  input: VanguardLookupInput
): VanguardFundReference | null {
  const isin = normalize(input.isin)
  if (isin) {
    const byIsin = VANGUARD_FUND_REFERENCE_MAP[`ISIN:${isin}`]
    if (byIsin) return byIsin
  }

  const ticker = normalize(input.ticker)
  if (ticker) {
    const byTicker = VANGUARD_FUND_REFERENCE_MAP[`TICKER:${ticker}`]
    if (byTicker) return byTicker
  }

  return null
}

export async function fetchVanguardProductPageHtml(
  input: VanguardLookupInput
): Promise<string | null> {
  const fundReference = getVanguardFundReference(input)
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

function mapBloombergIsoCountryToName(value: string | null | undefined): string | null {
  if (!value) return null

  const code = value.trim().toUpperCase()

  const countryMap: Record<string, string> = {
    US: "United States",
    GB: "United Kingdom",
    NL: "Netherlands",
    DE: "Germany",
    FR: "France",
    CH: "Switzerland",
    JP: "Japan",
    CA: "Canada",
    AU: "Australia",
    IE: "Ireland",
    DK: "Denmark",
    SE: "Sweden",
    ES: "Spain",
    IT: "Italy",
    BE: "Belgium",
    FI: "Finland",
    NO: "Norway",
    PT: "Portugal",
    NZ: "New Zealand",
    HK: "Hong Kong",
    SG: "Singapore",
    IL: "Israel",
    TW: "Taiwan",
    KR: "Korea (South)",
    CN: "China",
  }

  return countryMap[code] ?? code
}

export async function getVanguardHoldingsSnapshot(
  input: VanguardLookupInput
): Promise<EtfHoldingsSnapshot | null> {
  const fundReference = getVanguardFundReference(input)
  if (!fundReference || !fundReference.productId) return null

  let response: Response
  try {
    response = await fetch(VANGUARD_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
        "x-consumer-id": "uk2",
      },
      body: JSON.stringify({
        operationName: "FundsHoldingsQuery",
        query: VANGUARD_HOLDINGS_QUERY,
        variables: {
          portIds: [fundReference.productId],
          lastItemKey: null,
          securityTypes: VANGUARD_SECURITY_TYPES,
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    return null
  }

  if (!response.ok) return null

  const json = await response.json()
  const data = json?.data

  const fundFullName: string | null = data?.funds?.[0]?.profile?.fundFullName ?? null
  const items: any[] | null = data?.borHoldings?.[0]?.holdings?.items ?? null

  if (!Array.isArray(items)) return null

  const asOfDate: string | null = items.find((item) => item?.effectiveDate)?.effectiveDate ?? null

  const constituents = items
    .map((item) => {
      const name: string | null = item?.issuerName ?? item?.securityLongDescription ?? null
      if (!name) return null

      return {
        name,
        ticker: item?.ticker ?? null,
        isin: null,
        weightPct: typeof item?.marketValuePercentage === "number" ? item.marketValuePercentage : 0,
        sector: item?.gicsSectorDescription ?? null,
        country: mapBloombergIsoCountryToName(item?.bloombergIsoCountry),
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  return {
    etfTicker: normalize(input.ticker),
    etfIsin: normalize(input.isin),
    etfName: fundFullName,
    asOfDate,
    source: VANGUARD_GRAPHQL_URL,
    constituents,
  }
}
