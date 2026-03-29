"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type UnmappedAsset = {
  id: string
  isin?: string | null
  productName?: string | null
  exchange?: string | null
  source?: string | null
  createdAt: string
}

export default function InternalUnmappedAssetsPage() {
  const [assets, setAssets] = useState<UnmappedAsset[]>([])
  const [loading, setLoading] = useState(true)

  async function loadUnmappedAssets() {
    try {
      const res = await fetch("/api/unmapped-assets", { cache: "no-store" })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error ?? "Failed to load unmapped assets")
      }

      const data = await res.json()

      if (!Array.isArray(data)) {
        throw new Error("Invalid unmapped assets response")
      }

      setAssets(data)
    } catch (error) {
      console.error(error)
      alert("Failed to load unmapped assets")
    } finally {
      setLoading(false)
    }
  }

  async function createMapping(asset: UnmappedAsset) {
    const rawTicker = prompt("Ticker symbol (example: SPCE)")
    const rawRegion = prompt("Region (example: US)")
    const rawCategory = prompt("Category (example: Stock / ETF / Dividend ETF)")

    const ticker = rawTicker?.trim().toUpperCase() ?? ""
    const region = rawRegion?.trim() ?? ""
    const category = rawCategory?.trim() ?? ""

    if (!ticker || !region || !category) {
      alert("Ticker, region, and category are required")
      return
    }

    try {
      const res = await fetch("/api/asset-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isin: asset.isin ?? null,
          productName: asset.productName ?? null,
          ticker,
          region,
          category,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        alert(payload?.error ?? "Failed to create mapping")
        return
      }

      alert("Mapping created")
      await loadUnmappedAssets()
    } catch (error) {
      console.error(error)
      alert("Request failed")
    }
  }

  useEffect(() => {
    loadUnmappedAssets()
  }, [])

  return (
    <main style={{ padding: 40 }}>
      <h1>Internal: Unmapped Assets</h1>

      <div style={{ marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/">Home</Link>
        <Link href="/holdings">Holdings</Link>
        <Link href="/import-csv">Import CSV</Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : assets.length === 0 ? (
        <p>No unmapped assets found.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 20 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>
                Product Name
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>
                ISIN
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>
                Exchange
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>
                Source
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {asset.productName || "Unknown"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {asset.isin || "-"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {asset.exchange || "-"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  {asset.source || "-"}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  <button onClick={() => createMapping(asset)}>
                    Create Mapping
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}