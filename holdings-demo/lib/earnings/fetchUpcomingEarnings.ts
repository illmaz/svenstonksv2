import YahooFinance from "yahoo-finance2"
import { EarningsEvent } from "@/lib/earnings/upcoming"

const yahooFinance = new YahooFinance()

export async function fetchUpcomingEarnings(tickers: string[]): Promise<EarningsEvent[]> {
  const capped = tickers.slice(0, 30)

  const today = new Date()
  const thirtyDaysAhead = new Date(today)
  thirtyDaysAhead.setDate(today.getDate() + 30)

  const results = await Promise.allSettled(
    capped.map(async (ticker): Promise<EarningsEvent | null> => {
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ["calendarEvents"],
      })

      const earningsDates = summary.calendarEvents?.earnings?.earningsDate
      if (!earningsDates || earningsDates.length === 0) return null

      const firstDate = earningsDates[0]
      today.setHours(0, 0, 0, 0)
      if (firstDate < today || firstDate > thirtyDaysAhead) return null

      return {
        name: ticker,
        ticker,
        isin: null,
        earningsDate: firstDate.toISOString().slice(0, 10),
      }
    })
  )

  const events: EarningsEvent[] = []
  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      events.push(result.value)
    }
  }
  return events
}
