type EtfProvider = "ishares" | "vanguard" | "invesco" | "vaneck" | "spdr"

type EtfProviderLookupInput = {
  ticker?: string | null
  isin?: string | null
}

function normalize(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

const ETF_PROVIDER_REGISTRY: Record<string, EtfProvider> = {
  "ISIN:IE00B4L5Y983": "ishares",
  "TICKER:IWDA": "ishares",
  "TICKER:SWDA": "ishares",
  "TICKER:CSPX": "ishares",
  "TICKER:EIMI": "ishares",
  "TICKER:IEMA": "ishares",
  "TICKER:IUIT": "ishares",
  "TICKER:CNDX": "ishares",
  "TICKER:IAEX": "ishares",
  "TICKER:IMEU": "ishares",
  "TICKER:IDVY": "ishares",
  "ISIN:IE00B1YZSC51": "ishares",

  "TICKER:VUSA": "vanguard",
  "TICKER:EQQQ": "invesco",
  "TICKER:VVSM": "vaneck",
  "TICKER:USDV": "spdr",
}

export function getEtfProvider(
  input: EtfProviderLookupInput
): EtfProvider | null {
  const isin = normalize(input.isin)
  if (isin) {
    const byIsin = ETF_PROVIDER_REGISTRY[`ISIN:${isin}`]
    if (byIsin) return byIsin
  }

  const ticker = normalize(input.ticker)
  if (ticker) {
    const byTicker = ETF_PROVIDER_REGISTRY[`TICKER:${ticker}`]
    if (byTicker) return byTicker
  }

  return null
}