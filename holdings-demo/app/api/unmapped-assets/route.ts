import { prisma } from "@/lib/prisma"

export async function GET() {
  const mappings = await prisma.assetMapping.findMany({
    select: {
      isin: true,
      productName: true,
    },
  })

  const mappedIsins = mappings
    .map((m) => m.isin)
    .filter((value): value is string => Boolean(value))

  const mappedProductNames = mappings
    .map((m) => m.productName)
    .filter((value): value is string => Boolean(value))

  const mappedConditions = [
    ...(mappedIsins.length > 0 ? [{ isin: { in: mappedIsins } }] : []),
    ...(mappedProductNames.length > 0
      ? [{ productName: { in: mappedProductNames } }]
      : []),
  ]

  const unmappedAssets = await prisma.unmappedAsset.findMany({
    where:
      mappedConditions.length > 0
        ? {
            NOT: {
              OR: mappedConditions,
            },
          }
        : undefined,
    orderBy: {
      createdAt: "desc",
    },
  })

  return Response.json(unmappedAssets)
}