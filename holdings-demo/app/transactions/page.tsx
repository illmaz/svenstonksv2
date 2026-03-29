"use client"

import { useEffect, useState } from "react"

type Transaction = {
  id: string
  ticker: string | null
  productName: string | null
  shares: number
  avgPrice: number
  executedAt: string | null
  type: "buy" | "sell"
}

type ClosedTrade = {
  assetKey: string
  ticker: string | null
  productName: string | null
  realizedPnL: number
  realizedPnLPct: number | null
  entryAt: string | null
  exitAt: string | null
  holdingDays: number | null
}

type Summary = {
  totalTransactions: number
  totalClosed: number
  totalRealizedPnL: number
  winCount: number
  lossCount: number
  winRate: number | null
  averageHoldingDays: number | null
  avgWin: number | null
  avgLoss: number | null
  totalDeployed: number
}

type Personality = {
  statements: string[]
  avgWinHoldingDays: number | null
  avgLossHoldingDays: number | null
}

type LosersCostItem = {
  ticker: string | null
  productName: string | null
  dailyCost: number
  holdingDays: number
  realizedPnL: number
  exitAt: string | null
}

type LosersCost = {
  averageDailyCost: number
  worstOffender: LosersCostItem | null
  items: LosersCostItem[]
}

type BestMissedMove = {
  ticker: string | null
  productName: string | null
  exitPrice: number
  currentPrice: number
  realizedPnL: number
  missedUpside: number
  exitAt: string | null
  priceAsOf: string | null
}

type PostSaleItem = {
  ticker: string | null
  productName: string | null
  exitPrice: number
  currentPrice: number
  realizedPnL: number
  deltaSinceExit: number
  deltaSinceExitPct: number
  outcome: "continued_up" | "reversed_down" | "roughly_flat"
  exitAt: string | null
  priceAsOf: string | null
}

type ReviewData = {
  transactions: Transaction[]
  closedTrades: ClosedTrade[]
  summary: Summary
  personality: Personality | null
  losersCost: LosersCost | null
  bestMissedMove: BestMissedMove | null
  postSaleOutcomes: { items: PostSaleItem[]; excludedCount: number } | null
}

function fmt(value: number | null): string {
  if (value === null) return "—"
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  return `${sign}€${abs.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDec(value: number | null): string {
  if (value === null) return "—"
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  return `${sign}€${abs.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(value: number | null, showSign = true): string {
  if (value === null) return "—"
  const sign = showSign && value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function fmtDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtCurrency(value: number | null): string {
  if (value === null) return "—"
  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : value > 0 ? "+" : ""
  return `${sign}€${abs.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDays(days: number | null): string {
  if (days === null) return "—"
  if (days < 30) return `${days}d`
  const months = Math.round(days / 30)
  return `${months}mo`
}

function tradeLabel(t: { ticker: string | null; productName: string | null; assetKey: string }): string {
  return t.ticker || t.productName || t.assetKey
}

function assetLabel(t: { ticker: string | null; productName: string | null }): string {
  return t.ticker || t.productName || "Unknown"
}

function txLabel(t: { ticker: string | null; productName: string | null }): string {
  return t.ticker || t.productName || "Unknown"
}

const PILL_BASE: React.CSSProperties = {
  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
  cursor: "pointer", border: "1px solid var(--color-border)",
}

const NAV_LINKS = ["today", "portfolio", "transactions", "x-ray", "diversification", "events", "news"] as const

const navHrefs: Record<string, string> = {
  today: "/dashboard",
  portfolio: "/holdings",
  transactions: "/transactions",
  "x-ray": "/exposure",
  diversification: "/diversification",
  events: "/events",
  news: "/news",
}

export default function TransactionsPage() {
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pricesRefreshing, setPricesRefreshing] = useState(false)
  const [closedFilter, setClosedFilter] = useState<"all" | "win" | "loss">("all")
  const [closedSort, setClosedSort] = useState<"recent" | "highest" | "lowest">("recent")
  const [activityFilter, setActivityFilter] = useState<"all" | "buy" | "sell">("all")
  const [activitySort, setActivitySort] = useState<"recent" | "highest" | "lowest">("recent")

  useEffect(() => {
    async function loadData() {
      try {
        const initial = await fetch("/api/transactions/review").then((r) => r.json())
        setData(initial)
        setLoading(false)

        setPricesRefreshing(true)
        await fetch("/api/prices/refresh")
        const fresh = await fetch("/api/transactions/review").then((r) => r.json())
        setData(fresh)
      } catch {
      } finally {
        setPricesRefreshing(false)
      }
    }
    loadData()
  }, [])

  const s = data?.summary ?? null

  const bestTrade = data?.closedTrades.length
    ? data.closedTrades.reduce((b, t) => t.realizedPnL > b.realizedPnL ? t : b)
    : null
  const worstTrade = data?.closedTrades.length
    ? data.closedTrades.reduce((w, t) => t.realizedPnL < w.realizedPnL ? t : w)
    : null

  const summaryStats = [
    {
      label: "Completed trades",
      value: loading ? "—" : s ? String(s.totalClosed) : "—",
      color: "var(--color-text-primary)",
    },
    {
      label: "Win rate",
      value: loading ? "—" : fmtPct(s?.winRate ?? null, false),
      color: "var(--color-text-primary)",
    },
    {
      label: "Total realized result",
      value: loading ? "—" : fmt(s?.totalRealizedPnL ?? null),
      color: s == null ? "var(--color-text-primary)"
        : s.totalRealizedPnL >= 0 ? "var(--color-success)" : "var(--color-danger)",
    },
    {
      label: "Avg win (€)",
      value: loading ? "—" : fmtCurrency(s?.avgWin ?? null),
      color: s?.avgWin != null ? "var(--color-success)" : "var(--color-text-primary)",
    },
    {
      label: "Avg loss (€)",
      value: loading ? "—" : fmtCurrency(s?.avgLoss ?? null),
      color: s?.avgLoss != null ? "var(--color-danger)" : "var(--color-text-primary)",
    },
    {
      label: "Avg holding period",
      value: loading ? "—" : fmtDays(s?.averageHoldingDays ?? null),
      color: "var(--color-text-primary)",
    },
    {
      label: "Total deployed",
      value: loading ? "—" : s != null
        ? `€${s.totalDeployed.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : "—",
      color: "var(--color-text-primary)",
    },
  ]

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", fontFamily: "var(--font-sans)" }}>
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
          {NAV_LINKS.map((label) => (
            <a key={label} href={navHrefs[label]} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer",
              fontWeight: label === "transactions" ? 500 : 400,
              color: label === "transactions" ? "var(--color-surface)" : "var(--color-text-secondary)",
              backgroundColor: label === "transactions" ? "var(--color-text-primary)" : "transparent",
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
        </div>
        <form method="POST" action="/api/auth/logout" style={{ margin: 0 }}>
          <button type="submit" style={{
            fontSize: 12, color: "var(--color-text-secondary)",
            background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
          }}>
            sign out
          </button>
        </form>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
            Trade review
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            What you bought, sold, and what it led to
          </p>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 36 }}>
          {summaryStats.map((stat) => (
            <div key={stat.label} style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10, padding: "16px 20px",
            }}>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 6px" }}>{stat.label}</p>
              <p style={{
                fontSize: 20, fontWeight: 500, fontFamily: "var(--font-mono)",
                color: stat.color, margin: 0,
              }}>
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {!loading && (
          <section style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Your trading profile
            </p>
            {data?.personality && data.personality.statements.length > 0 ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.personality.statements.map((stmt, i) => (
                    <p key={i} style={{
                      fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)",
                      margin: 0, lineHeight: 1.3,
                    }}>
                      {stmt}
                    </p>
                  ))}
                </div>
                {data.personality.avgWinHoldingDays !== null && data.personality.avgLossHoldingDays !== null && (
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "14px 0 0", fontFamily: "var(--font-mono)" }}>
                    Winners held {fmtDays(data.personality.avgWinHoldingDays)} on avg · Losers held {fmtDays(data.personality.avgLossHoldingDays)} on avg
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
                {!data || data.summary.totalClosed === 0
                  ? "Complete your first trade to start building your trading profile."
                  : `You need at least 4 completed trades — you have ${data.summary.totalClosed} so far.`}
              </p>
            )}
          </section>
        )}

        {!loading && (
          <section style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 12px" }}>
              Cost of holding losers
            </p>
            {data?.losersCost ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10, padding: "16px 20px",
                }}>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 8px" }}>Average daily cost</p>
                  <p style={{
                    fontSize: 28, fontWeight: 500, fontFamily: "var(--font-mono)",
                    color: "var(--color-danger)", margin: "0 0 4px",
                  }}>
                    €{data.losersCost.averageDailyCost.toFixed(2)}<span style={{ fontSize: 14, fontWeight: 400 }}>/day</span>
                  </p>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: 0 }}>
                    across all losing trades
                  </p>
                </div>
                {data.losersCost.worstOffender && (
                  <div style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10, padding: "16px 20px",
                  }}>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 8px" }}>Worst offender</p>
                    <p style={{
                      fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)",
                      margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {assetLabel(data.losersCost.worstOffender)}
                    </p>
                    <p style={{
                      fontSize: 24, fontWeight: 500, fontFamily: "var(--font-mono)",
                      color: "var(--color-danger)", margin: "4px 0 4px",
                    }}>
                      €{data.losersCost.worstOffender.dailyCost.toFixed(2)}<span style={{ fontSize: 13, fontWeight: 400 }}>/day</span>
                    </p>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: 0 }}>
                      {fmtDays(data.losersCost.worstOffender.holdingDays)} · {fmt(data.losersCost.worstOffender.realizedPnL)} total
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
                {!data || data.summary.totalClosed === 0
                  ? "No completed trades yet."
                  : "All your completed trades have been profitable — no losing positions to analyse."}
              </p>
            )}
          </section>
        )}

        {!loading && (
          <section style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 12px" }}>
              Best move you didn't make
            </p>
            {!data?.bestMissedMove ? (
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
                {pricesRefreshing
                  ? "Checking current prices…"
                  : !data || data.summary.winCount === 0
                    ? "Appears once you've closed a profitable trade — shows you which one you should have held longer."
                    : "None of your profitable exits have gone higher since you sold. Good timing so far."}
              </p>
            ) : (
              <div style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 10, padding: "20px 24px",
              }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 2px" }}>
                  {assetLabel(data.bestMissedMove)}
                </p>
                <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: "0 0 20px" }}>
                  Sold {fmtDate(data.bestMissedMove.exitAt)}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 4px" }}>You made</p>
                    <p style={{ fontSize: 20, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-success)", margin: 0 }}>
                      +{fmt(data.bestMissedMove.realizedPnL)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 4px" }}>Left behind</p>
                    <p style={{ fontSize: 20, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-danger)", margin: 0 }}>
                      +{fmt(data.bestMissedMove.missedUpside)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 4px" }}>Exit → now</p>
                    <p style={{ fontSize: 14, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", margin: 0 }}>
                      {fmtDec(data.bestMissedMove.exitPrice)} → {fmtDec(data.bestMissedMove.currentPrice)}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "16px 0 0", fontFamily: "var(--font-mono)" }}>
                  {pricesRefreshing ? "Refreshing prices…" : data.bestMissedMove.priceAsOf ? `Price as of ${fmtDate(data.bestMissedMove.priceAsOf)}` : "Current market price"}
                </p>
              </div>
            )}
          </section>
        )}

        {!loading && (() => {
          if (!data?.postSaleOutcomes) {
            return (
              <section style={{ marginBottom: 36 }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 12px" }}>
                  What happened after you sold
                </p>
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
                  {pricesRefreshing
                    ? "Checking current prices…"
                    : !data || data.summary.totalClosed === 0
                      ? "No completed trades yet — this shows whether the stocks you sold kept rising or fell after you exited."
                      : "No price data available for your sold positions. Prices will load automatically."}
                </p>
              </section>
            )
          }

          const items = data.postSaleOutcomes.items
          const excludedCount = data.postSaleOutcomes.excludedCount ?? 0
          const soldTooEarlyCount = items.filter((t) => t.outcome === "continued_up").length
          const goodExitCount = items.filter((t) => t.outcome === "reversed_down").length
          const totalMissed = items.filter((t) => t.outcome === "continued_up").reduce((s, t) => s + t.deltaSinceExit, 0)
          const totalSaved = items.filter((t) => t.outcome === "reversed_down").reduce((s, t) => s + Math.abs(t.deltaSinceExit), 0)

          return (
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                  What happened after you sold
                </p>
                <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: 0 }}>
                  {pricesRefreshing
                    ? "Refreshing prices…"
                    : <>
                        {soldTooEarlyCount > 0 && <span style={{ color: "var(--color-danger)" }}>{soldTooEarlyCount} too early</span>}
                        {soldTooEarlyCount > 0 && goodExitCount > 0 && <span> · </span>}
                        {goodExitCount > 0 && <span style={{ color: "var(--color-success)" }}>{goodExitCount} good exits</span>}
                        {soldTooEarlyCount === 0 && goodExitCount === 0 && <span>current prices</span>}
                      </>
                  }
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8, padding: "12px 16px",
                }}>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 4px" }}>Left on the table</p>
                  <p style={{ fontSize: 18, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-danger)", margin: 0 }}>
                    {soldTooEarlyCount === 0 ? "—" : `+${fmt(totalMissed)}`}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                    {soldTooEarlyCount === 0 ? "No positions moved up after you sold" : `across ${soldTooEarlyCount} position${soldTooEarlyCount !== 1 ? "s" : ""} that kept rising`}
                  </p>
                </div>
                <div style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8, padding: "12px 16px",
                }}>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 4px" }}>Saved by selling</p>
                  <p style={{ fontSize: 18, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-success)", margin: 0 }}>
                    {goodExitCount === 0 ? "—" : `+${fmt(totalSaved)}`}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                    {goodExitCount === 0 ? "No positions dropped after you sold" : `across ${goodExitCount} position${goodExitCount !== 1 ? "s" : ""} that reversed down`}
                  </p>
                </div>
              </div>

              <div style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 10, overflow: "hidden",
                maxHeight: 400, overflowY: "auto",
              }}>
                {items.map((item, i, arr) => {
                  const isContinuedUp = item.outcome === "continued_up"
                  const isReversedDown = item.outcome === "reversed_down"
                  const deltaLabel = isContinuedUp
                    ? `missed ${fmt(item.deltaSinceExit)}`
                    : isReversedDown
                      ? `saved ${fmt(Math.abs(item.deltaSinceExit))}`
                      : "roughly flat"

                  return (
                    <div key={`${item.ticker}-${i}`} style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "12px 20px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)",
                          margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {assetLabel(item)}
                        </p>
                        <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: 0 }}>
                          Sold {fmtDate(item.exitAt)} · {fmtDec(item.exitPrice)} → {fmtDec(item.currentPrice)}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 500,
                          marginBottom: 4,
                          backgroundColor: isContinuedUp ? "#fce8e8" : isReversedDown ? "#e8f5e9" : "var(--color-border)",
                          color: isContinuedUp ? "var(--color-danger)" : isReversedDown ? "var(--color-success)" : "var(--color-text-muted)",
                        }}>
                          {isContinuedUp ? "sold too early" : isReversedDown ? "good exit" : "roughly flat"}
                        </span>
                        <p style={{
                          fontSize: 12, fontWeight: 500, fontFamily: "var(--font-mono)",
                          color: isContinuedUp ? "var(--color-danger)" : isReversedDown ? "var(--color-success)" : "var(--color-text-muted)",
                          margin: 0,
                        }}>
                          {deltaLabel}
                          <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4, color: "var(--color-text-muted)" }}>
                            ({fmtPct(item.deltaSinceExitPct)})
                          </span>
                        </p>
                        {item.priceAsOf && (
                          <p style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>
                            {fmtDate(item.priceAsOf)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13, textAlign: "center" }}>
                    No price data available for sold positions.
                  </div>
                )}
              </div>
              {excludedCount > 0 && (
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "10px 0 0", fontFamily: "var(--font-mono)" }}>
                  {excludedCount} position{excludedCount !== 1 ? "s" : ""} excluded — price move exceeded 10× and likely reflects a stock split or stale data.
                </p>
              )}
            </section>
          )
        })()}

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
                Completed trades
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["all", "win", "loss"] as const).map((f) => (
                    <button key={f} onClick={() => setClosedFilter(f)} style={{
                      ...PILL_BASE,
                      backgroundColor: closedFilter === f ? "var(--color-text-primary)" : "transparent",
                      color: closedFilter === f ? "var(--color-surface)" : "var(--color-text-muted)",
                    }}>
                      {f === "all" ? "All" : f === "win" ? "Win" : "Loss"}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["recent", "highest", "lowest"] as const).map((sv) => (
                    <button key={sv} onClick={() => setClosedSort(sv)} style={{
                      ...PILL_BASE,
                      backgroundColor: closedSort === sv ? "var(--color-text-primary)" : "transparent",
                      color: closedSort === sv ? "var(--color-surface)" : "var(--color-text-muted)",
                    }}>
                      {sv === "recent" ? "Recent" : sv === "highest" ? "Highest" : "Lowest"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {loading ? (
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</div>
            ) : !data?.closedTrades.length ? (
              <div style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 10, padding: "20px 24px",
              }}>
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>No completed trades yet.</p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  Sell a position to see your realized performance here.
                </p>
              </div>
            ) : (
              <div style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 10, maxHeight: 480, overflowY: "auto",
              }}>
                {data.closedTrades
                  .filter((t) =>
                    closedFilter === "all" ? true : closedFilter === "win" ? t.realizedPnL > 0 : t.realizedPnL < 0
                  )
                  .sort((a, b) =>
                    closedSort === "highest" ? b.realizedPnL - a.realizedPnL :
                    closedSort === "lowest" ? a.realizedPnL - b.realizedPnL :
                    (b.exitAt ?? "").localeCompare(a.exitAt ?? "")
                  )
                  .map((t, i, arr) => (
                    <div key={`${t.assetKey}-${i}`} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)",
                          margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {tradeLabel(t)}
                        </p>
                        <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: 0 }}>
                          {fmtDate(t.entryAt)} → {fmtDate(t.exitAt)}
                          {t.holdingDays !== null && ` · ${fmtDays(t.holdingDays)}`}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 500, fontFamily: "var(--font-mono)",
                          color: t.realizedPnL >= 0 ? "var(--color-success)" : "var(--color-danger)",
                          margin: "0 0 1px",
                        }}>
                          {t.realizedPnL >= 0 ? "+" : ""}{fmt(t.realizedPnL)}
                        </p>
                        {t.realizedPnLPct !== null && (
                          <p style={{
                            fontSize: 10, fontFamily: "var(--font-mono)",
                            color: t.realizedPnLPct >= 0 ? "var(--color-success)" : "var(--color-danger)",
                            margin: 0,
                          }}>
                            {fmtPct(t.realizedPnLPct)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
                All activity
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["all", "buy", "sell"] as const).map((f) => (
                    <button key={f} onClick={() => setActivityFilter(f)} style={{
                      ...PILL_BASE,
                      backgroundColor: activityFilter === f ? "var(--color-text-primary)" : "transparent",
                      color: activityFilter === f ? "var(--color-surface)" : "var(--color-text-muted)",
                    }}>
                      {f === "all" ? "All" : f === "buy" ? "Buy" : "Sell"}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["recent", "highest", "lowest"] as const).map((sv) => (
                    <button key={sv} onClick={() => setActivitySort(sv)} style={{
                      ...PILL_BASE,
                      backgroundColor: activitySort === sv ? "var(--color-text-primary)" : "transparent",
                      color: activitySort === sv ? "var(--color-surface)" : "var(--color-text-muted)",
                    }}>
                      {sv === "recent" ? "Recent" : sv === "highest" ? "Highest" : "Lowest"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {loading ? (
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</div>
            ) : !data?.transactions.length ? (
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No transactions yet.</div>
            ) : (
              <div style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 10, maxHeight: 480, overflowY: "auto",
              }}>
                {data.transactions
                  .filter((tx) => activityFilter === "all" ? true : tx.type === activityFilter)
                  .sort((a, b) => {
                    const valA = Math.abs(a.shares) * a.avgPrice
                    const valB = Math.abs(b.shares) * b.avgPrice
                    return activitySort === "highest" ? valB - valA :
                      activitySort === "lowest" ? valA - valB :
                        (b.executedAt ?? "").localeCompare(a.executedAt ?? "")
                  })
                  .map((tx, i, arr) => (
                    <div key={tx.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 16px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none",
                    }}>
                      <span style={{
                        fontSize: 10, fontFamily: "var(--font-mono)",
                        color: "var(--color-text-muted)", minWidth: 72, flexShrink: 0,
                      }}>
                        {fmtDate(tx.executedAt)}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 500, padding: "2px 6px", borderRadius: 20, flexShrink: 0,
                        backgroundColor: tx.type === "buy" ? "var(--color-accent-light)" : "#fce8e8",
                        color: tx.type === "buy" ? "var(--color-accent-text)" : "var(--color-danger)",
                      }}>
                        {tx.type === "buy" ? "BUY" : "SELL"}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)",
                        flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {txLabel(tx)}
                      </span>
                      <span style={{
                        fontSize: 10, fontFamily: "var(--font-mono)",
                        color: "var(--color-text-muted)", flexShrink: 0,
                      }}>
                        {fmtDec(tx.avgPrice)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}