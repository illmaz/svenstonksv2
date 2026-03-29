type HoldingLike = {
  ticker?: string | null
  productName?: string | null
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function cleanProductName(productName: string) {
  const cleaned = productName
    .replace(/\bCOMMON STOCK\b/gi, "")
    .replace(/\bORDINARY SHARES\b/gi, "")
    .replace(/\bCLASS [A-Z]\b/gi, "")
    .replace(/\bHOLDINGS\b/gi, "")
    .replace(/\bINC\b\.?/gi, "")
    .replace(/\bPLC\b/gi, "")
    .replace(/\bADR\b/gi, "")
    .replace(/\bETF\b/gi, "")
    .replace(/\bNV\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  return toTitleCase(cleaned)
}

export function formatHoldingDisplayName(holding: HoldingLike) {
  const cleanedName = holding.productName
    ? cleanProductName(holding.productName)
    : ""

  if (holding.ticker && cleanedName) {
    return `${cleanedName} (${holding.ticker})`
  }

  if (holding.ticker) {
    return holding.ticker
  }

  if (cleanedName) {
    return cleanedName
  }

  return "Unknown"
}