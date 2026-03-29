import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/currentUser"

import YahooFinance from "yahoo-finance2"

type HoldingAsset = {
  ticker: string | null
  exchange: string | null
}

type AssetIdentity = {
  ticker: string
  exchange: string
}

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase()
}

const yahooFinance = new YahooFinance()

function normalizeExchange(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase()
  return normalized ? normalized : "UNKNOWN"
}

// Map DEGIRO exchange codes → Yahoo Finance ticker suffix.
// Yahoo Finance requires suffixes for non-US exchanges (e.g. IWDA.L, not IWDA).
const EXCHANGE_TO_YF_SUFFIX: Record<string, string> = {
  // Amsterdam / Euronext NL
  EAM: ".AS", XAMS: ".AS", AMS: ".AS",
  // Xetra / Frankfurt
  XETRA: ".DE", GER: ".DE", FRA: ".F",
  // Tradegate Exchange (German electronic exchange)
  TDG: ".DE",
  // London
  LSE: ".L", XLON: ".L", LON: ".L",
  // Paris
  XPAR: ".PA", PAR: ".PA", EPA: ".PA",
  // Milan
  XMIL: ".MI", MIL: ".MI",
  // Madrid
  XMAD: ".MC", MAD: ".MC",
  // Stockholm
  STO: ".ST", XSTO: ".ST",
  // Helsinki
  HEL: ".HE", XHEL: ".HE",
  // Brussels
  XBRU: ".BR", BRU: ".BR",
  // Lisbon
  XLIS: ".LS", LIS: ".LS",
  // Oslo
  OSL: ".OL", XOSL: ".OL",
  // Zurich
  EBS: ".SW", XSWX: ".SW",
  // Copenhagen
  CSE: ".CO", XCSE: ".CO",
}

function buildYahooSymbol(ticker: string, exchange: string): string {
  const suffix = EXCHANGE_TO_YF_SUFFIX[exchange.toUpperCase()]
  return suffix ? `${ticker}${suffix}` : ticker
}


export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const holdings: HoldingAsset[] = await prisma.holding.findMany({
      where: {
        userId: user.id,
        ticker: {
          not: null,
        },
      },
      select: {
        ticker: true,
        exchange: true,
      },
    })

    const uniqueAssets: AssetIdentity[] = Array.from(
      new Map(
        holdings
          .filter((h) => h.ticker)
          .map((holding) => {
            const ticker = normalizeTicker(holding.ticker as string)
            const exchange = normalizeExchange(holding.exchange)

            return [
              `${ticker}:${exchange}`,
              {
                ticker,
                exchange,
              },
            ] as const
          })
      ).values()
    )

    if (uniqueAssets.length === 0) {
      return Response.json(
        { error: "No tickers found in holdings" },
        { status: 400 }
      )
    }

    let refreshed = 0
    let failed = 0

    for (const asset of uniqueAssets) {
      try {
        // Build the primary Yahoo Finance symbol using the stored exchange code.
        // If the primary lookup fails, try common European ETF suffixes as fallbacks
        // (covers unmapped exchange codes like TDG = Tradegate, and null exchanges).
        const primarySymbol = buildYahooSymbol(asset.ticker, asset.exchange)
        const symbolsToTry = [primarySymbol]
        for (const suffix of [".L", ".AS", ".DE", ".F"]) {
          if (!primarySymbol.endsWith(suffix)) {
            symbolsToTry.push(`${asset.ticker}${suffix}`)
          }
        }

        let quote: Awaited<ReturnType<typeof yahooFinance.quote>> | undefined
        for (const symbol of symbolsToTry) {
          const result = await yahooFinance.quote(symbol).catch(() => undefined)
          if (result?.regularMarketPrice != null) {
            quote = result
            break
          }
        }

        if (!quote || quote.regularMarketPrice == null) {
          failed++
          continue
        }

        const price = quote.regularMarketPrice
        const currency = quote.currency ?? "USD"

        if (typeof price !== "number") {
          failed++
          continue
        }

        const now = new Date()

        await prisma.priceCache.upsert({
          where: {
            ticker_exchange: {
              ticker: asset.ticker,
              exchange: asset.exchange,
            },
          },
          update: {
            ticker: asset.ticker,
            exchange: asset.exchange,
            price,
            currency,
            priceAsOf: now,
            fetchedAt: now,
            provider: "yahoo-finance2",
          },
          create: {
            ticker: asset.ticker,
            exchange: asset.exchange,
            price,
            currency,
            priceAsOf: now,
            fetchedAt: now,
            provider: "yahoo-finance2",
          },
        })

        refreshed++
      } catch (err) {
        console.error("Price refresh failed for", asset.ticker, err)
        failed++
      }
    }

    return Response.json({
      totalAssets: uniqueAssets.length,
      refreshed,
      failed,
    })

  } catch (error) {
    console.error("Refresh prices error:", error)

    return Response.json(
      { error: "Failed to refresh prices" },
      { status: 500 }
    )
  }
}