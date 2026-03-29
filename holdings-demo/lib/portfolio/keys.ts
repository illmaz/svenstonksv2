function normalizeTrim(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeUpper(value: string | null | undefined): string | null {
  const trimmed = normalizeTrim(value)
  return trimmed ? trimmed.toUpperCase() : null
}

export function getAssetKey(
  row: {
    isin: string | null
    ticker: string | null
    productName: string | null
    exchange: string | null
  },
  fallbackId?: string
): string {
  const isin = normalizeUpper(row.isin)
  if (isin) return `isin:${isin}`

  const ticker = normalizeUpper(row.ticker)
  if (ticker) return `ticker:${ticker}`

  const productName = normalizeUpper(row.productName)
  const exchange = normalizeUpper(row.exchange)

  if (productName && exchange) {
    return `name:${productName}|${exchange}`
  }

  if (productName) {
    return `name:${productName}`
  }

  if (fallbackId) {
    return `fallback:${fallbackId}`
  }

  return "unknown:missing-identity"
}