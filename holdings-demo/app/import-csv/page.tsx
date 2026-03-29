"use client"

import { useRef, useState } from "react"
import Papa from "papaparse"
import type { ParseResult } from "papaparse"
import { useRouter } from "next/navigation"

function parseDegiroDateTime(dateValue: string, timeValue: string): string | null {
  const date = dateValue?.trim()
  const time = timeValue?.trim()

  if (!date || !time) return null

  const [day, month, year] = date.split("-")
  if (!day || !month || !year) return null

  return new Date(`${year}-${month}-${day}T${time}:00`).toISOString()
}

function normalizeCsvString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

type CsvRow = Record<string, unknown>

type HoldingImportRow = {
  ticker: string | null
  productName: string
  isin: string | null
  exchange: string | null
  shares: number
  avgPrice: number
  executedAt: string | null
  orderId: string | null
}


const PRODUCT_HEADERS = ["product", "ticker", "symbol", "stock", "asset"]
const ISIN_HEADERS = ["isin"]
const EXCHANGE_HEADERS = ["beurs", "exchange", "market"]
const SHARES_HEADERS = ["aantal", "shares", "quantity", "qty", "units"]
const PRICE_HEADERS = [
  "koers",
  "price",
  "avgprice",
  "averageprice",
  "average price",
  "costbasis",
  "cost basis",
]

function getFirstStringValue(row: CsvRow, headers: string[]) {
  for (const header of headers) {
    const value = row[header]
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) {
        return trimmed
      }
    }
  }

  return ""
}

function parseCsvNumber(value: string) {
  const sanitized = value.replace(/[$€£\s]/g, "")

  if (!sanitized) {
    return Number.NaN
  }

  const normalized = sanitized.includes(",") && sanitized.includes(".")
    ? sanitized.replace(/,/g, "")
    : sanitized.replace(/,/g, ".")

  return Number(normalized)
}

export default function ImportCsvPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"append" | "replace">("append")
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!file) {
      alert("Please choose a CSV file first")
      return
    }

    setLoading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: async (results: ParseResult<CsvRow>) => {
        try {
          let skippedCount = 0

          const rowsToImport: HoldingImportRow[] = []

          for (const row of results.data) {
            const productName = getFirstStringValue(row, PRODUCT_HEADERS)
            const isin = getFirstStringValue(row, ISIN_HEADERS)
            const exchange = getFirstStringValue(row, EXCHANGE_HEADERS)
            const sharesValue = getFirstStringValue(row, SHARES_HEADERS)
            const priceValue = getFirstStringValue(row, PRICE_HEADERS)

            const shares = parseCsvNumber(sharesValue)
            const avgPrice = parseCsvNumber(priceValue)
              const executedAt = parseDegiroDateTime(
    normalizeCsvString(row["datum"]) ?? "",
    normalizeCsvString(row["tijd"]) ?? ""
  )

  const orderId = normalizeCsvString(row["order id"])

            if (
              !productName ||
              !Number.isFinite(shares) ||
              !Number.isFinite(avgPrice)
            ) {
              skippedCount += 1
              continue
            }

            rowsToImport.push({
              ticker: null,
              productName,
              isin: isin || null,
              exchange: exchange || null,
              shares,
              avgPrice,
              executedAt,
              orderId
            })
          }

          if (rowsToImport.length === 0) {
            alert(`No holdings were imported. Skipped ${skippedCount} row(s).`)
            return
          }

          if (mode === "replace") {
            const confirmed = confirm("This will delete your current holdings and replace them with this CSV. Continue?")
            if (!confirmed) {
              setLoading(false)
              return
            }
          }

          const res = await fetch("/api/holdings/batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              holdings: rowsToImport,
              mode,
            }),
          })

          if (!res.ok) {
            const payload = await res.json().catch(() => null)
            const errorMessage = payload?.error ?? "Batch import failed"
            alert(errorMessage)
            return
          }

          const payload = await res.json()
          const importedCount = payload.count ?? rowsToImport.length

          const suffix =
            skippedCount > 0
              ? ` Imported ${importedCount} row(s), skipped ${skippedCount}.`
              : ` Imported ${importedCount} row(s).`

          alert(`CSV import finished.${suffix}`)
          router.push("/holdings")
        } catch (error) {
          console.error(error)
          alert("Import failed")
        } finally {
          setLoading(false)
        }
      },
      error: (error: Error) => {
        console.error(error)
        alert("Failed to parse CSV")
        setLoading(false)
      },
    })
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
          {(["today", "portfolio", "transactions", "x-ray", "diversification", "events", "news"] as const).map((label) => (
            <a key={label} href={navHrefs[label]} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer",
              fontWeight: 400,
              color: "var(--color-text-secondary)",
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
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px 80px" }}>

        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
            Import CSV
          </p>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
            Upload a DEGIRO export file to import your holdings
          </p>
        </div>

        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 10, padding: "24px",
        }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
              Import mode
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["append", "replace"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", border: "1px solid var(--color-border)",
                    backgroundColor: mode === m ? "var(--color-text-primary)" : "var(--color-surface)",
                    color: mode === m ? "var(--color-surface)" : "var(--color-text-secondary)",
                  }}
                >
                  {m === "append" ? "Append" : "Replace"}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "6px 0 0" }}>
              {mode === "append"
                ? "Adds new rows to your existing holdings."
                : "Deletes all current holdings and replaces them with this file."}
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
              CSV file
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFile(e.target.files[0])
                }
              }}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)", cursor: "pointer", flexShrink: 0,
                }}
              >
                Select file
              </button>
              <span style={{ fontSize: 13, color: file ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                {file ? file.name : "No file selected"}
              </span>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            style={{
              padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              backgroundColor: !file || loading ? "var(--color-border)" : "var(--color-text-primary)",
              color: !file || loading ? "var(--color-text-muted)" : "var(--color-surface)",
              border: "none", cursor: !file || loading ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            {loading ? "Uploading…" : "Upload CSV"}
          </button>
        </div>

      </div>
    </div>
  )
}