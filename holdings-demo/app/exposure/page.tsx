"use client"

import { useEffect, useState } from "react"

type ExposureItem = {
  name: string
  ticker: string | null
  sector: string | null
  country: string | null
  exposurePctOfPortfolio: number
  exposureValue: number
}

type SectorItem = {
  sector: string
  exposurePctOfPortfolio: number
  exposureValue: number
}

type CountryItem = {
  country: string
  exposurePctOfPortfolio: number
  exposureValue: number
}

type LookthroughData = {
  allExposure: ExposureItem[]
  sectorExposure: SectorItem[]
  countryExposure: CountryItem[]
}

type PortfolioSummary = {
  open: {
    totalOpenInvestedValue: number
  }
}

const SECTOR_COLORS: Record<string, string> = {
  "Technology": "#6366f1",
  "Information Technology": "#6366f1",
  "Financials": "#f43f5e",
  "Financial Services": "#f43f5e",
  "Healthcare": "#0ea5e9",
  "Health Care": "#0ea5e9",
  "Consumer Discretionary": "#10b981",
  "Consumer": "#10b981",
  "Consumer Staples": "#10b981",
  "Industrials": "#f59e0b",
  "Energy": "#f97316",
  "Materials": "#84cc16",
  "Real Estate": "#a855f7",
  "Communication Services": "#6366f1",
  "Utilities": "#06b6d4",
}

function sectorColor(sector: string): string {
  return SECTOR_COLORS[sector] ?? "#94a3b8"
}

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`
}

function fmtEur(value: number): string {
  return `€${value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
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

export default function ExposurePage() {
  const [data, setData] = useState<LookthroughData | null>(null)
  const [totalInvested, setTotalInvested] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      const [lookthroughR, summaryR] = await Promise.allSettled([
        fetch("/api/exposure/lookthrough").then((r) => r.json()),
        fetch("/api/portfolio/summary").then((r) => r.json()),
      ])
      if (lookthroughR.status === "fulfilled") setData(lookthroughR.value)
      if (summaryR.status === "fulfilled") setTotalInvested(summaryR.value.open?.totalOpenInvestedValue ?? null)
      setLoading(false)
    }
    loadAll()
  }, [])

  const allExposure = data?.allExposure ?? []
  const sectorExposure = data?.sectorExposure ?? []
  const countryExposure = (data?.countryExposure ?? []).slice(0, 8)
  const top15 = allExposure.slice(0, 15)

  const maxCompanyPct = top15.length > 0 ? Math.max(...top15.map(r => r.exposurePctOfPortfolio)) : 1
  const maxSectorPct = sectorExposure.length > 0 ? Math.max(...sectorExposure.map(r => r.exposurePctOfPortfolio)) : 1
  const maxCountryPct = countryExposure.length > 0 ? Math.max(...countryExposure.map(r => r.exposurePctOfPortfolio)) : 1

  const topTechSector = sectorExposure.find(s => s.sector === "Technology" || s.sector === "Information Technology")

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
              fontWeight: label === "x-ray" ? 500 : 400,
              color: label === "x-ray" ? "var(--color-surface)" : "var(--color-text-secondary)",
              backgroundColor: label === "x-ray" ? "var(--color-text-primary)" : "transparent",
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
          <p style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
            Portfolio X-ray
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            What you actually own inside your ETFs
          </p>
        </div>

        {/* HERO STAT ROW */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Companies inside", value: loading ? "—" : String(allExposure.length) },
            { label: "Sectors", value: loading ? "—" : String(sectorExposure.length) },
            { label: "Countries", value: loading ? "—" : String(countryExposure.length) },
          ].map((stat) => (
            <div key={stat.label} style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10, padding: "16px 20px",
            }}>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 6px" }}>{stat.label}</p>
              <p style={{ fontSize: 24, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", margin: 0 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "60fr 40fr", gap: 16, alignItems: "start" }}>

          {/* LEFT — Top companies */}
          <section style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10, overflow: "hidden",
          }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                Top companies
              </p>
            </div>

            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
              ) : top15.map((item, i) => {
                const isConcentrated = item.exposurePctOfPortfolio > 5
                const barWidth = (item.exposurePctOfPortfolio / maxCompanyPct) * 100
                const euroAmt = totalInvested !== null ? (item.exposurePctOfPortfolio / 100) * totalInvested : null

                return (
                  <div key={`${item.ticker ?? item.name}-${i}`} style={{
                    display: "flex", alignItems: "center",
                    padding: "10px 20px",
                    borderBottom: i < top15.length - 1 ? "1px solid var(--color-border)" : undefined,
                  }}>
                    <span style={{
                      width: 44, flexShrink: 0,
                      fontSize: 12, fontFamily: "var(--font-mono)",
                      color: isConcentrated ? "var(--color-warning)" : "var(--color-text-primary)",
                    }}>
                      {item.ticker ?? "—"}
                    </span>

                    <span style={{
                      width: 120, flexShrink: 0, fontSize: 11,
                      color: "var(--color-text-muted)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.sector ?? "—"}
                    </span>

                    <div style={{ flex: 1, minWidth: 60, marginRight: 12, height: 4, borderRadius: 2, backgroundColor: "#f0efe9" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        backgroundColor: isConcentrated ? "var(--color-warning)" : sectorColor(item.sector ?? ""),
                        width: `${barWidth}%`,
                      }} />
                    </div>

                    <div style={{ textAlign: "right", minWidth: 80 }}>
                      <p style={{
                        fontSize: 12, fontFamily: "var(--font-mono)", margin: "0 0 1px",
                        color: isConcentrated ? "var(--color-warning)" : "var(--color-text-primary)",
                      }}>
                        {fmtPct(item.exposurePctOfPortfolio)}
                      </p>
                      {euroAmt !== null && (
                        <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: 0 }}>
                          {fmtEur(euroAmt)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Showing top 15 of {allExposure.length} companies ·{" "}
              </span>
              <a href="/api/exposure/lookthrough/export" style={{ fontSize: 12, color: "var(--color-accent)", textDecoration: "none" }}>
                Download full list ↓
              </a>
            </div>
          </section>

          {/* RIGHT — Sector + Country stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* SECTOR BREAKDOWN */}
            <section style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10, overflow: "hidden",
            }}>
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                  Sector breakdown
                </p>
                {topTechSector && topTechSector.exposurePctOfPortfolio > 30 && (
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    backgroundColor: "var(--color-warning-light)", color: "var(--color-warning)",
                  }}>
                    Tech overweight
                  </span>
                )}
              </div>

              <div style={{ maxHeight: 250, overflowY: "auto" }}>
                {loading ? (
                  <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
                ) : sectorExposure.map((item, i) => {
                  const barWidth = (item.exposurePctOfPortfolio / maxSectorPct) * 100
                  const euroAmt = totalInvested !== null ? (item.exposurePctOfPortfolio / 100) * totalInvested : null
                  const color = sectorColor(item.sector)

                  return (
                    <div key={item.sector} style={{
                      display: "flex", alignItems: "center",
                      padding: "10px 20px",
                      borderBottom: i < sectorExposure.length - 1 ? "1px solid var(--color-border)" : undefined,
                    }}>
                      <span style={{ width: 130, flexShrink: 0, fontSize: 13, color: "var(--color-text-primary)" }}>
                        {item.sector}
                      </span>
                      <div style={{ flex: 1, minWidth: 60, marginRight: 12, height: 4, borderRadius: 2, backgroundColor: "#f0efe9" }}>
                        <div style={{ height: "100%", borderRadius: 2, backgroundColor: color, width: `${barWidth}%` }} />
                      </div>
                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", margin: "0 0 1px" }}>
                          {fmtPct(item.exposurePctOfPortfolio)}
                        </p>
                        {euroAmt !== null && (
                          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: 0 }}>
                            {fmtEur(euroAmt)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* COUNTRY BREAKDOWN */}
            <section style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10, overflow: "hidden",
            }}>
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                  Country breakdown
                </p>
              </div>

              <div style={{ maxHeight: 250, overflowY: "auto" }}>
                {loading ? (
                  <div style={{ padding: "20px 24px", color: "var(--color-text-muted)", fontSize: 13 }}>Loading…</div>
                ) : countryExposure.map((item, i) => {
                  const barWidth = (item.exposurePctOfPortfolio / maxCountryPct) * 100
                  const euroAmt = totalInvested !== null ? (item.exposurePctOfPortfolio / 100) * totalInvested : null

                  return (
                    <div key={item.country} style={{
                      display: "flex", alignItems: "center",
                      padding: "10px 20px",
                      borderBottom: i < countryExposure.length - 1 ? "1px solid var(--color-border)" : undefined,
                    }}>
                      <span style={{ width: 130, flexShrink: 0, fontSize: 13, color: "var(--color-text-primary)" }}>
                        {item.country}
                      </span>
                      <div style={{ flex: 1, minWidth: 60, marginRight: 12, height: 4, borderRadius: 2, backgroundColor: "#f0efe9" }}>
                        <div style={{ height: "100%", borderRadius: 2, backgroundColor: "var(--color-accent)", width: `${barWidth}%` }} />
                      </div>
                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-primary)", margin: "0 0 1px" }}>
                          {fmtPct(item.exposurePctOfPortfolio)}
                        </p>
                        {euroAmt !== null && (
                          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", margin: 0 }}>
                            {fmtEur(euroAmt)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

          </div>

        </div>

      </div>
    </div>
  )
}
