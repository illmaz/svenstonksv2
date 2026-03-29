export type HoldingMetadata = {
  region: "EU" | "USA" | "Global" | "Other"
  category: "Stock" | "ETF" | "Dividend ETF" | "Other"
}

export const HOLDING_METADATA: Record<string, HoldingMetadata> = {
  ASML: { region: "EU", category: "Stock" },
  NVDA: { region: "USA", category: "Stock" },
  AAPL: { region: "USA", category: "Stock" },
  MSFT: { region: "USA", category: "Stock" },
  VWRL: { region: "Global", category: "ETF" },
  TDIV: { region: "USA", category: "Dividend ETF" }
}
