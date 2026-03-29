import { prisma } from "@/lib/prisma"
import { requireApiKey } from "@/lib/requireApiKey"

export async function POST(req: Request) {
  const unauthorizedResponse = requireApiKey(req)
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const body = await req.json()

    const isin =
      typeof body.isin === "string" && body.isin.trim()
        ? body.isin.trim()
        : null

    const productName =
      typeof body.productName === "string" && body.productName.trim()
        ? body.productName.trim()
        : null

    const ticker =
      typeof body.ticker === "string" && body.ticker.trim()
        ? body.ticker.trim().toUpperCase()
        : null

    const region =
      typeof body.region === "string" && body.region.trim()
        ? body.region.trim()
        : null

    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim()
        : null

    if (!ticker || !region || !category) {
      return Response.json(
        { error: "Ticker, region, and category are required" },
        { status: 400 }
      )
    }

    const mapping = await prisma.assetMapping.create({
      data: {
        isin,
        productName,
        ticker,
        region,
        category,
      },
    })

    return Response.json(mapping, { status: 201 })
  } catch (error) {
    console.error("Create asset mapping error:", error)

    return Response.json(
      { error: "Failed to create asset mapping" },
      { status: 500 }
    )
  }
}