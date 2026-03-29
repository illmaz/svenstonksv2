export type EarningsEvent = {
  name: string
  ticker: string | null
  isin: string | null
  earningsDate: string // YYYY-MM-DD
}

export const upcomingEarnings: EarningsEvent[] = [
  {
    name: "Apple Inc.",
    ticker: "AAPL",
    isin: "US0378331005",
    earningsDate: "2026-03-24", // today
  },
  {
    name: "Microsoft Corporation",
    ticker: "MSFT",
    isin: "US5949181045",
    earningsDate: "2026-03-25",
  },
  {
    name: "NVIDIA Corporation",
    ticker: "NVDA",
    isin: "US67066G1040",
    earningsDate: "2026-03-26",
  },
  {
    name: "Amazon.com, Inc.",
    ticker: "AMZN",
    isin: "US0231351067",
    earningsDate: "2026-03-27",
  },
  {
    name: "Alphabet Inc. (Google)",
    ticker: "GOOGL",
    isin: "US02079K3059",
    earningsDate: "2026-03-28",
  },
  {
    name: "Meta Platforms, Inc.",
    ticker: "META",
    isin: "US30303M1027",
    earningsDate: "2026-03-29",
  },
  {
    name: "Tesla, Inc.",
    ticker: "TSLA",
    isin: "US88160R1014",
    earningsDate: "2026-03-30",
  },
  {
    name: "Netflix, Inc.",
    ticker: "NFLX",
    isin: "US64110L1061",
    earningsDate: "2026-03-31",
  },
]
