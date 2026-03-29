"use client"

import { useEffect, useState } from "react"

type DimensionResult = {
  score: number
  label: "good" | "watch" | "risk"
  insight: string
}

type DiversificationData = {
  overall: number
  dimensions: {
    companySpread: DimensionResult
    sectorBalance: DimensionResult
    countrySpread: DimensionResult
    etfOverlap: DimensionResult
    themeSpread: DimensionResult
  }
  actions: string[]
}

const DIMENSION_LABELS: Record<string, string> = {
  companySpread: "Company spread",
  sectorBalance: "Sector balance",
  countrySpread: "Country spread",
  etfOverlap: "ETF overlap",
  themeSpread: "Theme spread",
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)"
  if (score >= 40) return "var(--color-warning)"
  return "var(--color-danger)"
}

function labelStyle(label: "good" | "watch" | "risk"): { bg: string; color: string } {
  if (label === "good") return { bg: "var(--color-success-light)", color: "var(--color-success)" }
  if (label === "watch") return { bg: "var(--color-warning-light)", color: "var(--color-warning)" }
  return { bg: "var(--color-danger-light)", color: "var(--color-danger)" }
}

function borderColor(label: "good" | "watch" | "risk"): string {
  if (label === "good") return "var(--color-success)"
  if (label === "watch") return "var(--color-warning)"
  return "var(--color-danger)"
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

export default function DiversificationPage() {
  const [data, setData] = useState<DiversificationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/portfolio/diversification")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const overall = data?.overall ?? 0
  const dimensions = data?.dimensions
  const actions = data?.actions ?? []

  const dimensionEntries = dimensions
    ? (Object.entries(dimensions) as [string, DimensionResult][])
    : []

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
              fontWeight: label === "diversification" ? 500 : 400,
              color: label === "diversification" ? "var(--color-surface)" : "var(--color-text-secondary)",
              backgroundColor: label === "diversification" ? "var(--color-text-primary)" : "transparent",
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
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
            Diversification score
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            How well spread is your portfolio?
          </p>
        </div>

        {/* OVERALL SCORE HERO */}
        <section style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 10, padding: "32px 24px",
          marginBottom: 24, textAlign: "center",
        }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>Loading…</p>
          ) : (
            <>
              <p style={{
                fontSize: 64, fontWeight: 500, fontFamily: "var(--font-mono)",
                color: scoreColor(overall), margin: "0 0 4px", lineHeight: 1,
              }}>
                {overall}
              </p>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 20px" }}>
                out of 100
              </p>
              <div style={{
                maxWidth: 320, margin: "0 auto",
                height: 6, borderRadius: 3, backgroundColor: "var(--color-border)",
              }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  backgroundColor: scoreColor(overall),
                  width: `${overall}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </>
          )}
        </section>

        {/* DIMENSION CARDS */}
        {!loading && dimensionEntries.length > 0 && (
          <section style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 12, marginBottom: 24,
          }}>
            {dimensionEntries.map(([key, dim], i) => {
              const pill = labelStyle(dim.label)
              const isLastOdd = dimensionEntries.length % 2 !== 0 && i === dimensionEntries.length - 1
              return (
                <div key={key} style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderLeft: `3px solid ${borderColor(dim.label)}`,
                  borderRadius: 10, padding: "16px 20px",
                  gridColumn: isLastOdd ? "1 / -1" : undefined,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {DIMENSION_LABELS[key] ?? key}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 20,
                      backgroundColor: pill.bg, color: pill.color,
                    }}>
                      {dim.label}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 28, fontWeight: 500, fontFamily: "var(--font-mono)",
                    color: scoreColor(dim.score), margin: "0 0 6px", lineHeight: 1,
                  }}>
                    {dim.score}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                    {dim.insight}
                  </p>
                </div>
              )
            })}
          </section>
        )}

        {/* ACTIONS */}
        {!loading && actions.length > 0 && (
          <section style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10, overflow: "hidden",
          }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
                Recommended actions
              </p>
            </div>
            {actions.map((action, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 20px",
                borderBottom: i < actions.length - 1 ? "1px solid var(--color-border)" : undefined,
              }}>
                <span style={{ color: "var(--color-accent)", fontSize: 14, lineHeight: "20px", flexShrink: 0 }}>›</span>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{action}</span>
              </div>
            ))}
          </section>
        )}

      </div>
    </div>
  )
}
