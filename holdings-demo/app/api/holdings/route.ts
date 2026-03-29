import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getAssetKey } from "@/lib/portfolio/keys"
import { getCurrentUser } from "@/lib/auth/currentUser"

type HoldingRecord = Awaited<ReturnType<typeof prisma.holding.findMany>>[number]
type AssetMappingRecord = Awaited<ReturnType<typeof prisma.assetMapping.findMany>>[number]
type PriceCacheRecord = Awaited<ReturnType<typeof prisma.priceCache.findMany>>[number]

type AssetMappingFilter =
  | { isin: { in: string[] } }
  | { productName: { in: string[] } }
  | { ticker: { in: string[] } }

type MappingEntry = [string, AssetMappingRecord]

function normalizeTrim(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeIsin(value: string | null | undefined): string | undefined {
  const normalized = normalizeTrim(value)
  return normalized ? normalized.toUpperCase() : undefined
}

function normalizeTicker(value: string | null | undefined): string | undefined {
  const normalized = normalizeTrim(value)
  return normalized ? normalized.toUpperCase() : undefined
}

function normalizeExchange(value: string | null | undefined): string {
  const normalized = normalizeTrim(value)
  return normalized ? normalized.toUpperCase() : "UNKNOWN"
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      orderBy: { executedAt: "asc" },
    })

    const holdingIdsByAssetKey = new Map<string, string[]>()
    for (const h of holdings) {
      const key = getAssetKey(h, h.id)
      const existing = holdingIdsByAssetKey.get(key)
      if (existing) existing.push(h.id)
      else holdingIdsByAssetKey.set(key, [h.id])
    }

    const portfolio = buildPortfolioFromHoldings(holdings)
    const openPositions = portfolio.openPositions

    const isins: string[] = Array.from(
      new Set(
        openPositions.flatMap((position) => {
          const trimmed = normalizeTrim(position.isin)
          const uppercased = normalizeIsin(position.isin)

          return [trimmed, uppercased].filter((value): value is string => Boolean(value))
        })
      )
    )

    const productNames: string[] = openPositions
      .map((position) => normalizeTrim(position.productName))
      .filter((productName): productName is string => Boolean(productName))

    const tickers: string[] = Array.from(
      new Set(
        openPositions.flatMap((position) => {
          const trimmed = normalizeTrim(position.ticker)
          const uppercased = normalizeTicker(position.ticker)

          return [trimmed, uppercased].filter((value): value is string => Boolean(value))
        })
      )
    )

    const mappingFilters: AssetMappingFilter[] = [
      ...(isins.length > 0 ? [{ isin: { in: isins } }] : []),
      ...(productNames.length > 0 ? [{ productName: { in: productNames } }] : []),
      ...(tickers.length > 0 ? [{ ticker: { in: tickers } }] : []),
    ]

    const mappings: AssetMappingRecord[] =
      mappingFilters.length > 0
        ? await prisma.assetMapping.findMany({
            where: {
              OR: mappingFilters,
            },
          })
        : []

    const priceCache: PriceCacheRecord[] = await prisma.priceCache.findMany({
      orderBy: {
        fetchedAt: "desc",
      },
    })

    const mappingByIsin = new Map(
      mappings
        .map((mapping: AssetMappingRecord) => {
          const key = normalizeIsin(mapping.isin)
          return key ? ([key, mapping] as MappingEntry) : null
        })
        .filter((entry): entry is MappingEntry => Boolean(entry))
    )

    const mappingByProductName = new Map(
      mappings
        .map((mapping: AssetMappingRecord) => {
          const key = normalizeTrim(mapping.productName)
          return key ? ([key, mapping] as MappingEntry) : null
        })
        .filter((entry): entry is MappingEntry => Boolean(entry))
    )

    const mappingByTicker = new Map(
      mappings
        .map((mapping: AssetMappingRecord) => {
          const key = normalizeTicker(mapping.ticker)
          return key ? ([key, mapping] as MappingEntry) : null
        })
        .filter((entry): entry is MappingEntry => Boolean(entry))
    )

    const priceMap = new Map<string, PriceCacheRecord>()

    for (const price of priceCache) {
      const ticker = normalizeTicker(price.ticker)
      const exchange = normalizeExchange(price.exchange)

      if (!ticker) continue

      const key = `${ticker}:${exchange}`

      if (!priceMap.has(key)) {
        priceMap.set(key, price)
      }
    }

    const enrichedHoldings = openPositions.map((position) => {
      const normalizedIsin = normalizeIsin(position.isin)
      const normalizedProductName = normalizeTrim(position.productName)
      const normalizedTicker = normalizeTicker(position.ticker)

      const mapping: AssetMappingRecord | undefined =
        (normalizedIsin ? mappingByIsin.get(normalizedIsin) : undefined) ||
        (normalizedProductName ? mappingByProductName.get(normalizedProductName) : undefined) ||
        (normalizedTicker ? mappingByTicker.get(normalizedTicker) : undefined)

      const normalizedExchange = normalizeExchange(position.exchange)
      const priceKey = normalizedTicker ? `${normalizedTicker}:${normalizedExchange}` : undefined
      const priceRow = priceKey ? priceMap.get(priceKey) : undefined

      const currentPrice = priceRow?.price ?? null
      const investedValue = position.investedValue
      const currentValue = currentPrice !== null ? position.sharesOpen * currentPrice : null
      const profitLoss = currentValue !== null ? currentValue - investedValue : null
      const profitLossPct =
        profitLoss !== null && investedValue > 0
          ? (profitLoss / investedValue) * 100
          : null

      const holdingIds = holdingIdsByAssetKey.get(position.assetKey) ?? []

      return {
        ...position,
        region: mapping?.region ?? "Other",
        category: mapping?.category ?? "Other",
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPct,
        holdingIds,
      }
    })

    return Response.json(enrichedHoldings)
  } catch (error) {
    console.error("Fetch holdings error:", error)
    return Response.json(
      { error: "Failed to load holdings" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    const ticker =
      typeof body.ticker === "string" && body.ticker.trim()
        ? body.ticker.trim().toUpperCase()
        : null

    const shares = Number(body.shares)
    const avgPrice = Number(body.avgPrice)

    if (!ticker || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(avgPrice) || avgPrice <= 0) {
      return Response.json(
        { error: "Ticker, shares, and avgPrice are required" },
        { status: 400 }
      )
    }

    const created = await prisma.holding.create({
      data: {
        ticker,
        shares,
        avgPrice,
        executedAt: new Date(),
        userId: user.id,
      },
    })

    return Response.json({ success: true, holding: created }, { status: 201 })
  } catch (error) {
    console.error("Create holding error:", error)

    return Response.json(
      { error: "Failed to create holding" },
      { status: 500 }
    )
  }
}