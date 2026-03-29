import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildPortfolioFromHoldings } from "@/lib/portfolio/buildPortfolioFromHoldings"
import { getCurrentUser } from "@/lib/auth/currentUser"
import { fetchSnapshots } from "@/lib/exposure/fetchSnapshots"
import { buildLookthroughExposure } from "@/lib/exposure/buildLookthroughExposure"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const holdings = await prisma.holding.findMany({ where: { userId: user.id } })
    const portfolio = buildPortfolioFromHoldings(holdings)
    const openPositions = portfolio.openPositions
    const { snapshots } = await fetchSnapshots(openPositions)
    const exposure = buildLookthroughExposure(openPositions, snapshots)

    const rows = [
      "ticker,name,sector,country,exposurePct,exposureValue",
      ...exposure.map(r =>
        [
          r.ticker ?? "",
          `"${(r.name ?? "").replace(/"/g, '""')}"`,
          r.sector ?? "",
          r.country ?? "",
          r.exposurePctOfPortfolio.toFixed(4),
          r.exposureValue.toFixed(2),
        ].join(",")
      )
    ].join("\n")

    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=exposure.csv",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to export" }, { status: 500 })
  }
}
