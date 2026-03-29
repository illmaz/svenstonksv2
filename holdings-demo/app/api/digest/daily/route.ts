import { NextRequest, NextResponse } from 'next/server';
import { buildPortfolioFromHoldings } from '@/lib/portfolio/buildPortfolioFromHoldings';
import { getCurrentUser } from '@/lib/auth/currentUser';
import { buildLookthroughExposure } from '@/lib/exposure/buildLookthroughExposure';
import { buildThemeExposure } from '@/lib/themes/buildThemeExposure';
import { companyThemes } from '@/lib/themes/companyThemes';
import { getRelevantNews } from '@/lib/news/getRelevantNews';
import { getEtfProvider } from '@/lib/exposure/providers/registry';
import { fetchSnapshots } from "@/lib/exposure/fetchSnapshots"
import { getRelevantEarnings } from "@/lib/earnings/getRelevantEarnings"
// import { getEarnings } from '@/lib/earnings/getEarnings'; // Uncomment if you have this
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 1. Get user holdings
  const holdings = await prisma.holding.findMany({ where: { userId: user.id } });


  // 2. Build portfolio
  const portfolio = buildPortfolioFromHoldings(holdings);
  const openPositions = portfolio.openPositions;

  // 3. Build ETF lookthrough exposure
  const { snapshots } = await fetchSnapshots(openPositions)
  const underlyingExposure = buildLookthroughExposure(openPositions, snapshots);

  // 4. Get theme exposure
  const themeExposure = buildThemeExposure(underlyingExposure, openPositions, companyThemes);
  const topExposure = themeExposure[0] as { theme: string; exposurePct: number } | undefined;

  // 4. Simple risk signal
  let topRisk = "Diversified portfolio";
  if (themeExposure.length > 0 && themeExposure[0].exposurePct > 30) {
    topRisk = `High concentration in ${themeExposure[0].theme}`;
  }

  // 5. Earnings
  const earnings = await getRelevantEarnings(openPositions, snapshots)

  // 6. News feed (reuse getRelevantNews)
  const newsFeed = await getRelevantNews(openPositions, underlyingExposure);
  const news = newsFeed.slice(0, 3).map(n => n.title);

  // 7. Debug output for underlyingExposure
  // NOTE: getEtfProvider and snapshotResults must be available in this scope for this to work.
  return NextResponse.json({
    earnings,
    news,
    debug: {
      openPositions: openPositions.map((p: any) => ({
        ticker: p.ticker,
        isin: p.isin,
        productName: p.productName ?? null
      })),
      providerChecks: openPositions.map((p: any) => ({
        ticker: p.ticker,
        isin: p.isin,
        provider: getEtfProvider({
          ticker: p.ticker,
          isin: p.isin
        })
      })),
      snapshotResults: [],
      underlyingExposureCount: underlyingExposure.length
    }
  });
}
