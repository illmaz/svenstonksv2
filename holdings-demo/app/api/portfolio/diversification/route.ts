import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getCurrentUser } from "@/lib/auth/currentUser"
import { fetchSnapshots } from "@/lib/exposure/fetchSnapshots"
import { getDiversificationScore } from "@/lib/insights/diversificationScore"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const holdings = await prisma.holding.findMany({ where: { userId: user.id } })
    const portfolio = buildPortfolioFromHoldings(holdings)
    const openPositions = portfolio.openPositions
    const { snapshots } = await fetchSnapshots(openPositions)
    const result = await getDiversificationScore(openPositions, snapshots)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute diversification score" },
      { status: 500 }
    )
  }
}
