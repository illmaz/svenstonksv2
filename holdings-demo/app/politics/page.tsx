// app/politics/page.tsx

const navHrefs: Record<string, string> = {
  today: "/dashboard",
  portfolio: "/holdings",
  transactions: "/transactions",
  "x-ray": "/exposure",
  diversification: "/diversification",
  events: "/events",
  news: "/news",
  politics: "/politics",
}

const NAV_LINKS = ["today", "portfolio", "transactions", "x-ray", "diversification", "events", "news", "politics"] as const

type MatchedTrade = {
  senator: string
  ticker: string
  assetDescription: string
  transactionType: "Purchase" | "Sale" | "Exchange"
  transactionDate: string
  amount: string
  reportUrl: string
  exposurePct: number
  owner: "Self" | "Spouse" | "Child"
}

const mockTrades: MatchedTrade[] = [
  {
    senator: "Nancy Pelosi",
    ticker: "NVDA",
    assetDescription: "NVIDIA Corporation",
    transactionType: "Purchase",
    transactionDate: "2026-01-15",
    amount: "$1,001 – $15,000",
    reportUrl: "#",
    exposurePct: 18,
    owner: "Self",
  },
  {
    senator: "Tommy Tuberville",
    ticker: "AAPL",
    assetDescription: "Apple Inc.",
    transactionType: "Sale",
    transactionDate: "2026-02-03",
    amount: "$15,001 – $50,000",
    reportUrl: "#",
    exposurePct: 12.5,
    owner: "Spouse",
  },
  {
    senator: "Nancy Pelosi",
    ticker: "MSFT",
    assetDescription: "Microsoft Corporation",
    transactionType: "Purchase",
    transactionDate: "2026-03-10",
    amount: "$50,001 – $100,000",
    reportUrl: "#",
    exposurePct: 0,
    owner: "Self",
  },
]

function parseDate(iso: string): { day: string; month: string } {
  const d = new Date(iso)
  return {
    day: String(d.getUTCDate()),
    month: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
  }
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
}

export default function PoliticsPage() {
  const tradeCount = mockTrades.length
  const uniqueSenators = new Set(mockTrades.map((t) => t.senator)).size

  const dates = mockTrades.map((t) => t.transactionDate).sort()
  const dateRange = dates.length > 0
    ? `${formatDateShort(dates[0])} – ${formatDateShort(dates[dates.length - 1])}`
    : "—"

  const stats = [
    { label: "Matched trades", value: String(tradeCount) },
    { label: "Unique senators", value: String(uniqueSenators) },
    { label: "Date range", value: dateRange },
  ]

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
              fontWeight: label === "politics" ? 500 : 400,
              color: label === "politics" ? "var(--color-surface)" : "var(--color-text-secondary)",
              backgroundColor: label === "politics" ? "var(--color-text-primary)" : "transparent",
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

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
            Political trades
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Congress members trading stocks in your portfolio
          </p>
        </div>

        {/* STAT STRIP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10, padding: "16px 20px",
            }}>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 6px" }}>{label}</p>
              <p style={{
                fontSize: label === "Date range" ? 13 : 22,
                fontWeight: label === "Date range" ? 400 : 500,
                fontFamily: label === "Date range" ? "var(--font-sans)" : "var(--font-mono)",
                color: "var(--color-text-primary)", margin: 0,
              }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* TRADE LIST / EMPTY STATE */}
        <section style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          {mockTrades.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
              No congressional trades found matching your portfolio in the last 90 days.
            </div>
          ) : mockTrades.map((trade, i) => {
            const { day, month } = parseDate(trade.transactionDate)
            const isPurchase = trade.transactionType === "Purchase"

            return (
              <div key={`${trade.senator}-${trade.ticker}-${trade.transactionDate}`} style={{
                display: "flex", alignItems: "flex-start", gap: 16,
                padding: "16px 20px",
                borderBottom: i < mockTrades.length - 1 ? "1px solid var(--color-border)" : undefined,
              }}>

                {/* DATE BLOCK */}
                <div style={{
                  flexShrink: 0, width: 44, textAlign: "center",
                  border: "1px solid var(--color-border)", borderRadius: 8,
                  padding: "6px 4px",
                }}>
                  <p style={{ fontSize: 20, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", margin: 0, lineHeight: 1.1 }}>
                    {day}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "2px 0 0", lineHeight: 1 }}>
                    {month}
                  </p>
                </div>

                {/* MIDDLE */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 2px" }}>
                    {trade.senator}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 6px" }}>
                    {trade.owner}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-accent)", margin: "0 0 2px" }}>
                    {trade.ticker}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: 0 }}>
                    {trade.assetDescription}
                  </p>
                </div>

                {/* RIGHT */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                    backgroundColor: isPurchase ? "var(--color-success-light)" : "var(--color-danger-light)",
                    color: isPurchase ? "var(--color-success)" : "var(--color-danger)",
                    marginBottom: 6,
                  }}>
                    {trade.transactionType}
                  </span>
                  <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
                    {trade.amount}
                  </p>
                  <a href={trade.reportUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--color-accent)", textDecoration: "none" }}>
                    View disclosure ↗
                  </a>
                  {trade.exposurePct > 0 && (
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "4px 0 0", fontStyle: "italic" }}>
                      You hold {trade.exposurePct}% via your ETFs
                    </p>
                  )}
                </div>

              </div>
            )
          })}
        </section>

      </div>
    </div>
  )
}
