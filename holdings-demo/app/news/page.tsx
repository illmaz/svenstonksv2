"use client"

import { useEffect, useState } from "react"

type NewsItem = {
  id: string
  title: string
  body: string
  tickers: string[]
  date: string
  relevance: number
  url?: string
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "< 1h ago"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NewsPage() {
  const [feed, setFeed] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/news/feed")
      .then((r) => r.json())
      .then((data) => {
        setFeed(data.feed ?? [])
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
              fontWeight: label === "news" ? 500 : 400,
              color: label === "news" ? "var(--color-surface)" : "var(--color-text-secondary)",
              backgroundColor: label === "news" ? "var(--color-text-primary)" : "transparent",
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
            News feed
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Headlines relevant to your portfolio
          </p>
        </div>

        {/* NEWS LIST */}
        <section style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
          ) : feed.length === 0 ? (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              color: "var(--color-text-muted)", fontSize: 13,
            }}>
              No relevant news found.
            </div>
          ) : feed.map((item, i) => (
            <div key={item.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "14px 20px",
              borderBottom: i < feed.length - 1 ? "1px solid var(--color-border)" : undefined,
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
                    <p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5, margin: "0 0 4px" }}>
                      {item.title}
                    </p>
                  </a>
                ) : (
                  <p style={{ fontSize: 14, fontWeight: 400, color: "var(--color-text-primary)", lineHeight: 1.5, margin: "0 0 4px" }}>
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
        </section>

      </div>
    </div>
  )
}
