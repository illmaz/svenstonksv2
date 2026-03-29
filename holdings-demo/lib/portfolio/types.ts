export type TransactionRow = {
  assetKey: string
  ticker: string | null
  isin: string | null
  productName: string | null
  exchange: string | null

  timestamp: Date
  quantity: number
  price: number

  source: "DEGIRO"
}

export type OpenPosition = {
  assetKey: string
  ticker: string | null
  isin: string | null
  productName: string | null
  exchange: string | null

  sharesOpen: number
  avgCost: number
  investedValue: number

  firstEverBuyAt: Date | null
  oldestOpenLotAt: Date | null
  lastActivityAt: Date | null
}

export type ClosedTrade = {
  assetKey: string
  ticker: string | null
  isin: string | null
  productName: string | null
  exchange: string | null

  sharesClosed: number
  costBasis: number
  proceeds: number
  realizedPnL: number

  entryAt: Date | null
  exitAt: Date | null
}

export type Lot = {
  assetKey: string
  ticker: string | null
  isin: string | null
  productName: string | null
  exchange: string | null

  quantityRemaining: number
  price: number
  openedAt: Date
}