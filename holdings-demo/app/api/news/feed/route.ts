import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getCurrentUser } from "@/lib/auth/currentUser"
import { fetchSnapshots } from "@/lib/exposure/fetchSnapshots"
import { buildLookthroughExposure } from "@/lib/exposure/buildLookthroughExposure"
import { getRelevantNews } from "@/lib/news/getRelevantNews"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      orderBy: { executedAt: "asc" },
    })

    const portfolio = buildPortfolioFromHoldings(holdings)
    const openPositions = portfolio.openPositions
    const { snapshots } = await fetchSnapshots(openPositions)
    const underlyingExposure = buildLookthroughExposure(openPositions, snapshots)
    const feed = await getRelevantNews(openPositions, underlyingExposure)

    return Response.json({ feed })
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch news feed" },
      { status: 500 }
    )
  }
}
