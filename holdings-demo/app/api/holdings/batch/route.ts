import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth/currentUser"

type HoldingImportRow = {
  ticker: string | null
  productName: string
  isin: string | null
  exchange: string | null
  shares: number
  avgPrice: number
  executedAt: string | null
  orderId: string | null
}


export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    if (!Array.isArray(body?.holdings)) {
      return Response.json(
        { error: "Invalid batch payload" },
        { status: 400 }
      )
    }

    const mode = body.mode === "replace" ? "replace" : "append"
    const holdings = body.holdings as HoldingImportRow[]

    if (mode === "replace") {
      await prisma.holding.deleteMany({ where: { userId: user.id } })
    }

    type ResolvedRow = {
      ticker: string | null
      productName: string | null
      isin: string | null
      exchange: string | null
      shares: number
      avgPrice: number
      executedAt: Date | null
      orderId: string | null
    }

    const resolvedRows: ResolvedRow[] = []

    const allIsins = holdings
      .map((h) => (typeof h.isin === "string" ? h.isin.trim() : ""))
      .filter(Boolean)

    const allProductNames = holdings
      .map((h) =>
        typeof h.productName === "string" ? h.productName.trim() : ""
      )
      .filter(Boolean)

    const assetMappings = await prisma.assetMapping.findMany({
      where: {
        OR: [
          ...(allIsins.length > 0 ? [{ isin: { in: allIsins } }] : []),
          ...(allProductNames.length > 0
            ? [{ productName: { in: allProductNames } }]
            : []),
        ],
      },
    })

    const mappingByIsin = new Map<string, string>()
    const mappingByProductName = new Map<string, string>()

    for (const m of assetMappings) {
      if (m.isin && m.ticker) mappingByIsin.set(m.isin, m.ticker)
      if (m.productName && m.ticker) {
        mappingByProductName.set(m.productName, m.ticker)
      }
    }

    for (const holding of holdings) {
      const ticker =
        typeof holding.ticker === "string" && holding.ticker.trim()
          ? holding.ticker.trim().toUpperCase()
          : null

      const productName =
        typeof holding.productName === "string" && holding.productName.trim()
          ? holding.productName.trim()
          : null

      const isin =
        typeof holding.isin === "string" && holding.isin.trim()
          ? holding.isin.trim()
          : null

      const exchange =
        typeof holding.exchange === "string" && holding.exchange.trim()
          ? holding.exchange.trim()
          : null

      const shares = Number(holding.shares)
      const avgPrice = Number(holding.avgPrice)

      const executedAt =
        typeof holding.executedAt === "string" && holding.executedAt.trim()
          ? new Date(holding.executedAt)
          : null

      const orderId =
        typeof holding.orderId === "string" && holding.orderId.trim()
          ? holding.orderId.trim()
          : null

      let resolvedTicker = ticker

      if (!resolvedTicker && isin) {
        resolvedTicker = mappingByIsin.get(isin) ?? null
      }

      if (!resolvedTicker && productName) {
        resolvedTicker = mappingByProductName.get(productName) ?? null
      }

      if (!resolvedTicker && (isin || productName)) {
        const existingUnmapped = await prisma.unmappedAsset.findFirst({
          where: {
            OR: [
              ...(isin ? [{ isin }] : []),
              ...(productName ? [{ productName }] : []),
            ],
          },
        })

        if (!existingUnmapped) {
          await prisma.unmappedAsset.create({
            data: {
              isin,
              productName,
              exchange,
              source: "DEGIRO",
            },
          })
        }
      }

      const hasIdentity = Boolean(resolvedTicker || productName)

      if (!hasIdentity || !Number.isFinite(shares) || !Number.isFinite(avgPrice)) {
        continue
      }

      resolvedRows.push({
        ticker: resolvedTicker,
        productName,
        isin,
        exchange,
        shares,
        avgPrice,
        executedAt,
        orderId,
      })
    }

    const result = await prisma.holding.createMany({
      data: resolvedRows.map((row) => ({ ...row, userId: user.id })),
    })

    return Response.json({ count: result.count }, { status: 201 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Batch import error:", error)
    return Response.json(
      { error: `Batch import failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}