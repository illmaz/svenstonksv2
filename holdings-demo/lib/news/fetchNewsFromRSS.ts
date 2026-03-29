import Parser from "rss-parser"
import { NewsItem } from "@/lib/news/news"

const parser = new Parser()

const FEEDS = [
  "https://feeds.reuters.com/reuters/businessNews",
  "https://feeds.reuters.com/reuters/technologyNews",
  "https://www.cnbc.com/id/100003114/device/rss/rss.html",
]

const KEYWORD_TO_TICKER: Record<string, string> = {
  nvidia: "NVDA",
  apple: "AAPL",
  microsoft: "MSFT",
  amazon: "AMZN",
  alphabet: "GOOGL",
  google: "GOOGL",
  meta: "META",
  tesla: "TSLA",
  asml: "ASML",
  tsmc: "TSM",
  netflix: "NFLX",
  amd: "AMD",
  intel: "INTC",
  salesforce: "CRM",
  broadcom: "AVGO",
}

function extractTickers(text: string): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()
  for (const [keyword, ticker] of Object.entries(KEYWORD_TO_TICKER)) {
    if (lower.includes(keyword)) {
      found.add(ticker)
    }
  }
  return Array.from(found)
}

export async function fetchNewsFromRSS(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map((url) => parser.parseURL(url))
  )

  const items: NewsItem[] = []

  for (const result of results) {
    if (result.status !== "fulfilled") continue
    const feed = result.value
    for (const entry of feed.items ?? []) {
      const title = entry.title ?? ""
      const body = entry.contentSnippet ?? entry.content ?? entry.summary ?? ""
      const date = entry.pubDate ?? entry.isoDate ?? new Date().toISOString()
      const tickers = extractTickers(title + " " + body)
      if (tickers.length === 0) continue
      items.push({
        id: "rss-" + items.length,
        title,
        body,
        tickers,
        date,
        url: entry.link ?? undefined,
      })
    }
  }

  return items
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)
}
