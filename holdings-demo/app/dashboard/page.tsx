"use client"

import { useEffect, useState } from "react"

type Insight = {
  type: string
  message: string
  exposurePct?: number
}

type Holding = {
  assetKey: string
  ticker: string | null
  productName: string | null
  category: string
  investedValue: number
  currentValue: number | null
  profitLoss: number | null
}

type EarningsEvent = {
  name: string
  ticker: string | null
  earningsDate: string
  importance: number
}

type NewsItem = {
  id: string
  title: string
  tickers: string[]
  date: string
  relevance: number
  url?: string
}

type PortfolioSummary = {
  lifetime: {
    returnOnCapitalPct: number | null
  }
  open: {
    totalOpenInvestedValue: number
    totalOpenCurrentValue: number | null
    totalUnrealizedPnL: number | null
    openPositionsCount: number
  }
}

type ThemeEntry = {
  theme: string
  exposurePct: number
}

function fmt(value: number | null): string {
  if (value === null) return "—"
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  return `${sign}€${abs.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtPct(value: number | null): string {
  if (value === null) return "—"
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "< 1h ago"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function holdingLabel(h: Holding): string {
  return h.productName || h.ticker || h.assetKey
}

function tickerAbbrev(h: Holding): string {
  const t = h.ticker || h.productName || "ETF"
  return t.substring(0, 3).toUpperCase()
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [topTheme, setTopTheme] = useState<ThemeEntry | null>(null)
  const [companiesCount, setCompaniesCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      const results = await Promise.allSettled([
        fetch("/api/portfolio/summary").then((r) => r.json()),
        fetch("/api/insights/top").then((r) => r.json()),
        fetch("/api/holdings").then((r) => r.json()),
        fetch("/api/earnings/this-week").then((r) => r.json()),
        fetch("/api/news/feed").then((r) => r.json()),
        fetch("/api/exposure/themes").then((r) => r.json()),
        fetch("/api/exposure/lookthrough").then((r) => r.json()),
      ])

      const [summaryR, insightsR, holdingsR, earningsR, newsR, themesR, lookthroughR] = results

      if (summaryR.status === "fulfilled") setSummary(summaryR.value)
      if (insightsR.status === "fulfilled") setInsights(insightsR.value.insights ?? [])
      if (holdingsR.status === "fulfilled" && Array.isArray(holdingsR.value)) setHoldings(holdingsR.value)
      if (earningsR.status === "fulfilled") setEarnings(earningsR.value.earnings ?? [])
      if (newsR.status === "fulfilled") setNews(newsR.value.feed ?? [])
      if (themesR.status === "fulfilled") setTopTheme(themesR.value.themes?.[0] ?? null)
      if (lookthroughR.status === "fulfilled" && Array.isArray(lookthroughR.value.allExposure)) {
        setCompaniesCount(lookthroughR.value.allExposure.length)
      }

      setLoading(false)
    }
    loadAll()
  }, [])

  const portfolioValue =
    summary?.open.totalOpenCurrentValue ?? summary?.open.totalOpenInvestedValue ?? null
  const unrealizedPnL = summary?.open.totalUnrealizedPnL ?? null
  const unrealizedPct =
    unrealizedPnL !== null && summary && summary.open.totalOpenInvestedValue > 0
      ? (unrealizedPnL / summary.open.totalOpenInvestedValue) * 100
      : null
  const positionsCount = summary?.open.openPositionsCount ?? 0
  const totalReturn = summary?.lifetime.returnOnCapitalPct ?? null

  const topInsight = insights[0] ?? null
  const topHoldings = holdings.slice(0, 3)
  const topEarnings = earnings.slice(0, 3)
  const topNews = news.slice(0, 6)

  const navHrefs: Record<string, string> = {
    today: "/dashboard",
    portfolio: "/holdings",
    transactions: "/transactions",
    "x-ray": "/exposure",
    diversification: "/diversification",
    events: "/events",
    news: "/news",
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", fontFamily: "var(--font-sans)" }}>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 56,
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <span style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--color-text-primary)" }}>
          intel<span style={{ color: "var(--color-accent)" }}>.</span>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {(["today", "portfolio", "transactions", "x-ray", "diversification", "events", "news"] as const).map((label) => (
            <a key={label} href={navHrefs[label]} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer",
              fontWeight: label === "today" ? 500 : 400,
              color: label === "today" ? "var(--color-surface)" : "var(--color-text-secondary)",
              backgroundColor: label === "today" ? "var(--color-text-primary)" : "transparent",
              textDecoration: "none",
            }}>
              {label}
            </a>
          ))}
          <div style={{
            width: 32, height: 32, borderRadius: "50%", marginLeft: 8,
            backgroundColor: "var(--color-accent-light)", color: "var(--color-accent-text)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 500,
          }}>
            EF
          </div>
          <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
            <button type="submit" style={{
              marginLeft: 8, fontSize: 12, color: "var(--color-text-secondary)",
              background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
            }}>
              sign out
            </button>
          </form>
        </div>
      </nav>

      {/* CONTENT */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* HERO */}
        <section style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 8px" }}>
            Good morning, Efe
          </p>
          <p style={{
            fontSize: 38, fontWeight: 500, fontFamily: "var(--font-mono)",
            color: "var(--color-text-primary)", margin: "0 0 10px", lineHeight: 1.1,
          }}>
            {loading ? "—" : fmt(portfolioValue)}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {unrealizedPnL !== null && (
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 12,
                fontFamily: "var(--font-mono)",
                backgroundColor: unrealizedPnL >= 0 ? "var(--color-success-light)" : "var(--color-danger-light)",
                color: unrealizedPnL >= 0 ? "var(--color-success)" : "var(--color-danger)",
              }}>
                {unrealizedPnL >= 0 ? "+" : ""}{fmt(unrealizedPnL)} · {fmtPct(unrealizedPct)}
              </span>
            )}
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {positionsCount} position{positionsCount !== 1 ? "s" : ""}
              {companiesCount !== null ? ` · ${companiesCount.toLocaleString()} companies inside` : ""}
            </span>
          </div>
        </section>

        {/* INSIGHT CARD */}
        {topInsight && (
          <section style={{
            backgroundColor: "var(--color-text-primary)",
            borderRadius: 10, padding: "20px 24px", marginBottom: 24,
          }}>
            <p style={{
              fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 8px",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              Today&apos;s signal
            </p>
            <p style={{ fontSize: 15, color: "#f5f5f5", fontWeight: 400, margin: "0 0 12px", lineHeight: 1.5 }}>
              {topInsight.message}
            </p>
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11,
              backgroundColor: topInsight.type === "theme" ? "rgba(217,119,6,0.2)" : "rgba(99,102,241,0.2)",
              color: topInsight.type === "theme" ? "#fbbf24" : "#a5b4fc",
            }}>
              {topInsight.type === "theme" ? "concentration risk" : topInsight.type}
            </span>
          </section>
        )}

        {/* STAT STRIP */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          {([
            {
              label: "Total return",
              value: loading ? "—" : fmtPct(totalReturn),
              valueColor: totalReturn !== null
                ? totalReturn >= 0 ? "var(--color-success)" : "var(--color-danger)"
                : "var(--color-text-primary)",
              sub: null as string | null,
            },
            {
              label: "Top theme weight",
              value: loading ? "—" : topTheme ? `${topTheme.exposurePct.toFixed(1)}%` : "—",
              valueColor: "var(--color-text-primary)" as string,
              sub: topTheme?.theme ?? null,
            },
            {
              label: "Earnings this week",
              value: loading ? "—" : String(earnings.length),
              valueColor: "var(--color-text-primary)" as string,
              sub: null as string | null,
            },
            {
              label: "Crew rank",
              value: "#2 of 5",
              valueColor: "var(--color-text-primary)" as string,
              sub: null as string | null,
            },
          ] as const).map((stat) => (
            <div key={stat.label} style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10, padding: "16px 20px",
            }}>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 6px" }}>{stat.label}</p>
              <p style={{
                fontSize: 20, fontWeight: 500, fontFamily: "var(--font-mono)",
                color: stat.valueColor, margin: 0,
              }}>
                {stat.value}
              </p>
              {stat.sub && (
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "2px 0 0" }}>{stat.sub}</p>
              )}
            </div>
          ))}
        </section>

        {/* HOLDINGS PREVIEW */}
        <section style={{
          backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 10, marginBottom: 24, overflow: "hidden",
        }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)" }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Holdings</p>
          </div>

          {loading ? (
            <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
          ) : topHoldings.length === 0 ? (
            <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>No holdings found.</div>
          ) : topHoldings.map((h, i) => (
            <div key={h.assetKey} style={{
              display: "flex", alignItems: "center", padding: "14px 20px",
              borderBottom: i < topHoldings.length - 1 ? "1px solid var(--color-border)" : undefined,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0, marginRight: 12,
                backgroundColor: "#f0efe9", fontSize: 10, fontWeight: 500,
                color: "var(--color-text-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {tickerAbbrev(h)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 3px" }}>
                  {holdingLabel(h)}
                </p>
                <span style={{
                  fontSize: 11, padding: "1px 8px", borderRadius: 20,
                  backgroundColor: "var(--color-accent-light)", color: "var(--color-accent-text)",
                }}>
                  {h.category !== "Other" ? h.category : "ETF"}
                </span>
              </div>
              <div style={{ textAlign: "right", marginRight: 12 }}>
                <p style={{
                  fontSize: 14, fontWeight: 500, fontFamily: "var(--font-mono)",
                  color: "var(--color-text-primary)", margin: "0 0 2px",
                }}>
                  {(h.currentValue !== null && h.currentValue > 0) ? fmt(h.currentValue) : fmt(h.investedValue)}
                </p>
                {(h.profitLoss !== null && h.currentValue !== null && h.currentValue > 0) && (
                  <p style={{
                    fontSize: 12, fontFamily: "var(--font-mono)", margin: 0,
                    color: h.profitLoss >= 0 ? "var(--color-success)" : "var(--color-danger)",
                  }}>
                    {h.profitLoss >= 0 ? "+" : ""}{fmt(h.profitLoss)}
                  </p>
                )}
              </div>
              <span style={{ color: "var(--color-text-muted)", fontSize: 16 }}>›</span>
            </div>
          ))}

          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)" }}>
            <span style={{ fontSize: 13, color: "var(--color-accent)", cursor: "pointer" }}>
              View all holdings →
            </span>
          </div>
        </section>

        {/* EARNINGS THIS WEEK */}
        <section style={{
          backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 10, marginBottom: 24, overflow: "hidden",
        }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)" }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Earnings this week</p>
          </div>

          {loading ? (
            <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
          ) : topEarnings.length === 0 ? (
            <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>No earnings events this week.</div>
          ) : topEarnings.map((e, i) => (
            <div key={`${e.ticker ?? "x"}-${e.earningsDate}`} style={{
              display: "flex", alignItems: "center", padding: "14px 20px",
              borderBottom: i < topEarnings.length - 1 ? "1px solid var(--color-border)" : undefined,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginRight: 14,
                backgroundColor: "var(--color-accent)",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, color: "var(--color-text-primary)", fontWeight: 400, margin: 0 }}>
                  {e.name}
                  {e.ticker && (
                    <span style={{ marginLeft: 6, fontSize: 12, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                      {e.ticker}
                    </span>
                  )}
                </p>
              </div>
              <div style={{ textAlign: "right", minWidth: 80 }}>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>
                  {fmtDate(e.earningsDate)}
                </p>
                <div style={{ height: 3, borderRadius: 2, backgroundColor: "#f0efe9" }}>
                  <div style={{
                    height: "100%", borderRadius: 2, backgroundColor: "var(--color-accent)",
                    width: `${Math.min(100, Math.round(e.importance * 100))}%`,
                    minWidth: e.importance > 0 ? 4 : 0,
                  }} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* NEWS FEED */}
        <section style={{
          backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>News</p>
            <a href="/news" style={{ fontSize: 12, color: "var(--color-accent)", textDecoration: "none" }}>View all →</a>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
            ) : topNews.length === 0 ? (
              <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>No relevant news found.</div>
            ) : topNews.map((item, i) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "14px 20px",
                borderBottom: i < topNews.length - 1 ? "1px solid var(--color-border)" : undefined,
              }}>
                <span style={{
                  flexShrink: 0, marginTop: 1, padding: "2px 8px", borderRadius: 20, fontSize: 11,
                  backgroundColor: item.relevance === 2 ? "var(--color-accent-light)" : "var(--color-success-light)",
                  color: item.relevance === 2 ? "var(--color-accent-text)" : "var(--color-success)",
                }}>
                  {item.relevance === 2 ? "direct" : "ETF"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "var(--color-text-primary)", cursor: "pointer" }}
                      onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                      onMouseOut={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}>
                      <p style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.4, margin: "0 0 4px" }}>
                        {item.title}
                      </p>
                    </a>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.4, margin: "0 0 4px" }}>
                      {item.title}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>
                    {item.tickers.slice(0, 3).join(", ")} · {timeAgo(item.date)}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "3px 0 0", fontStyle: "italic" }}>
                    {item.tickers.length > 0
                      ? `Relevant because you hold ${item.tickers.slice(0, 2).join(" and ")} through your ETFs`
                      : "Relevant to your portfolio"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
