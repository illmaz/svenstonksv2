"use client"

import { useEffect, useState } from "react"

type EarningsEvent = {
  name: string
  ticker: string
  isin: string
  earningsDate: string
  importance: number
}

const navHrefs: Record<string, string> = {
  today: "/dashboard",
  portfolio: "/holdings",
  transactions: "/transactions",
  "x-ray": "/exposure",
  diversification: "/diversification",
  events: "/events",
  news: "/news",
}

const NAV_LINKS = ["today", "portfolio", "transactions", "x-ray", "diversification", "events", "news"] as const

function parseDate(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr)
  return {
    day: String(d.getUTCDate()),
    month: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
  }
}

export default function EventsPage() {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/earnings/this-week")
      .then((r) => r.json())
      .then((data) => {
        setEarnings(data.earnings ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", fontFamily: "var(--font-sans)" }}>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 56,
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <a href="/dashboard" style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--color-text-primary)", textDecoration: "none" }}>
          intel<span style={{ color: "var(--color-accent)" }}>.</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV_LINKS.map((label) => (
            <a key={label} href={navHrefs[label]} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer",
              fontWeight: label === "events" ? 500 : 400,
              color: label === "events" ? "var(--color-surface)" : "var(--color-text-secondary)",
              backgroundColor: label === "events" ? "var(--color-text-primary)" : "transparent",
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

      {/* CONTENT */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
            Earnings this week
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Companies in your portfolio reporting soon
          </p>
        </div>

        {/* EVENTS LIST */}
        <section style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
          ) : earnings.length === 0 ? (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              color: "var(--color-text-muted)", fontSize: 13,
            }}>
              No earnings events this week.
            </div>
          ) : earnings.map((e, i) => {
            const { day, month } = parseDate(e.earningsDate)
            const barWidth = Math.min(100, e.importance * 100 * 8)
            const pct = (e.importance * 100).toFixed(1) + "%"

            return (
              <div key={`${e.ticker}-${e.earningsDate}`} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "16px 20px",
                borderBottom: i < earnings.length - 1 ? "1px solid var(--color-border)" : undefined,
              }}>

                {/* DATE BLOCK */}
                <div style={{
                  flexShrink: 0, width: 44, textAlign: "center",
                  border: "1px solid var(--color-border)", borderRadius: 8,
                  padding: "6px 4px",
                }}>
                  <p style={{
                    fontSize: 20, fontWeight: 500, fontFamily: "var(--font-mono)",
                    color: "var(--color-text-primary)", margin: 0, lineHeight: 1.1,
                  }}>
                    {day}
                  </p>
                  <p style={{
                    fontSize: 11, color: "var(--color-text-muted)",
                    margin: "2px 0 0", lineHeight: 1,
                  }}>
                    {month}
                  </p>
                </div>

                {/* COMPANY */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 3px" }}>
                    {e.name}
                  </p>
                  <p style={{
                    fontSize: 12, fontFamily: "var(--font-mono)",
                    color: "var(--color-text-muted)", margin: 0,
                  }}>
                    {e.ticker}
                  </p>
                </div>

                {/* IMPORTANCE BAR */}
                <div style={{ flexShrink: 0, minWidth: 120 }}>
                  <p style={{
                    fontSize: 11, color: "var(--color-text-muted)",
                    margin: "0 0 5px",
                  }}>
                    Portfolio weight
                  </p>
                  <div style={{ height: 4, borderRadius: 2, backgroundColor: "#f0efe9" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      backgroundColor: "#6366f1",
                      width: `${barWidth}%`,
                    }} />
                  </div>
                  <p style={{
                    fontSize: 11, fontFamily: "var(--font-mono)",
                    color: "var(--color-text-muted)", margin: "4px 0 0",
                  }}>
                    {pct}
                  </p>
                </div>

              </div>
            )
          })}
        </section>

      </div>
    </div>
  )
}
