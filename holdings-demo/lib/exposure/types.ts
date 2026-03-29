export type EtfConstituent = {
  name: string
  ticker: string | null
  isin: string | null
  // Percentage on a 0-100 scale; e.g. 4.5 means 4.5% (not 0.045).
  weightPct: number
  sector: string | null
  country: string | null
}

export type EtfHoldingsSnapshot = {
  etfTicker: string | null
  etfIsin: string | null
  etfName: string | null
  asOfDate: string | null
  source?: string
  constituents: EtfConstituent[]
}

export type UnderlyingExposure = {
  name: string
  ticker: string | null
  isin: string | null
  sector: string | null
  country: string | null
  exposureValue: number
  exposurePctOfPortfolio: number
}

export type SectorExposure = {
  sector: string
  exposureValue: number
  exposurePctOfPortfolio: number
}

export type CountryExposure = {
  country: string
  exposureValue: number
  exposurePctOfPortfolio: number
}

export type OverlapExposure = {
  name: string
  ticker: string | null
  isin: string | null
  contributingEtfs: string[]
  contributingEtfCount: number
  exposureValue: number
  exposurePctOfPortfolio: number
}