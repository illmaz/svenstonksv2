import { fetchNewsFromRSS } from "@/lib/news/fetchNewsFromRSS"
import { NewsItem } from "@/lib/news/news"

export async function getRelevantNews(
  openPositions: Array<{ ticker: string | null }>,
  underlyingExposure: Array<{ ticker: string | null; exposurePctOfPortfolio: number }>
) {
  const newsItems = await fetchNewsFromRSS()

  // Build sets of tickers (uppercase, non-null, non-empty)
  const directTickers = new Set(
    openPositions
      .map(pos => pos.ticker?.toUpperCase())
      .filter((t): t is string => !!t && t.length > 0)
  )
  const underlyingTickers = new Set(
    underlyingExposure
      .map(ex => ex.ticker?.toUpperCase())
      .filter((t): t is string => !!t && t.length > 0)
  )

  // Filter and score news
  const matched = newsItems
    .map((item: NewsItem) => {
      const itemTickers = item.tickers
        .map((t: string) => t.toUpperCase())
        .filter((t: string) => !!t && t.length > 0)
      const directMatches = itemTickers.filter((t: string) => directTickers.has(t)).length
      const underlyingMatches = itemTickers.filter((t: string) => underlyingTickers.has(t)).length
      let relevance = 0
      if (directMatches > 0) {
        relevance = 2
      } else if (underlyingMatches > 0) {
        relevance = 1
      }
      if (relevance > 0) {
        return {
          id: item.id,
          title: item.title,
          body: item.body,
          tickers: item.tickers,
          date: item.date,
          url: item.url,
          relevance
        }
      }
      return null
    })
    .filter((x: {
      id: string
      title: string
      body: string
      tickers: string[]
      date: string
      relevance: number
    } | null): x is {
      id: string
      title: string
      body: string
      tickers: string[]
      date: string
      relevance: number
    } => x !== null)
    .sort((a: { relevance: number; date: string }, b: { relevance: number; date: string }) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  return matched
}
