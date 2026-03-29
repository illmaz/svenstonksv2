export type NewsItem = {
  id: string
  title: string
  body: string
  tickers: string[]
  date: string
  url?: string
}

export const newsItems: NewsItem[] = [
  {
    id: "news-1",
    title: "NVIDIA launches new AI chip",
    body: "NVIDIA announced a new AI chip aimed at hyperscale data centers.",
    tickers: ["NVDA"],
    date: "2026-03-24T08:00:00Z",
  },
  {
    id: "news-2",
    title: "Microsoft expands cloud AI offering",
    body: "Microsoft introduced new Azure AI infrastructure updates.",
    tickers: ["MSFT"],
    date: "2026-03-24T10:00:00Z",
  },
  {
    id: "news-3",
    title: "Amazon boosts data center spending",
    body: "Amazon signaled more investment in cloud and AI infrastructure.",
    tickers: ["AMZN"],
    date: "2026-03-23T09:00:00Z",
  },
  {
    id: "news-4",
    title: "Apple suppliers prepare for product refresh",
    body: "Supply chain checks suggest Apple is preparing new launches.",
    tickers: ["AAPL"],
    date: "2026-03-22T11:00:00Z",
  },
  {
    id: "news-5",
    title: "Alphabet adds new AI tools to search",
    body: "Alphabet announced more AI features across search products.",
    tickers: ["GOOGL"],
    date: "2026-03-21T12:00:00Z",
  },
  {
    id: "news-6",
    title: "Meta increases AI infrastructure capex",
    body: "Meta raised spending plans tied to AI model training.",
    tickers: ["META"],
    date: "2026-03-20T07:00:00Z",
  },
  {
    id: "news-7",
    title: "ASML sees strong chip equipment demand",
    body: "ASML reported sustained demand from advanced semiconductor fabs.",
    tickers: ["ASML"],
    date: "2026-03-24T06:30:00Z",
  },
  {
    id: "news-8",
    title: "TSMC expands leading-edge capacity",
    body: "TSMC announced progress on advanced node expansion.",
    tickers: ["TSM"],
    date: "2026-03-23T15:00:00Z",
  },
  {
    id: "news-9",
    title: "AI infrastructure rally lifts chip ecosystem",
    body: "NVIDIA, Microsoft, and Amazon were highlighted in a broader AI infrastructure rally.",
    tickers: ["NVDA", "MSFT", "AMZN"],
    date: "2026-03-24T13:00:00Z",
  },
  {
    id: "news-10",
    title: "Semiconductor supply chain strengthens",
    body: "ASML, TSMC, and NVIDIA remain central to semiconductor capacity growth.",
    tickers: ["ASML", "TSM", "NVDA"],
    date: "2026-03-22T16:00:00Z",
  },
]
