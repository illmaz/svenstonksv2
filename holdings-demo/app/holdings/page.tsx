"use client"

import { useEffect, useState } from "react"

type Holding = {
  assetKey: string
  ticker: string | null
  isin: string | null
  productName: string | null
  category: string
  sharesOpen: number
  avgCost: number
  investedValue: number
  currentValue: number | null
  profitLoss: number | null
  profitLossPct: number | null
  holdingIds: string[]
}

type RawTransaction = {
  id: string
  ticker: string | null
  productName: string | null
  shares: number
  avgPrice: number
  executedAt: string | null
}

type PortfolioSummary = {
  open: {
    totalOpenInvestedValue: number
    totalOpenCurrentValue: number | null
    totalUnrealizedPnL: number | null
  }
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

function fmtPct(value: number | null): string {
  if (value === null) return "—"
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function fmtDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function holdingLabel(h: Holding): string {
  return h.productName || h.ticker || h.assetKey
}

function tickerAbbrev(h: Holding): string {
  const t = h.ticker || h.productName || "ETF"
  return t.substring(0, 3).toUpperCase()
}

function hasPricing(h: Holding): boolean {
  return h.currentValue !== null && h.currentValue > 0
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

export default function HoldingsPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [pricesRefreshing, setPricesRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [rawTransactions, setRawTransactions] = useState<RawTransaction[]>([])
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null)

  async function loadAll() {
    const [summaryR, holdingsR, rawR] = await Promise.allSettled([
      fetch("/api/portfolio/summary").then((r) => r.json()),
      fetch("/api/holdings").then((r) => r.json()),
      fetch("/api/holdings/raw").then((r) => r.json()),
    ])
    if (summaryR.status === "fulfilled") setSummary(summaryR.value)
    if (holdingsR.status === "fulfilled" && Array.isArray(holdingsR.value)) setHoldings(holdingsR.value)
    if (rawR.status === "fulfilled" && Array.isArray(rawR.value)) setRawTransactions(rawR.value)
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      // Load cached data immediately
      await loadAll()

      // Refresh prices in the background, then reload with live values
      setPricesRefreshing(true)
      try {
        await fetch("/api/prices/refresh")
        await loadAll()
      } catch {
        // silently fall back to cached values
      } finally {
        setPricesRefreshing(false)
      }
    }
    init()
  }, [])

  async function handleDeleteTx(id: string) {
    if (!confirm("Delete this transaction?")) return
    setDeletingTxId(id)
    try {
      const r = await fetch(`/api/holdings/${id}`, { method: "DELETE" })
      if (!r.ok) console.error("Delete transaction failed")
      else {
        setLoading(true)
        await loadAll()
      }
    } finally {
      setDeletingTxId(null)
    }
  }

  async function handleAddHolding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAdding(true)
    const form = new FormData(e.currentTarget)
    const ticker = (form.get("ticker") as string).trim().toUpperCase()
    const shares = Number(form.get("shares"))
    const avgPriceRaw = (form.get("avgPrice") as string).trim()
    const productNameRaw = (form.get("productName") as string).trim()

    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          shares,
          avgPrice: avgPriceRaw ? Number(avgPriceRaw) : 0,
          productName: productNameRaw || undefined,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        console.error("Add holding failed:", payload?.error)
      } else {
        setShowForm(false)
        setLoading(true)
        await loadAll()
      }
    } catch (err) {
      console.error("Add holding error:", err)
    } finally {
      setAdding(false)
    }
  }

  const totalInvested = summary?.open.totalOpenInvestedValue ?? null
  const totalCurrentValue = summary?.open.totalOpenCurrentValue ?? null
  const totalUnrealizedPnL = summary?.open.totalUnrealizedPnL ?? null

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
          {NAV_LINKS.map((label) => (
            <a key={label} href={navHrefs[label]} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer",
              fontWeight: label === "portfolio" ? 500 : 400,
              color: label === "portfolio" ? "var(--color-surface)" : "var(--color-text-secondary)",
              backgroundColor: label === "portfolio" ? "var(--color-text-primary)" : "transparent",
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
      </nav>

      {/* CONTENT */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* PAGE HEADER */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
              Your holdings
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
              What you own and what you paid
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              backgroundColor: "var(--color-text-primary)", color: "var(--color-surface)",
              border: "none", cursor: "pointer", flexShrink: 0,
            }}
          >
            {showForm ? "Cancel" : "Add holding"}
          </button>
        </div>

        {/* ADD HOLDING FORM */}
        {showForm && (
          <form onSubmit={handleAddHolding} style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10, padding: "20px 24px", marginBottom: 24,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
                  Ticker *
                </label>
                <input name="ticker" type="text" required placeholder="e.g. AAPL"
                  style={{
                    width: "100%", padding: "7px 10px", fontSize: 13,
                    border: "1px solid var(--color-border)", borderRadius: 6,
                    backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
                  Shares *
                </label>
                <input name="shares" type="number" required min="0.0001" step="any" placeholder="e.g. 10"
                  style={{
                    width: "100%", padding: "7px 10px", fontSize: 13,
                    border: "1px solid var(--color-border)", borderRadius: 6,
                    backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
                  Avg price
                </label>
                <input name="avgPrice" type="number" min="0" step="any" placeholder="e.g. 150.00"
                  style={{
                    width: "100%", padding: "7px 10px", fontSize: 13,
                    border: "1px solid var(--color-border)", borderRadius: 6,
                    backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
                  Product name
                </label>
                <input name="productName" type="text" placeholder="e.g. Apple Inc."
                  style={{
                    width: "100%", padding: "7px 10px", fontSize: 13,
                    border: "1px solid var(--color-border)", borderRadius: 6,
                    backgroundColor: "var(--color-bg)", color: "var(--color-text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={adding} style={{
                padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                backgroundColor: "var(--color-text-primary)", color: "var(--color-surface)",
                border: "none", cursor: adding ? "not-allowed" : "pointer", opacity: adding ? 0.6 : 1,
              }}>
                {adding ? "Adding…" : "Add holding"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                padding: "7px 18px", borderRadius: 8, fontSize: 13,
                backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)", cursor: "pointer",
              }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* SUMMARY STRIP */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {([
            {
              label: "Total invested",
              value: loading ? "—" : fmt(totalInvested),
              valueColor: "var(--color-text-primary)" as string,
            },
            {
              label: pricesRefreshing ? "Current value  ·  refreshing…" : "Current value",
              value: loading ? "—" : fmt(totalCurrentValue),
              valueColor: "var(--color-text-primary)" as string,
            },
            {
              label: pricesRefreshing ? "Unrealized P&L  ·  refreshing…" : "Unrealized P&L",
              value: loading ? "—" : fmt(totalUnrealizedPnL),
              valueColor: totalUnrealizedPnL === null
                ? "var(--color-text-primary)"
                : totalUnrealizedPnL >= 0
                ? "var(--color-success)"
                : "var(--color-danger)",
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
            </div>
          ))}
        </section>

        {/* HOLDINGS LIST */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {loading ? (
            <div style={{ padding: "20px 0", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
          ) : holdings.length === 0 ? (
            <div style={{ padding: "20px 0", color: "var(--color-text-muted)", fontSize: 13 }}>No holdings found.</div>
          ) : holdings.map((h) => (
            <div key={h.assetKey} style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10, overflow: "hidden",
            }}>
              {/* TOP SECTION */}
              <div style={{ display: "flex", alignItems: "center", padding: "14px 20px" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0, marginRight: 14,
                  backgroundColor: "#f0efe9", fontSize: 10, fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {tickerAbbrev(h)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)",
                    margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
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
                    {hasPricing(h) ? fmt(h.currentValue) : fmt(h.investedValue)}
                  </p>
                  {hasPricing(h) && h.profitLoss !== null && (
                    <p style={{
                      fontSize: 12, fontFamily: "var(--font-mono)", margin: 0,
                      color: h.profitLoss >= 0 ? "var(--color-success)" : "var(--color-danger)",
                    }}>
                      {h.profitLoss >= 0 ? "+" : ""}{fmt(h.profitLoss)}
                      {h.profitLossPct !== null && ` · ${fmtPct(h.profitLossPct)}`}
                    </p>
                  )}
                </div>

              </div>

              {/* BOTTOM SECTION */}
              <div style={{
                borderTop: "1px solid var(--color-border)",
                padding: "10px 20px",
                display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
              }}>
                {[
                  h.ticker ? `Ticker: ${h.ticker}` : null,
                  h.isin ? `ISIN: ${h.isin}` : null,
                  `Shares: ${h.sharesOpen}`,
                  `Avg cost: ${fmtDec(h.avgCost)}`,
                  `Invested: ${fmt(h.investedValue)}`,
                ]
                  .filter((item): item is string => item !== null)
                  .map((item) => (
                    <span key={item} style={{
                      fontSize: 11, fontFamily: "var(--font-mono)",
                      color: "var(--color-text-muted)",
                    }}>
                      {item}
                    </span>
                  ))}
                <button
                  onClick={() => setExpandedKey(expandedKey === h.assetKey ? null : h.assetKey)}
                  style={{
                    marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
                    fontSize: 11, color: "var(--color-text-muted)", padding: "2px 4px",
                  }}
                >
                  {expandedKey === h.assetKey ? "▴ hide" : `▾ ${h.holdingIds.length} transaction${h.holdingIds.length !== 1 ? "s" : ""}`}
                </button>
              </div>

              {/* TRANSACTIONS SECTION */}
              {expandedKey === h.assetKey && (
                <div style={{ borderTop: "1px solid var(--color-border)" }}>
                  {rawTransactions.filter((tx) => h.holdingIds.includes(tx.id)).map((tx) => (
                    <div key={tx.id} style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "9px 20px",
                      borderBottom: "1px solid var(--color-border)",
                    }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", minWidth: 100 }}>
                        {fmtDate(tx.executedAt)}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>
                        {tx.shares} shares
                      </span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>
                        @ {fmtDec(tx.avgPrice)}
                      </span>
                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        disabled={deletingTxId === tx.id}
                        style={{
                          marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
                          fontSize: 11, color: "var(--color-text-muted)", padding: "2px 6px",
                          opacity: deletingTxId === tx.id ? 0.4 : 0.6,
                        }}
                      >
                        {deletingTxId === tx.id ? "…" : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* IMPORT BUTTON */}
        <div>
          <a href="/import-csv" style={{
            display: "inline-block",
            padding: "8px 18px", borderRadius: 8, fontSize: 13,
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
            backgroundColor: "var(--color-surface)",
            textDecoration: "none", cursor: "pointer",
          }}>
            Import CSV
          </a>
        </div>

      </div>
    </div>
  )
}
