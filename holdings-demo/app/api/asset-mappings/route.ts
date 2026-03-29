import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
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

    const identityConditions = [
      ...(isin ? [{ isin }] : []),
      ...(productName ? [{ productName }] : []),
    ]

    let mapping

    if (identityConditions.length > 0) {
      const existingMapping = await prisma.assetMapping.findFirst({
        where: {
          OR: identityConditions,
        },
      })

      if (existingMapping) {
        mapping = await prisma.assetMapping.update({
          where: { id: existingMapping.id },
          data: {
            isin,
            productName,
            ticker,
            region,
            category,
          },
        })
      } else {
        mapping = await prisma.assetMapping.create({
          data: {
            isin,
            productName,
            ticker,
            region,
            category,
          },
        })
      }
    } else {
      mapping = await prisma.assetMapping.create({
        data: {
          isin,
          productName,
          ticker,
          region,
          category,
        },
      })
    }

    if (identityConditions.length > 0) {
      await prisma.unmappedAsset.deleteMany({
        where: {
          OR: identityConditions,
        },
      })
    }

    return Response.json(mapping, { status: 201 })
  } catch (error: unknown) {
    console.error("Create asset mapping error:", error)

    const isP2002 =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"

    if (isP2002) {
      return Response.json(
        { error: "An asset mapping with this unique field already exists" },
        { status: 409 }
      )
    }

    return Response.json(
      { error: "Failed to create asset mapping" },
      { status: 500 }
    )
  }
}
